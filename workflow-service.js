const fs = require('fs');
const path = require('path');

class WorkflowService {
  constructor() {
    this.workflowsFile = path.join(__dirname, 'data', 'workflows.json');
    this.loadWorkflows();
    
    // Default workflow templates
    this.defaultWorkflows = {
      simple: {
        id: 'simple',
        name: 'Simple Approval',
        description: 'Single-step approval workflow',
        isDefault: true,
        steps: [
          {
            id: 'step1',
            name: 'Manager Approval',
            type: 'approval',
            approvers: ['manager'],
            conditions: [],
            actions: {
              onApprove: ['notify_submitter', 'mark_approved'],
              onReject: ['notify_submitter', 'mark_rejected']
            }
          }
        ],
        triggers: {
          amount: { min: 0, max: 1000 },
          categories: ['all']
        }
      },
      standard: {
        id: 'standard',
        name: 'Standard Approval',
        description: 'Two-step approval workflow',
        isDefault: true,
        steps: [
          {
            id: 'step1',
            name: 'Supervisor Review',
            type: 'approval',
            approvers: ['supervisor'],
            conditions: [
              { field: 'amount', operator: 'less_than', value: 500 }
            ],
            actions: {
              onApprove: ['proceed_to_next'],
              onReject: ['notify_submitter', 'mark_rejected']
            }
          },
          {
            id: 'step2',
            name: 'Manager Approval',
            type: 'approval',
            approvers: ['manager'],
            conditions: [],
            actions: {
              onApprove: ['notify_submitter', 'mark_approved'],
              onReject: ['notify_submitter', 'mark_rejected']
            }
          }
        ],
        triggers: {
          amount: { min: 100, max: 5000 },
          categories: ['all']
        }
      },
      executive: {
        id: 'executive',
        name: 'Executive Approval',
        description: 'Multi-level approval for high-value expenses',
        isDefault: true,
        steps: [
          {
            id: 'step1',
            name: 'Department Head Review',
            type: 'approval',
            approvers: ['department_head'],
            conditions: [],
            actions: {
              onApprove: ['proceed_to_next'],
              onReject: ['notify_submitter', 'mark_rejected']
            }
          },
          {
            id: 'step2',
            name: 'Finance Review',
            type: 'approval',
            approvers: ['finance_manager'],
            conditions: [],
            actions: {
              onApprove: ['proceed_to_next'],
              onReject: ['notify_submitter', 'mark_rejected']
            }
          },
          {
            id: 'step3',
            name: 'Executive Approval',
            type: 'approval',
            approvers: ['cfo', 'ceo'],
            conditions: [],
            actions: {
              onApprove: ['notify_submitter', 'mark_approved'],
              onReject: ['notify_submitter', 'mark_rejected']
            }
          }
        ],
        triggers: {
          amount: { min: 5000, max: null },
          categories: ['all']
        }
      }
    };

    // Available workflow components
    this.workflowComponents = {
      stepTypes: [
        { id: 'approval', name: 'Approval Step', description: 'Requires approval from specified users' },
        { id: 'notification', name: 'Notification Step', description: 'Sends notifications without requiring approval' },
        { id: 'validation', name: 'Validation Step', description: 'Validates expense data against rules' },
        { id: 'integration', name: 'Integration Step', description: 'Triggers external system integration' }
      ],
      approverTypes: [
        { id: 'manager', name: 'Direct Manager', description: 'Employee\'s direct manager' },
        { id: 'supervisor', name: 'Supervisor', description: 'Department supervisor' },
        { id: 'department_head', name: 'Department Head', description: 'Head of employee\'s department' },
        { id: 'finance_manager', name: 'Finance Manager', description: 'Finance department manager' },
        { id: 'cfo', name: 'CFO', description: 'Chief Financial Officer' },
        { id: 'ceo', name: 'CEO', description: 'Chief Executive Officer' },
        { id: 'custom_user', name: 'Specific User', description: 'Specific user by ID or email' }
      ],
      conditions: [
        { id: 'amount', name: 'Amount', operators: ['equals', 'greater_than', 'less_than', 'between'] },
        { id: 'category', name: 'Category', operators: ['equals', 'in', 'not_in'] },
        { id: 'department', name: 'Department', operators: ['equals', 'in', 'not_in'] },
        { id: 'employee_level', name: 'Employee Level', operators: ['equals', 'greater_than', 'less_than'] },
        { id: 'date', name: 'Date', operators: ['equals', 'after', 'before', 'between'] },
        { id: 'has_receipt', name: 'Has Receipt', operators: ['equals'] },
        { id: 'merchant', name: 'Merchant', operators: ['equals', 'contains', 'not_contains'] }
      ],
      actions: [
        { id: 'notify_submitter', name: 'Notify Submitter', description: 'Send notification to expense submitter' },
        { id: 'notify_approver', name: 'Notify Approver', description: 'Send notification to approver' },
        { id: 'mark_approved', name: 'Mark Approved', description: 'Mark expense as approved' },
        { id: 'mark_rejected', name: 'Mark Rejected', description: 'Mark expense as rejected' },
        { id: 'proceed_to_next', name: 'Proceed to Next Step', description: 'Continue to next workflow step' },
        { id: 'request_more_info', name: 'Request More Information', description: 'Request additional information from submitter' },
        { id: 'escalate', name: 'Escalate', description: 'Escalate to higher authority' },
        { id: 'integrate_accounting', name: 'Sync to Accounting', description: 'Send to accounting system' },
        { id: 'generate_report', name: 'Generate Report', description: 'Generate expense report' }
      ]
    };
  }

