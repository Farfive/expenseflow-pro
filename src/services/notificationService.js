/**
 * Notification Service for Approval Workflows
 * 
 * Handles email notifications, reminders, escalations, and all
 * approval-related communications.
 */

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const _ = require('lodash');
const { format, addHours } = require('date-fns');

const prisma = new PrismaClient();

class NotificationService {
  constructor() {
    try {
      this.emailTransporter = this.initializeEmailTransporter();
      this.templates = this.loadEmailTemplates();
    } catch (error) {
      console.warn('Email service not available:', error.message);
      this.emailTransporter = null;
      this.templates = {};
    }
  }

  /**
   * Initialize email transporter
   */
  initializeEmailTransporter() {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Load email templates
   */
  loadEmailTemplates() {
    return {
      APPROVAL_REQUEST: {
        subject: 'Expense Approval Required - {{expenseDescription}}',
        template: 'approval-request'
      },
      APPROVAL_REMINDER: {
        subject: 'Reminder: Expense Approval Pending - {{expenseDescription}}',
        template: 'approval-reminder'
      },
      APPROVAL_OVERDUE: {
        subject: 'OVERDUE: Expense Approval Required - {{expenseDescription}}',
        template: 'approval-overdue'
      },
      APPROVED: {
        subject: 'Expense Approved - {{expenseDescription}}',
        template: 'expense-approved'
      },
      REJECTED: {
        subject: 'Expense Rejected - {{expenseDescription}}',
        template: 'expense-rejected'
      },
      ESCALATED: {
        subject: 'Expense Escalated for Approval - {{expenseDescription}}',
        template: 'expense-escalated'
      },
      DELEGATED: {
        subject: 'Expense Approval Delegated to You - {{expenseDescription}}',
        template: 'approval-delegated'
      },
      BULK_APPROVAL_COMPLETED: {
        subject: 'Bulk Approval Completed - {{approvedCount}} expenses processed',
        template: 'bulk-approval-completed'
      }
    };
  }

  /**
   * Send approval notification
   * @param {string} stepRecordId - Step record ID
   * @param {string} type - Notification type
   * @param {Object} options - Additional options
   */
  async sendApprovalNotification(stepRecordId, type, options = {}) {
    try {
      const stepRecord = await prisma.approvalStepRecord.findUnique({
        where: { id: stepRecordId },
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
          approver: true,
          step: true
        }
      });

      if (!stepRecord) {
        throw new Error('Step record not found');
      }

      // Create notification record
      const notification = await prisma.approvalNotification.create({
        data: {
          instanceId: stepRecord.instanceId,
          userId: stepRecord.approverId,
          type,
          title: await this.buildNotificationTitle(type, stepRecord),
          message: await this.buildNotificationMessage(type, stepRecord),
          metadata: {
            stepRecordId,
            expenseId: stepRecord.instance.expenseId,
            ...options
          }
        }
      });

      // Send email notification
      await this.sendEmailNotification(notification.id);

      return notification;

    } catch (error) {
      console.error('Error sending approval notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk email notifications
   * @param {Array} notifications - Array of notification objects
   */
  async sendBulkNotifications(notifications) {
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const notification of notifications) {
      try {
        await this.sendEmailNotification(notification.id);
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          notificationId: notification.id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Send email notification
   * @param {string} notificationId - Notification ID
   */
  async sendEmailNotification(notificationId) {
    const notification = await prisma.approvalNotification.findUnique({
      where: { id: notificationId },
      include: {
        user: true,
        instance: {
          include: {
            expense: {
              include: {
                user: true,
                category: true,
                company: true
              }
            }
          }
        }
      }
    });

    if (!notification || !notification.user.email) {
      throw new Error('Notification or user email not found');
    }

    const template = this.templates[notification.type];
    if (!template) {
      throw new Error(`Email template not found for type: ${notification.type}`);
    }

    // Build email content
    const emailContent = await this.buildEmailContent(notification, template);

    // Send email
    try {
      const info = await this.emailTransporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@expenseflow.com',
        to: notification.user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      // Update notification status
      await prisma.approvalNotification.update({
        where: { id: notificationId },
        data: {
          isSent: true,
          sentAt: new Date(),
          emailSent: true,
          emailSentAt: new Date()
        }
      });

      return info;

    } catch (error) {
      // Update retry count
      await prisma.approvalNotification.update({
        where: { id: notificationId },
        data: {
          retryCount: { increment: 1 },
          lastRetryAt: new Date()
        }
      });

      throw error;
    }
  }

  /**
   * Send reminder notifications
   * @param {Object} options - Reminder options
   */
  async sendReminderNotifications(options = {}) {
    const { hoursOverdue = 24, maxReminders = 3 } = options;

    // Find pending approvals that are overdue
    const overdueRecords = await prisma.approvalStepRecord.findMany({
      where: {
        status: 'PENDING',
        assignedAt: {
          lt: addHours(new Date(), -hoursOverdue)
        }
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
        approver: true
      }
    });

    const results = {
      sent: 0,
      skipped: 0,
      failed: 0
    };

    for (const record of overdueRecords) {
      try {
        // Check how many reminders already sent
        const reminderCount = await prisma.approvalNotification.count({
          where: {
            instanceId: record.instanceId,
            userId: record.approverId,
            type: 'APPROVAL_REMINDER'
          }
        });

        if (reminderCount >= maxReminders) {
          results.skipped++;
          continue;
        }

        await this.sendApprovalNotification(
          record.id, 
          'APPROVAL_REMINDER',
          { reminderNumber: reminderCount + 1 }
        );

        results.sent++;

      } catch (error) {
        console.error(`Failed to send reminder for record ${record.id}:`, error);
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Send escalation notifications
   * @param {string} instanceId - Approval instance ID
   * @param {string} escalatedBy - User who triggered escalation
   */
  async sendEscalationNotifications(instanceId, escalatedBy) {
    const instance = await prisma.approvalInstance.findUnique({
      where: { id: instanceId },
      include: {
        expense: {
          include: {
            user: true,
            category: true,
            company: true
          }
        },
        workflow: {
          include: {
            approvalSteps: {
              where: {
                stepOrder: { gt: instance.currentStepOrder }
              },
              orderBy: { stepOrder: 'asc' },
              take: 1
            }
          }
        }
      }
    });

    if (!instance || !instance.workflow.approvalSteps.length) {
      return;
    }

    const nextStep = instance.workflow.approvalSteps[0];
    
    // Get escalation approvers
    const approvers = await this.getStepApprovers(nextStep, instance);

    // Send escalation notifications
    const notifications = [];
    for (const approverId of approvers) {
      try {
        const notification = await prisma.approvalNotification.create({
          data: {
            instanceId,
            userId: approverId,
            type: 'ESCALATED',
            title: `Expense Escalated for Your Approval`,
            message: `An expense has been escalated to you for approval.`,
            metadata: {
              escalatedBy,
              originalStep: instance.currentStepOrder,
              newStep: nextStep.stepOrder
            }
          }
        });

        await this.sendEmailNotification(notification.id);
        notifications.push(notification);

      } catch (error) {
        console.error(`Failed to send escalation notification to ${approverId}:`, error);
      }
    }

    return notifications;
  }

  /**
   * Send approval completion notification
   * @param {string} instanceId - Approval instance ID
   */
  async sendApprovalCompletionNotification(instanceId) {
    const instance = await prisma.approvalInstance.findUnique({
      where: { id: instanceId },
      include: {
        expense: {
          include: {
            user: true,
            category: true
          }
        }
      }
    });

    if (!instance) return;

    // Send notification to expense submitter
    const notification = await prisma.approvalNotification.create({
      data: {
        instanceId,
        userId: instance.expense.userId,
        type: instance.status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        title: `Your expense has been ${instance.status.toLowerCase()}`,
        message: `Your expense "${instance.expense.description}" has been ${instance.status.toLowerCase()}.`,
        metadata: {
          finalStatus: instance.status,
          completedAt: instance.completedAt
        }
      }
    });

    await this.sendEmailNotification(notification.id);

    return notification;
  }

  /**
   * Send bulk approval completion notification
   * @param {string} batchId - Bulk approval batch ID
   */
  async sendBulkApprovalCompletionNotification(batchId) {
    const batch = await prisma.bulkApprovalBatch.findUnique({
      where: { id: batchId },
      include: { approver: true }
    });

    if (!batch) return;

    const notification = await prisma.approvalNotification.create({
      data: {
        instanceId: batchId, // Using batchId as instanceId for bulk notifications
        userId: batch.approverId,
        type: 'BULK_APPROVAL_COMPLETED',
        title: `Bulk Approval Completed`,
        message: `Your bulk approval batch has been completed. ${batch.approvedCount} expenses approved, ${batch.rejectedCount} rejected.`,
        metadata: {
          batchId,
          totalCount: batch.totalCount,
          approvedCount: batch.approvedCount,
          rejectedCount: batch.rejectedCount
        }
      }
    });

    await this.sendEmailNotification(notification.id);

    return notification;
  }

  /**
   * Build email content from template
   * @param {Object} notification - Notification object
   * @param {Object} template - Email template
   * @returns {Object} Email content
   */
  async buildEmailContent(notification, template) {
    const expense = notification.instance.expense;
    const user = notification.user;
    
    // Template variables
    const variables = {
      userName: user.firstName || user.email,
      expenseDescription: expense.description,
      expenseAmount: this.formatCurrency(expense.amount, expense.currency),
      expenseDate: format(new Date(expense.transactionDate), 'PPP'),
      submitterName: expense.user.firstName || expense.user.email,
      categoryName: expense.category?.name || 'Uncategorized',
      companyName: expense.company?.name || 'Your Company',
      approvalUrl: this.buildApprovalUrl(notification.instanceId),
      dashboardUrl: this.buildDashboardUrl()
    };

    // Replace template variables
    const subject = this.replaceTemplateVariables(template.subject, variables);
    
    // Build HTML content
    const html = await this.buildHTMLContent(template.template, variables, notification);
    
    // Build text content
    const text = this.buildTextContent(variables, notification);

    return { subject, html, text };
  }

  /**
   * Build HTML email content
   * @param {string} templateName - Template name
   * @param {Object} variables - Template variables
   * @param {Object} notification - Notification object
   * @returns {string} HTML content
   */
  async buildHTMLContent(templateName, variables, notification) {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${variables.companyName} - ExpenseFlow</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 10px 0;
          }
          .expense-details { 
            background: white; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 15px 0;
            border-left: 4px solid #007bff;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ExpenseFlow Pro</h1>
            <h2>${variables.companyName}</h2>
          </div>
          <div class="content">
            {{CONTENT}}
          </div>
        </div>
      </body>
      </html>
    `;

    let content = '';

    switch (templateName) {
      case 'approval-request':
        content = `
          <h3>Expense Approval Required</h3>
          <p>Hello ${variables.userName},</p>
          <p>You have a new expense waiting for your approval.</p>
          
          <div class="expense-details">
            <h4>Expense Details</h4>
            <p><strong>Description:</strong> ${variables.expenseDescription}</p>
            <p><strong>Amount:</strong> ${variables.expenseAmount}</p>
            <p><strong>Date:</strong> ${variables.expenseDate}</p>
            <p><strong>Category:</strong> ${variables.categoryName}</p>
            <p><strong>Submitted by:</strong> ${variables.submitterName}</p>
          </div>
          
          <p>
            <a href="${variables.approvalUrl}" class="button">Review & Approve</a>
          </p>
        `;
        break;

      case 'expense-approved':
        content = `
          <h3>Your Expense Has Been Approved</h3>
          <p>Hello ${variables.userName},</p>
          <p>Good news! Your expense has been approved.</p>
          
          <div class="expense-details">
            <h4>Approved Expense</h4>
            <p><strong>Description:</strong> ${variables.expenseDescription}</p>
            <p><strong>Amount:</strong> ${variables.expenseAmount}</p>
          </div>
        `;
        break;

      default:
        content = `
          <p>Hello ${variables.userName},</p>
          <p>${notification.message}</p>
        `;
    }

    return baseTemplate.replace('{{CONTENT}}', content);
  }

  buildTextContent(variables, notification) {
    return `
ExpenseFlow Pro - ${variables.companyName}
${notification.title}
${notification.message}
    `.trim();
  }

  async buildNotificationTitle(type, stepRecord) {
    const titles = {
      APPROVAL_REQUEST: 'New Expense Approval Required',
      APPROVED: 'Expense Approved',
      REJECTED: 'Expense Rejected'
    };
    return titles[type] || 'Expense Notification';
  }

  async buildNotificationMessage(type, stepRecord) {
    const expense = stepRecord.instance.expense;
    const amount = this.formatCurrency(expense.amount, expense.currency);
    
    const messages = {
      APPROVAL_REQUEST: `Please review and approve the expense "${expense.description}" for ${amount}.`,
      APPROVED: `Your expense "${expense.description}" for ${amount} has been approved.`,
      REJECTED: `Your expense "${expense.description}" for ${amount} has been rejected.`
    };

    return messages[type] || 'You have a new expense notification.';
  }

  replaceTemplateVariables(template, variables) {
    let result = template;
    Object.keys(variables).forEach(key => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
    });
    return result;
  }

  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  buildApprovalUrl(instanceId) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/dashboard/approvals/${instanceId}`;
  }

  buildDashboardUrl() {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/dashboard/approvals`;
  }

  async getStepApprovers(step, instance) {
    // This would typically call the approval workflow service
    // For now, returning the step's approver IDs
    return step.approverIds || [];
  }

  /**
   * Get user's unread notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Notifications
   */
  async getUserNotifications(userId, options = {}) {
    const { limit = 20, unreadOnly = false } = options;

    return await prisma.approvalNotification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false })
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
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   */
  async markAsRead(notificationId, userId) {
    return await prisma.approvalNotification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   */
  async markAllAsRead(userId) {
    return await prisma.approvalNotification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }
}

module.exports = NotificationService; 