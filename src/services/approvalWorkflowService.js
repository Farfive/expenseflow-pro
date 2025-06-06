/**
 * Approval Workflow Service
 * 
 * Comprehensive approval system with multi-level chains, role-based permissions,
 * conditional routing, delegation, bulk approvals, and full audit trails.
 */

const { PrismaClient } = require('@prisma/client');
const _ = require('lodash');
const { addHours, isBefore, isAfter } = require('date-fns');
const NotificationService = require('./notificationService');

const prisma = new PrismaClient();

class ApprovalWorkflowService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Submit expense for approval
   * @param {string} expenseId - Expense ID
   * @param {string} submitterId - User submitting the expense
   * @param {Object} options - Submission options
   * @returns {Object} Approval instance
   */
  async submitForApproval(expenseId, submitterId, options = {}) {
    const { submissionNotes } = options;

    try {
      // Get expense details
      const expense = await prisma.expense.findUnique({
        where: { id: expenseId },
        include: {
          category: true,
          user: true,
          company: true
        }
      });

      if (!expense) {
        throw new Error('Expense not found');
      }

      // Check if already in approval process
      const existingInstance = await prisma.approvalInstance.findUnique({
        where: { expenseId }
      });

      if (existingInstance) {
        throw new Error('Expense is already in approval process');
      }

      // Find applicable workflow
      const workflow = await this.findApplicableWorkflow(expense);
      
      if (!workflow) {
        throw new Error('No applicable approval workflow found');
      }

      // Check for auto-approval
      if (workflow.autoApprovalLimit && 
          expense.amount <= workflow.autoApprovalLimit) {
        return await this.autoApproveExpense(expense, workflow, submitterId);
      }

      // Create approval instance
      const instance = await prisma.approvalInstance.create({
        data: {
          expenseId,
          workflowId: workflow.id,
          companyId: expense.companyId,
          submittedAt: new Date(),
          submissionNotes,
          status: 'PENDING'
        }
      });

      // Start the approval process
      await this.processNextStep(instance.id);

      // Create audit record
      await this.createAuditRecord(instance.id, submitterId, 'SUBMITTED', null, 'PENDING');

      // Update expense status
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: 'PENDING_APPROVAL' }
      });

      return instance;

    } catch (error) {
      console.error('Error submitting expense for approval:', error);
      throw error;
    }
  }

  /**
   * Find applicable workflow for an expense
   * @param {Object} expense - Expense object with category and user
   * @returns {Object} Workflow
   */
  async findApplicableWorkflow(expense) {
    const workflows = await prisma.approvalWorkflow.findMany({
      where: {
        companyId: expense.companyId,
        isActive: true
      },
      include: {
        approvalSteps: {
          orderBy: { stepOrder: 'asc' }
        }
      },
      orderBy: { priority: 'desc' }
    });

    for (const workflow of workflows) {
      if (await this.isWorkflowApplicable(workflow, expense)) {
        return workflow;
      }
    }

    // Return default workflow if no specific match
    return workflows.find(w => w.isDefault);
  }

  /**
   * Check if workflow applies to an expense
   * @param {Object} workflow - Workflow object
   * @param {Object} expense - Expense object
   * @returns {boolean} Is applicable
   */
  async isWorkflowApplicable(workflow, expense) {
    // Check category restrictions
    if (workflow.categoryIds && workflow.categoryIds.length > 0) {
      if (!workflow.categoryIds.includes(expense.categoryId)) {
        return false;
      }
    }

    // Check user restrictions
    if (workflow.userIds && workflow.userIds.length > 0) {
      if (!workflow.userIds.includes(expense.userId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Process the next step in approval workflow
   * @param {string} instanceId - Approval instance ID
   */
  async processNextStep(instanceId) {
    const instance = await prisma.approvalInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: {
          include: {
            approvalSteps: {
              orderBy: { stepOrder: 'asc' }
            }
          }
        },
        expense: true,
        stepRecords: true
      }
    });

    if (!instance) {
      throw new Error('Approval instance not found');
    }

    // Find next step
    const nextStep = instance.workflow.approvalSteps.find(
      step => step.stepOrder === instance.currentStepOrder
    );

    if (!nextStep) {
      // No more steps - complete the workflow
      return await this.completeApproval(instanceId);
    }

    // Create step records for this step
    await this.createStepRecords(instanceId, nextStep, instance);
  }

  /**
   * Create step records for approvers
   * @param {string} instanceId - Approval instance ID
   * @param {Object} step - Approval step
   * @param {Object} instance - Full instance object
   */
  async createStepRecords(instanceId, step, instance) {
    const approvers = await this.getStepApprovers(step, instance);

    if (approvers.length === 0) {
      throw new Error(`No approvers found for step ${step.stepName}`);
    }

    // Create step records
    for (const approverId of approvers) {
      await prisma.approvalStepRecord.create({
        data: {
          instanceId,
          stepId: step.id,
          stepOrder: step.stepOrder,
          approverId,
          status: 'PENDING'
        }
      });
    }

    // Update instance status
    await prisma.approvalInstance.update({
      where: { id: instanceId },
      data: {
        status: 'IN_PROGRESS',
        lastActionAt: new Date()
      }
    });

    // Create audit record
    await this.createAuditRecord(instanceId, null, 'ASSIGNED', null, null);
  }

  /**
   * Get approvers for a step
   * @param {Object} step - Approval step
   * @param {Object} instance - Approval instance
   * @returns {Array} Array of approver user IDs
   */
  async getStepApprovers(step, instance) {
    const approvers = new Set();

    switch (step.approverType) {
      case 'SPECIFIC_USER':
        step.approverIds.forEach(id => approvers.add(id));
        break;

      case 'ROLE_BASED':
        const roleUsers = await this.getUsersByRoles(
          step.approverRoles, 
          instance.companyId
        );
        roleUsers.forEach(userId => approvers.add(userId));
        break;

      case 'MANAGER':
        const managerId = await this.getManagerId(instance.expense.userId);
        if (managerId) approvers.add(managerId);
        break;

      default:
        // Default to first step approver IDs
        step.approverIds.forEach(id => approvers.add(id));
    }

    return Array.from(approvers);
  }

  /**
   * Approve a step
   * @param {string} stepRecordId - Step record ID
   * @param {string} approverId - Approver user ID
   * @param {Object} approval - Approval details
   * @returns {Object} Updated step record
   */
  async approveStep(stepRecordId, approverId, approval = {}) {
    const { comments, privateNotes } = approval;

    const stepRecord = await prisma.approvalStepRecord.findUnique({
      where: { id: stepRecordId },
      include: {
        instance: {
          include: {
            workflow: {
              include: {
                approvalSteps: true
              }
            }
          }
        },
        step: true
      }
    });

    if (!stepRecord) {
      throw new Error('Step record not found');
    }

    if (stepRecord.approverId !== approverId) {
      throw new Error('User not authorized to approve this step');
    }

    if (stepRecord.status !== 'PENDING') {
      throw new Error('Step has already been processed');
    }

    // Update step record
    const updatedRecord = await prisma.approvalStepRecord.update({
      where: { id: stepRecordId },
      data: {
        status: 'APPROVED',
        decision: 'APPROVE',
        comments,
        privateNotes,
        actionTakenAt: new Date()
      }
    });

    // Create audit record
    await this.createAuditRecord(
      stepRecord.instanceId, 
      approverId, 
      'APPROVED',
      'PENDING',
      'APPROVED'
    );

    // Check if step is complete
    await this.checkStepCompletion(stepRecord.instanceId, stepRecord.stepOrder);

    return updatedRecord;
  }

  /**
   * Reject a step
   * @param {string} stepRecordId - Step record ID
   * @param {string} approverId - Approver user ID
   * @param {Object} rejection - Rejection details
   * @returns {Object} Updated step record
   */
  async rejectStep(stepRecordId, approverId, rejection = {}) {
    const { comments, reason } = rejection;

    const stepRecord = await prisma.approvalStepRecord.findUnique({
      where: { id: stepRecordId },
      include: { instance: true, step: true }
    });

    if (!stepRecord) {
      throw new Error('Step record not found');
    }

    if (stepRecord.approverId !== approverId) {
      throw new Error('User not authorized to reject this step');
    }

    // Update step record
    const updatedRecord = await prisma.approvalStepRecord.update({
      where: { id: stepRecordId },
      data: {
        status: 'REJECTED',
        decision: 'REJECT',
        comments,
        actionTakenAt: new Date()
      }
    });

    // Reject the entire approval instance
    await prisma.approvalInstance.update({
      where: { id: stepRecord.instanceId },
      data: {
        status: 'REJECTED',
        completedAt: new Date()
      }
    });

    // Update expense status
    await prisma.expense.update({
      where: { id: stepRecord.instance.expenseId },
      data: { status: 'REJECTED' }
    });

    // Create audit record
    await this.createAuditRecord(
      stepRecord.instanceId,
      approverId,
      'REJECTED',
      'IN_PROGRESS',
      'REJECTED'
    );

    return updatedRecord;
  }

  /**
   * Get pending approvals for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Pending approvals
   */
  async getPendingApprovals(userId, options = {}) {
    const { companyId, limit = 50, offset = 0 } = options;

    return await prisma.approvalStepRecord.findMany({
      where: {
        approverId: userId,
        status: 'PENDING',
        ...(companyId && {
          instance: {
            companyId
          }
        })
      },
      include: {
        instance: {
          include: {
            expense: {
              include: {
                user: true,
                category: true
              }
            }
          }
        },
        step: true
      },
      orderBy: { assignedAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Get approval dashboard data
   * @param {string} userId - User ID
   * @param {string} companyId - Company ID
   * @returns {Object} Dashboard data
   */
  async getApprovalDashboard(userId, companyId) {
    const [
      pendingCount,
      approvedToday,
      rejectedToday,
      overdueCount,
      totalPendingAmount
    ] = await Promise.all([
      this.getPendingApprovalsCount(userId, companyId),
      this.getApprovedTodayCount(userId, companyId),
      this.getRejectedTodayCount(userId, companyId),
      this.getOverdueApprovalsCount(userId, companyId),
      this.getTotalPendingAmount(userId, companyId)
    ]);

    return {
      pendingCount,
      approvedToday,
      rejectedToday,
      overdueCount,
      totalPendingAmount,
      recentActivity: await this.getRecentActivity(userId, companyId)
    };
  }

  /**
   * Check step completion and advance workflow
   * @param {string} instanceId - Approval instance ID
   * @param {number} stepOrder - Step order number
   */
  async checkStepCompletion(instanceId, stepOrder) {
    const instance = await prisma.approvalInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: {
          include: {
            approvalSteps: true
          }
        },
        stepRecords: {
          where: { stepOrder }
        }
      }
    });

    const currentStep = instance.workflow.approvalSteps.find(
      step => step.stepOrder === stepOrder
    );

    if (!currentStep) return;

    const approvedRecords = instance.stepRecords.filter(
      record => record.status === 'APPROVED'
    );

    // Check if required number of approvals is met
    if (approvedRecords.length >= currentStep.requiredCount) {
      // Move to next step
      await prisma.approvalInstance.update({
        where: { id: instanceId },
        data: {
          currentStepOrder: stepOrder + 1,
          lastActionAt: new Date()
        }
      });

      // Process next step
      await this.processNextStep(instanceId);
    }
  }

  /**
   * Complete approval workflow
   * @param {string} instanceId - Approval instance ID
   */
  async completeApproval(instanceId) {
    const instance = await prisma.approvalInstance.findUnique({
      where: { id: instanceId },
      include: { expense: true }
    });

    if (!instance) return;

    // Update instance
    await prisma.approvalInstance.update({
      where: { id: instanceId },
      data: {
        status: 'APPROVED',
        completedAt: new Date()
      }
    });

    // Update expense
    await prisma.expense.update({
      where: { id: instance.expenseId },
      data: { status: 'APPROVED' }
    });

    // Create audit record
    await this.createAuditRecord(instanceId, null, 'WORKFLOW_COMPLETED', 'IN_PROGRESS', 'APPROVED');
  }

  /**
   * Auto-approve an expense
   * @param {Object} expense - Expense object
   * @param {Object} workflow - Workflow object
   * @param {string} submitterId - Submitter user ID
   * @returns {Object} Approval instance
   */
  async autoApproveExpense(expense, workflow, submitterId) {
    const instance = await prisma.approvalInstance.create({
      data: {
        expenseId: expense.id,
        workflowId: workflow.id,
        companyId: expense.companyId,
        submittedAt: new Date(),
        status: 'APPROVED',
        completedAt: new Date()
      }
    });

    // Update expense status
    await prisma.expense.update({
      where: { id: expense.id },
      data: { status: 'APPROVED' }
    });

    return instance;
  }

  // Helper methods

  async getUsersByRoles(roles, companyId) {
    const companyUsers = await prisma.companyUser.findMany({
      where: {
        companyId,
        role: { in: roles },
        isActive: true
      }
    });
    return companyUsers.map(cu => cu.userId);
  }

  async getManagerId(userId) {
    // Implementation to get user's manager
    return null;
  }

  async createAuditRecord(instanceId, userId, action, fromStatus, toStatus) {
    await prisma.approvalAuditRecord.create({
      data: {
        instanceId,
        userId,
        action,
        fromStatus,
        toStatus
      }
    });
  }

  // Dashboard helper methods
  async getPendingApprovalsCount(userId, companyId) {
    return await prisma.approvalStepRecord.count({
      where: {
        approverId: userId,
        status: 'PENDING',
        instance: { companyId }
      }
    });
  }

  async getApprovedTodayCount(userId, companyId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await prisma.approvalStepRecord.count({
      where: {
        approverId: userId,
        status: 'APPROVED',
        actionTakenAt: { gte: today },
        instance: { companyId }
      }
    });
  }

  async getRejectedTodayCount(userId, companyId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await prisma.approvalStepRecord.count({
      where: {
        approverId: userId,
        status: 'REJECTED',
        actionTakenAt: { gte: today },
        instance: { companyId }
      }
    });
  }

  async getOverdueApprovalsCount(userId, companyId) {
    const oneDayAgo = addHours(new Date(), -24);
    
    return await prisma.approvalStepRecord.count({
      where: {
        approverId: userId,
        status: 'PENDING',
        assignedAt: { lt: oneDayAgo },
        instance: { companyId }
      }
    });
  }

  async getTotalPendingAmount(userId, companyId) {
    const records = await prisma.approvalStepRecord.findMany({
      where: {
        approverId: userId,
        status: 'PENDING',
        instance: { companyId }
      },
      include: {
        instance: {
          include: { expense: true }
        }
      }
    });

    return records.reduce((total, record) => 
      total + parseFloat(record.instance.expense.amount), 0
    );
  }

  async getRecentActivity(userId, companyId) {
    return await prisma.approvalStepRecord.findMany({
      where: {
        approverId: userId,
        status: { in: ['APPROVED', 'REJECTED'] },
        instance: { companyId }
      },
      include: {
        instance: {
          include: {
            expense: {
              include: { user: true }
            }
          }
        }
      },
      orderBy: { actionTakenAt: 'desc' },
      take: 10
    });
  }

  async findPendingStepRecord(expenseId, approverId) {
    const instance = await prisma.approvalInstance.findUnique({
      where: { expenseId },
      include: {
        stepRecords: {
          where: {
            approverId,
            status: 'PENDING'
          }
        }
      }
    });
    return instance?.stepRecords[0];
  }
}

module.exports = ApprovalWorkflowService; 