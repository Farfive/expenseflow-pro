/**
 * Transaction Matching Routes
 * 
 * API endpoints for intelligent transaction matching system
 */

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const TransactionMatchingService = require('../services/transactionMatchingService');
const MatchingReviewService = require('../services/matchingReviewService');
const ReconciliationService = require('../services/reconciliationService');
const auth = require('../middleware/auth');
const { handleError } = require('../utils/errorHandler');

const matchingService = new TransactionMatchingService();
const reviewService = new MatchingReviewService();
const reconciliationService = new ReconciliationService();

/**
 * POST /api/transaction-matching/run
 * Run transaction matching for a company
 */
router.post('/run',
  auth,
  [
    body('companyId').isString().notEmpty(),
    body('dateFrom').optional().isISO8601(),
    body('dateTo').optional().isISO8601(),
    body('strategy').optional().isIn(['exact', 'fuzzy', 'pattern-based', 'ml-assisted', 'all'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId, dateFrom, dateTo, strategy } = req.body;
      
      // Check user permission for company
      if (!req.user.companies.includes(companyId)) {
        return res.status(403).json({ error: 'Access denied to company' });
      }

      const options = {
        ...(dateFrom && { dateFrom: new Date(dateFrom) }),
        ...(dateTo && { dateTo: new Date(dateTo) }),
        ...(strategy && { strategy })
      };

      const results = await matchingService.matchTransactions(companyId, options);

      res.json({
        success: true,
        message: 'Transaction matching completed',
        data: results
      });

    } catch (error) {
      console.error('Error running transaction matching:', error);
      handleError(res, error);
    }
  }
);

/**
 * GET /api/transaction-matching/pending-reviews
 * Get pending matches requiring manual review
 */
router.get('/pending-reviews',
  auth,
  [
    query('companyId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('sortBy').optional().isIn(['createdAt', 'confidenceScore', 'amount']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId } = req.query;
      
      // Check user permission for company
      if (!req.user.companies.includes(companyId)) {
        return res.status(403).json({ error: 'Access denied to company' });
      }

      const options = {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const pendingReviews = await reviewService.getPendingReviews(companyId, options);

      res.json({
        success: true,
        data: pendingReviews,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: pendingReviews.length
        }
      });

    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      handleError(res, error);
    }
  }
);

/**
 * POST /api/transaction-matching/approve
 * Approve a transaction match
 */
router.post('/approve',
  auth,
  [
    body('matchId').isString().notEmpty(),
    body('feedback').optional().isObject(),
    body('userConfidence').optional().isFloat({ min: 0, max: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { matchId, feedback = {}, userConfidence } = req.body;
      
      if (userConfidence) {
        feedback.userConfidence = userConfidence;
      }

      const updatedMatch = await reviewService.approveMatch(matchId, req.user.id, feedback);

      res.json({
        success: true,
        message: 'Match approved successfully',
        data: updatedMatch
      });

    } catch (error) {
      console.error('Error approving match:', error);
      handleError(res, error);
    }
  }
);

/**
 * POST /api/transaction-matching/reject
 * Reject a transaction match
 */
router.post('/reject',
  auth,
  [
    body('matchId').isString().notEmpty(),
    body('reason').isString().notEmpty(),
    body('feedback').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { matchId, reason, feedback = {} } = req.body;

      const updatedMatch = await reviewService.rejectMatch(matchId, req.user.id, reason, feedback);

      res.json({
        success: true,
        message: 'Match rejected successfully',
        data: updatedMatch
      });

    } catch (error) {
      console.error('Error rejecting match:', error);
      handleError(res, error);
    }
  }
);

/**
 * POST /api/transaction-matching/split
 * Create split transaction match
 */
router.post('/split',
  auth,
  [
    body('transactionId').isString().notEmpty(),
    body('expenses').isArray().notEmpty(),
    body('expenses.*').isString().notEmpty(),
    body('splitAmounts').isArray().notEmpty(),
    body('splitAmounts.*').isFloat({ min: 0.01 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { transactionId, expenses, splitAmounts } = req.body;

      if (expenses.length !== splitAmounts.length) {
        return res.status(400).json({ error: 'Expenses and split amounts arrays must have the same length' });
      }

      const splitMatches = await reviewService.createSplitMatch(
        transactionId, 
        expenses, 
        req.user.id, 
        splitAmounts
      );

      res.json({
        success: true,
        message: 'Split match created successfully',
        data: splitMatches
      });

    } catch (error) {
      console.error('Error creating split match:', error);
      handleError(res, error);
    }
  }
);

/**
 * GET /api/transaction-matching/statistics
 * Get matching statistics for a company
 */
router.get('/statistics',
  auth,
  [
    query('companyId').isString().notEmpty(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId, dateFrom, dateTo } = req.query;
      
      // Check user permission for company
      if (!req.user.companies.includes(companyId)) {
        return res.status(403).json({ error: 'Access denied to company' });
      }

      const dateRange = {
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo })
      };

      const statistics = await reviewService.getReviewStatistics(companyId, dateRange);

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      handleError(res, error);
    }
  }
);