  // Load workflows from file
  loadWorkflows() {
    try {
      if (fs.existsSync(this.workflowsFile)) {
        const data = fs.readFileSync(this.workflowsFile, 'utf8');
        this.workflows = { ...this.defaultWorkflows, ...JSON.parse(data) };
      } else {
        this.workflows = { ...this.defaultWorkflows };
        this.saveWorkflows();
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      this.workflows = { ...this.defaultWorkflows };
    }
  }

  // Save workflows to file
  saveWorkflows() {
    try {
      const dataDir = path.dirname(this.workflowsFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Only save custom workflows (not defaults)
      const customWorkflows = {};
      Object.keys(this.workflows).forEach(key => {
        if (!this.workflows[key].isDefault) {
          customWorkflows[key] = this.workflows[key];
        }
      });

      fs.writeFileSync(this.workflowsFile, JSON.stringify(customWorkflows, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error saving workflows:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all workflows
  getAllWorkflows() {
    return Object.values(this.workflows).map(workflow => ({
      ...workflow,
      stepCount: workflow.steps.length,
      isActive: this.isWorkflowActive(workflow.id)
    }));
  }

  // Get workflow by ID
  getWorkflow(workflowId) {
    return this.workflows[workflowId] || null;
  }

  // Get workflow components for editor
  getWorkflowComponents() {
    return this.workflowComponents;
  }

  // Create new workflow
  createWorkflow(workflowData) {
    try {
      // Validate workflow data
      const validation = this.validateWorkflow(workflowData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Invalid workflow data',
          details: validation.errors
        };
      }

      // Generate unique ID
      const workflowId = this.generateWorkflowId(workflowData.name);
      
      // Create workflow object
      const workflow = {
        id: workflowId,
        name: workflowData.name,
        description: workflowData.description || '',
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: workflowData.createdBy || 'system',
        steps: workflowData.steps || [],
        triggers: workflowData.triggers || { amount: { min: 0, max: null }, categories: ['all'] },
        settings: workflowData.settings || {
          allowParallelApproval: false,
          escalationTimeout: 72, // hours
          reminderInterval: 24, // hours
          autoApproveOnTimeout: false
        }
      };

      // Add to workflows
      this.workflows[workflowId] = workflow;

      // Save to file
      const saveResult = this.saveWorkflows();
      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
        message: 'Workflow created successfully',
        data: workflow
      };
    } catch (error) {
      console.error('Error creating workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update workflow
  updateWorkflow(workflowId, updates) {
    try {
      if (!this.workflows[workflowId]) {
        return {
          success: false,
          error: 'Workflow not found'
        };
      }

      if (this.workflows[workflowId].isDefault) {
        return {
          success: false,
          error: 'Cannot modify default workflows'
        };
      }

      // Validate updates
      const updatedWorkflow = { ...this.workflows[workflowId], ...updates };
      const validation = this.validateWorkflow(updatedWorkflow);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Invalid workflow data',
          details: validation.errors
        };
      }

      // Update workflow
      this.workflows[workflowId] = {
        ...this.workflows[workflowId],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Save to file
      const saveResult = this.saveWorkflows();
      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
        message: 'Workflow updated successfully',
        data: this.workflows[workflowId]
      };
    } catch (error) {
      console.error('Error updating workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete workflow
  deleteWorkflow(workflowId) {
    try {
      if (!this.workflows[workflowId]) {
        return {
          success: false,
          error: 'Workflow not found'
        };
      }

      if (this.workflows[workflowId].isDefault) {
        return {
          success: false,
          error: 'Cannot delete default workflows'
        };
      }

      // Check if workflow is in use
      if (this.isWorkflowActive(workflowId)) {
        return {
          success: false,
          error: 'Cannot delete workflow that is currently in use'
        };
      }

      // Delete workflow
      delete this.workflows[workflowId];

      // Save to file
      const saveResult = this.saveWorkflows();
      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
        message: 'Workflow deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Duplicate workflow
  duplicateWorkflow(workflowId, newName) {
    try {
      const originalWorkflow = this.workflows[workflowId];
      if (!originalWorkflow) {
        return {
          success: false,
          error: 'Original workflow not found'
        };
      }

      // Create duplicate
      const duplicateData = {
        ...originalWorkflow,
        name: newName || `${originalWorkflow.name} (Copy)`,
        description: `Copy of ${originalWorkflow.name}`,
        createdBy: 'system'
      };

      return this.createWorkflow(duplicateData);
    } catch (error) {
      console.error('Error duplicating workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate workflow
  validateWorkflow(workflow) {
    const errors = [];

    // Basic validation
    if (!workflow.name || workflow.name.trim().length < 2) {
      errors.push('Workflow name must be at least 2 characters long');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    // Validate steps
    if (workflow.steps) {
      workflow.steps.forEach((step, index) => {
        if (!step.name || step.name.trim().length < 2) {
          errors.push(`Step ${index + 1}: Name is required`);
        }

        if (!step.type || !this.workflowComponents.stepTypes.find(t => t.id === step.type)) {
          errors.push(`Step ${index + 1}: Invalid step type`);
        }

        if (step.type === 'approval' && (!step.approvers || step.approvers.length === 0)) {
          errors.push(`Step ${index + 1}: Approval step must have at least one approver`);
        }

        // Validate conditions
        if (step.conditions) {
          step.conditions.forEach((condition, condIndex) => {
            if (!condition.field || !condition.operator || condition.value === undefined) {
              errors.push(`Step ${index + 1}, Condition ${condIndex + 1}: Incomplete condition`);
            }
          });
        }
      });
    }

    // Validate triggers
    if (workflow.triggers) {
      if (workflow.triggers.amount) {
        const { min, max } = workflow.triggers.amount;
        if (min !== null && max !== null && min > max) {
          errors.push('Trigger amount: minimum cannot be greater than maximum');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate unique workflow ID
  generateWorkflowId(name) {
    const baseId = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    let workflowId = baseId;
    let counter = 1;
    
    while (this.workflows[workflowId]) {
      workflowId = `${baseId}_${counter}`;
      counter++;
    }
    
    return workflowId;
  }

  // Check if workflow is active (being used by expenses)
  isWorkflowActive(workflowId) {
    // In a real implementation, this would check the database
    // For now, return false to allow operations
    return false;
  }

  // Get workflow for expense
  getWorkflowForExpense(expense) {
    try {
      // Find matching workflow based on triggers
      const matchingWorkflows = Object.values(this.workflows).filter(workflow => {
        return this.doesExpenseMatchWorkflow(expense, workflow);
      });

      // Sort by specificity (more specific triggers first)
      matchingWorkflows.sort((a, b) => {
        return this.getWorkflowSpecificity(b) - this.getWorkflowSpecificity(a);
      });

      return matchingWorkflows[0] || this.workflows.simple;
    } catch (error) {
      console.error('Error getting workflow for expense:', error);
      return this.workflows.simple;
    }
  }

  // Check if expense matches workflow triggers
  doesExpenseMatchWorkflow(expense, workflow) {
    const triggers = workflow.triggers;

    // Check amount range
    if (triggers.amount) {
      const { min, max } = triggers.amount;
      if (min !== null && expense.amount < min) return false;
      if (max !== null && expense.amount > max) return false;
    }

    // Check categories
    if (triggers.categories && !triggers.categories.includes('all')) {
      if (!triggers.categories.includes(expense.category)) return false;
    }

    // Check department
    if (triggers.departments && !triggers.departments.includes('all')) {
      if (!triggers.departments.includes(expense.department)) return false;
    }

    return true;
  }

  // Calculate workflow specificity for sorting
  getWorkflowSpecificity(workflow) {
    let specificity = 0;
    const triggers = workflow.triggers;

    // More specific amount ranges get higher scores
    if (triggers.amount) {
      const { min, max } = triggers.amount;
      if (min !== null) specificity += 1;
      if (max !== null) specificity += 1;
      if (min !== null && max !== null) specificity += 1; // Bonus for range
    }

    // Specific categories get higher scores
    if (triggers.categories && !triggers.categories.includes('all')) {
      specificity += triggers.categories.length;
    }

    // Specific departments get higher scores
    if (triggers.departments && !triggers.departments.includes('all')) {
      specificity += triggers.departments.length;
    }

    return specificity;
  }

  // Execute workflow step
  async executeWorkflowStep(expenseId, workflowId, stepId, action, userId) {
    try {
      const workflow = this.workflows[workflowId];
      if (!workflow) {
        return {
          success: false,
          error: 'Workflow not found'
        };
      }

      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) {
        return {
          success: false,
          error: 'Workflow step not found'
        };
      }

      // Execute step actions
      const results = [];
      const actions = step.actions[action] || [];

      for (const actionId of actions) {
        const result = await this.executeAction(actionId, expenseId, userId);
        results.push(result);
      }

      return {
        success: true,
        message: `Workflow step executed: ${action}`,
        results
      };
    } catch (error) {
      console.error('Error executing workflow step:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Execute individual action
  async executeAction(actionId, expenseId, userId) {
    try {
      switch (actionId) {
        case 'notify_submitter':
          return { action: 'notify_submitter', success: true, message: 'Submitter notified' };
        case 'notify_approver':
          return { action: 'notify_approver', success: true, message: 'Approver notified' };
        case 'mark_approved':
          return { action: 'mark_approved', success: true, message: 'Expense marked as approved' };
        case 'mark_rejected':
          return { action: 'mark_rejected', success: true, message: 'Expense marked as rejected' };
        case 'proceed_to_next':
          return { action: 'proceed_to_next', success: true, message: 'Proceeding to next step' };
        case 'request_more_info':
          return { action: 'request_more_info', success: true, message: 'More information requested' };
        case 'escalate':
          return { action: 'escalate', success: true, message: 'Expense escalated' };
        case 'integrate_accounting':
          return { action: 'integrate_accounting', success: true, message: 'Sent to accounting system' };
        case 'generate_report':
          return { action: 'generate_report', success: true, message: 'Report generated' };
        default:
          return { action: actionId, success: false, message: 'Unknown action' };
      }
    } catch (error) {
      return { action: actionId, success: false, message: error.message };
    }
  }

  // Export workflow
  exportWorkflow(workflowId) {
    try {
      const workflow = this.workflows[workflowId];
      if (!workflow) {
        return {
          success: false,
          error: 'Workflow not found'
        };
      }

      const exportData = {
        ...workflow,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const exportPath = path.join(__dirname, 'exports', `workflow_${workflowId}_${Date.now()}.json`);
      
      // Ensure exports directory exists
      const exportsDir = path.dirname(exportPath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

      return {
        success: true,
        message: 'Workflow exported successfully',
        filepath: exportPath,
        filename: path.basename(exportPath)
      };
    } catch (error) {
      console.error('Error exporting workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Import workflow
  importWorkflow(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'Import file not found'
        };
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const workflowData = JSON.parse(data);

      // Remove metadata
      delete workflowData.exportedAt;
      delete workflowData.version;
      delete workflowData.id;
      delete workflowData.createdAt;
      delete workflowData.updatedAt;

      // Create new workflow
      return this.createWorkflow(workflowData);
    } catch (error) {
      console.error('Error importing workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new WorkflowService(); 