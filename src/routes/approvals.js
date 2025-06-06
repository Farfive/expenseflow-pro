/**
 * Approval Workflow API Routes
 * 
 * Comprehensive approval system endpoints for multi-level workflows,
 * role-based permissions, delegation, bulk operations, and reporting.
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const ApprovalWorkflowService = require('../services/approvalWorkflowService');
const NotificationService = require('../services/notificationService');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const router = express.Router();
const approvalService = new ApprovalWorkflowService();
const notificationService = new NotificationService();

// Middleware for request validation
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Submit expense for approval
 * POST /api/approvals/submit
 */
router.post('/submit',
  authMiddleware,
  [
    body('expenseId').isString().notEmpty().withMessage('Expense ID is required'),
    body('submissionNotes').optional().isString().withMessage('Submission notes must be a string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { expenseId, submissionNotes } = req.body;
      const submitterId = req.user.id;

      const instance = await approvalService.submitForApproval(
        expenseId, 
        submitterId, 
        { submissionNotes }
      );

      res.json({
        success: true,
        message: 'Expense submitted for approval',
        data: instance
      });

    } catch (error) {
      console.error('Error submitting expense for approval:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to submit expense for approval'
      });
    }
  }
);

/**
 * Get pending approvals for current user
 * GET /api/approvals/pending
 */
router.get('/pending',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    query('sortBy').optional().isIn(['assignedAt', 'amount', 'submittedAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;
      const options = {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
        sortBy: req.query.sortBy || 'assignedAt',
        sortOrder: req.query.sortOrder || 'desc',
        companyId
      };

      const pendingApprovals = await approvalService.getPendingApprovals(userId, options);

      res.json({
        success: true,
        data: pendingApprovals
      });

    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending approvals'
      });
    }
  }
);

/**
 * Approve a step
 * POST /api/approvals/:stepRecordId/approve
 */
router.post('/:stepRecordId/approve',
  authMiddleware,
  [
    param('stepRecordId').isString().notEmpty().withMessage('Step record ID is required'),
    body('comments').optional().isString().withMessage('Comments must be a string'),
    body('privateNotes').optional().isString().withMessage('Private notes must be a string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { stepRecordId } = req.params;
      const { comments, privateNotes } = req.body;
      const approverId = req.user.id;

      const updatedRecord = await approvalService.approveStep(
        stepRecordId,
        approverId,
        { comments, privateNotes }
      );

      res.json({
        success: true,
        message: 'Step approved successfully',
        data: updatedRecord
      });

    } catch (error) {
      console.error('Error approving step:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to approve step'
      });
    }
  }
);

/**
 * Reject a step
 * POST /api/approvals/:stepRecordId/reject
 */
router.post('/:stepRecordId/reject',
  authMiddleware,
  [
    param('stepRecordId').isString().notEmpty().withMessage('Step record ID is required'),
    body('comments').isString().notEmpty().withMessage('Comments are required for rejection'),
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { stepRecordId } = req.params;
      const { comments, reason } = req.body;
      const approverId = req.user.id;

      const updatedRecord = await approvalService.rejectStep(
        stepRecordId,
        approverId,
        { comments, reason }
      );

      res.json({
        success: true,
        message: 'Step rejected successfully',
        data: updatedRecord
      });

    } catch (error) {
      console.error('Error rejecting step:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reject step'
      });
    }
  }
);

/**
 * Delegate approval
 * POST /api/approvals/:stepRecordId/delegate
 */
router.post('/:stepRecordId/delegate',
  authMiddleware,
  [
    param('stepRecordId').isString().notEmpty().withMessage('Step record ID is required'),
    body('delegateeId').isString().notEmpty().withMessage('Delegatee ID is required'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    body('comments').optional().isString().withMessage('Comments must be a string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { stepRecordId } = req.params;
      const { delegateeId, reason, comments } = req.body;
      const delegatorId = req.user.id;

      const updatedRecord = await approvalService.delegateApproval(
        stepRecordId,
        delegatorId,
        delegateeId,
        { reason, comments }
      );

      res.json({
        success: true,
        message: 'Approval delegated successfully',
        data: updatedRecord
      });

    } catch (error) {
      console.error('Error delegating approval:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delegate approval'
      });
    }
  }
);

/**
 * Bulk approve expenses
 * POST /api/approvals/bulk-approve
 */
router.post('/bulk-approve',
  authMiddleware,
  roleMiddleware(['MANAGER', 'FINANCE', 'ADMIN']),
  [
    body('expenseIds').isArray({ min: 1 }).withMessage('At least one expense ID is required'),
    body('expenseIds.*').isString().withMessage('Each expense ID must be a string'),
    body('comments').optional().isString().withMessage('Comments must be a string'),
    body('batchName').optional().isString().withMessage('Batch name must be a string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { expenseIds, comments, batchName } = req.body;
      const approverId = req.user.id;
      const companyId = req.user.companyId;

      const results = await approvalService.bulkApprove(
        expenseIds,
        approverId,
        { comments, batchName, companyId }
      );

      res.json({
        success: true,
        message: 'Bulk approval completed',
        data: results
      });

    } catch (error) {
      console.error('Error bulk approving expenses:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to bulk approve expenses'
      });
    }
  }
);

/**
 * Get approval dashboard data
 * GET /api/approvals/dashboard
 */
router.get('/dashboard',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;

      const dashboardData = await approvalService.getApprovalDashboard(userId, companyId);

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      console.error('Error fetching approval dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch approval dashboard data'
      });
    }
  }
);

/**
 * Get approval instance details
 * GET /api/approvals/instance/:instanceId
 */