/**
 * POST /api/transaction-matching/reconciliation-report
 * Generate reconciliation report
 */
router.post('/reconciliation-report',
  auth,
  [
    body('companyId').isString().notEmpty(),
    body('reportType').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
    body('periodStart').optional().isISO8601(),
    body('periodEnd').optional().isISO8601(),
    body('format').optional().isIn(['JSON', 'EXCEL', 'CSV', 'PDF'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId, reportType = 'MONTHLY', periodStart, periodEnd, format = 'JSON' } = req.body;
      
      // Check user permission for company
      if (!req.user.companies.includes(companyId)) {
        return res.status(403).json({ error: 'Access denied to company' });
      }

      const options = {
        reportType,
        ...(periodStart && { periodStart }),
        ...(periodEnd && { periodEnd }),
        format
      };

      const report = await reconciliationService.generateReconciliationReport(
        companyId, 
        req.user.id, 
        options
      );

      res.json({
        success: true,
        message: 'Reconciliation report generated successfully',
        data: report
      });

    } catch (error) {
      console.error('Error generating reconciliation report:', error);
      handleError(res, error);
    }
  }
);

/**
 * GET /api/transaction-matching/reconciliation-reports
 * Get list of reconciliation reports
 */
router.get('/reconciliation-reports',
  auth,
  [
    query('companyId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('reportType').optional().isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId, limit = 20, offset = 0, reportType } = req.query;
      
      // Check user permission for company
      if (!req.user.companies.includes(companyId)) {
        return res.status(403).json({ error: 'Access denied to company' });
      }

      const where = {
        companyId,
        ...(reportType && { reportType })
      };

      const reports = await prisma.reconciliationReport.findMany({
        where,
        include: {
          generatedByUser: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      const total = await prisma.reconciliationReport.count({ where });

      res.json({
        success: true,
        data: reports,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total
        }
      });

    } catch (error) {
      console.error('Error fetching reconciliation reports:', error);
      handleError(res, error);
    }
  }
);

/**
 * GET /api/transaction-matching/match/:matchId
 * Get specific match details
 */
router.get('/match/:matchId',
  auth,
  [
    param('matchId').isString().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { matchId } = req.params;

      const match = await prisma.transactionMatch.findUnique({
        where: { id: matchId },
        include: {
          transaction: true,
          expense: true,
          document: true,
          reviewedByUser: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          auditLogs: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      // Check user permission for company
      if (!req.user.companies.includes(match.companyId)) {
        return res.status(403).json({ error: 'Access denied to company' });
      }

      res.json({
        success: true,
        data: match
      });

    } catch (error) {
      console.error('Error fetching match details:', error);
      handleError(res, error);
    }
  }
);

/**
 * GET /api/transaction-matching/unmatched-transactions
 * Get unmatched transactions
 */
router.get('/unmatched-transactions',
  auth,
  [
    query('companyId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId, limit = 50, offset = 0, dateFrom, dateTo } = req.query;
      
      // Check user permission for company
      if (!req.user.companies.includes(companyId)) {
        return res.status(403).json({ error: 'Access denied to company' });
      }

      const where = {
        companyId,
        matchStatus: 'UNMATCHED',
        ...(dateFrom && dateTo && {
          date: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          }
        })
      };

      const [transactions, total] = await Promise.all([
        prisma.bankTransaction.findMany({
          where,
          orderBy: { date: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.bankTransaction.count({ where })
      ]);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total
        }
      });

    } catch (error) {
      console.error('Error fetching unmatched transactions:', error);
      handleError(res, error);
    }
  }
);

/**
 * GET /api/transaction-matching/unmatched-expenses
 * Get unmatched expenses
 */
router.get('/unmatched-expenses',
  auth,
  [
    query('companyId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId, limit = 50, offset = 0, dateFrom, dateTo } = req.query;
      
      // Check user permission for company
      if (!req.user.companies.includes(companyId)) {
        return res.status(403).json({ error: 'Access denied to company' });
      }

      const where = {
        companyId,
        matchedTransactions: { none: {} },
        ...(dateFrom && dateTo && {
          transactionDate: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          }
        })
      };

      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          include: {
            category: true,
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { transactionDate: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.expense.count({ where })
      ]);

      res.json({
        success: true,
        data: expenses,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total
        }
      });

    } catch (error) {
      console.error('Error fetching unmatched expenses:', error);
      handleError(res, error);
    }
  }
);

module.exports = router; 