router.get('/instance/:instanceId',
  authMiddleware,
  [
    param('instanceId').isString().notEmpty().withMessage('Instance ID is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { instanceId } = req.params;

      const instance = await approvalService.getApprovalInstanceDetails(instanceId);

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: 'Approval instance not found'
        });
      }

      res.json({
        success: true,
        data: instance
      });

    } catch (error) {
      console.error('Error fetching approval instance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch approval instance'
      });
    }
  }
);

/**
 * Get approval history for an expense
 * GET /api/approvals/expense/:expenseId/history
 */
router.get('/expense/:expenseId/history',
  authMiddleware,
  [
    param('expenseId').isString().notEmpty().withMessage('Expense ID is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { expenseId } = req.params;

      const history = await approvalService.getExpenseApprovalHistory(expenseId);

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Error fetching approval history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch approval history'
      });
    }
  }
);

/**
 * Create or update delegation
 * POST /api/approvals/delegation
 */
router.post('/delegation',
  authMiddleware,
  [
    body('delegateeId').isString().notEmpty().withMessage('Delegatee ID is required'),
    body('validFrom').isISO8601().withMessage('Valid from date is required'),
    body('validTo').optional().isISO8601().withMessage('Valid to must be a valid date'),
    body('workflowIds').optional().isArray().withMessage('Workflow IDs must be an array'),
    body('categoryIds').optional().isArray().withMessage('Category IDs must be an array'),
    body('amountLimit').optional().isNumeric().withMessage('Amount limit must be numeric'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    body('isGlobal').optional().isBoolean().withMessage('Is global must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const delegatorId = req.user.id;
      const companyId = req.user.companyId;
      const delegationData = {
        ...req.body,
        delegatorId,
        companyId
      };

      const delegation = await approvalService.createDelegation(delegationData);

      res.json({
        success: true,
        message: 'Delegation created successfully',
        data: delegation
      });

    } catch (error) {
      console.error('Error creating delegation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create delegation'
      });
    }
  }
);

/**
 * Get user's delegations
 * GET /api/approvals/delegations
 */
router.get('/delegations',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;

      const delegations = await approvalService.getUserDelegations(userId, companyId);

      res.json({
        success: true,
        data: delegations
      });

    } catch (error) {
      console.error('Error fetching delegations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch delegations'
      });
    }
  }
);

/**
 * Cancel delegation
 * DELETE /api/approvals/delegation/:delegationId
 */
router.delete('/delegation/:delegationId',
  authMiddleware,
  [
    param('delegationId').isString().notEmpty().withMessage('Delegation ID is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { delegationId } = req.params;
      const userId = req.user.id;

      await approvalService.cancelDelegation(delegationId, userId);

      res.json({
        success: true,
        message: 'Delegation cancelled successfully'
      });

    } catch (error) {
      console.error('Error cancelling delegation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel delegation'
      });
    }
  }
);

/**
 * Get workflow templates for company
 * GET /api/approvals/workflows
 */
router.get('/workflows',
  authMiddleware,
  roleMiddleware(['MANAGER', 'FINANCE', 'ADMIN']),
  async (req, res) => {
    try {
      const companyId = req.user.companyId;

      const workflows = await approvalService.getCompanyWorkflows(companyId);

      res.json({
        success: true,
        data: workflows
      });

    } catch (error) {
      console.error('Error fetching workflows:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflows'
      });
    }
  }
);

/**
 * Create workflow template
 * POST /api/approvals/workflows
 */
router.post('/workflows',
  authMiddleware,
  roleMiddleware(['ADMIN']),
  [
    body('name').isString().notEmpty().withMessage('Workflow name is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('amountThresholds').isArray().withMessage('Amount thresholds are required'),
    body('categoryIds').optional().isArray().withMessage('Category IDs must be an array'),
    body('steps').isArray({ min: 1 }).withMessage('At least one approval step is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const workflowData = {
        ...req.body,
        companyId
      };

      const workflow = await approvalService.createWorkflow(workflowData);

      res.json({
        success: true,
        message: 'Workflow created successfully',
        data: workflow
      });

    } catch (error) {
      console.error('Error creating workflow:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create workflow'
      });
    }
  }
);

/**
 * Get notifications for user
 * GET /api/approvals/notifications
 */
router.get('/notifications',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('unreadOnly').optional().isBoolean().withMessage('Unread only must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const options = {
        limit: parseInt(req.query.limit) || 20,
        unreadOnly: req.query.unreadOnly === 'true'
      };

      const notifications = await notificationService.getUserNotifications(userId, options);

      res.json({
        success: true,
        data: notifications
      });

    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }
);

/**
 * Mark notification as read
 * PUT /api/approvals/notifications/:notificationId/read
 */
router.put('/notifications/:notificationId/read',
  authMiddleware,
  [
    param('notificationId').isString().notEmpty().withMessage('Notification ID is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      await notificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification marked as read'
      });

    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  }
);

/**
 * Mark all notifications as read
 * PUT /api/approvals/notifications/read-all
 */
router.put('/notifications/read-all',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;

      await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
  }
);

/**
 * Get approval statistics
 * GET /api/approvals/statistics
 */
router.get('/statistics',
  authMiddleware,
  roleMiddleware(['MANAGER', 'FINANCE', 'ADMIN']),
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid'),
    query('userId').optional().isString().withMessage('User ID must be string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { startDate, endDate, userId } = req.query;

      const statistics = await approvalService.getApprovalStatistics(companyId, {
        startDate,
        endDate,
        userId
      });

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('Error fetching approval statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch approval statistics'
      });
    }
  }
);

module.exports = router; 