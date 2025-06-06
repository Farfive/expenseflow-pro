const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { validateTenant } = require('../middleware/tenancy');
const { rateLimitByTenant } = require('../middleware/security');
const { validateInput } = require('../middleware/validation');
const logger = require('../utils/logger');

// Import enhanced services
const EnhancedOCRProcessor = require('../services/enhancedOCRProcessor');
const EnhancedBankProcessor = require('../services/enhancedBankProcessor');
const SmartReconciliationEngine = require('../services/smartReconciliationEngine');
const DataVerificationInterface = require('../services/dataVerificationInterface');
const ReportingDashboard = require('../services/reportingDashboard');
const ExportSystem = require('../services/exportSystem');
const FeedbackAnalyticsSystem = require('../services/feedbackAnalyticsSystem');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/tiff',
      'application/pdf', 'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Apply middleware to all routes
router.use(requireAuth);
router.use(validateTenant);
router.use(rateLimitByTenant({ windowMs: 15 * 60 * 1000, max: 1000 })); // 1000 requests per 15 minutes

// Initialize services (these would normally be dependency injected)
let enhancedOCR, enhancedBank, reconciliationEngine, verificationInterface, 
    reportingDashboard, exportSystem, analyticsSystem;

// Service initialization function
const initializeServices = (prisma) => {
  enhancedOCR = new EnhancedOCRProcessor();
  enhancedBank = new EnhancedBankProcessor();
  reconciliationEngine = new SmartReconciliationEngine(prisma);
  verificationInterface = new DataVerificationInterface(prisma);
  reportingDashboard = new ReportingDashboard(prisma);
  exportSystem = new ExportSystem(prisma);
  analyticsSystem = new FeedbackAnalyticsSystem(prisma);
};

// ================== ENHANCED DOCUMENT PROCESSING ==================

/**
 * Enhanced document processing with improved OCR
 */
router.post('/documents/process-enhanced', 
  upload.single('document'),
  validateInput({
    body: {
      documentType: { type: 'string', required: false },
      locale: { type: 'string', required: false },
      processingOptions: { type: 'object', required: false }
    }
  }),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document uploaded' });
      }

      const { documentType = 'receipt', locale = 'en-US', processingOptions = {} } = req.body;
      
      // Create document record
      const document = await req.prisma.document.create({
        data: {
          tenantId: req.tenant.id,
          companyId: req.user.companyId,
          userId: req.user.id,
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          type: documentType,
          status: 'PROCESSING'
        }
      });

      // Process with enhanced OCR
      const result = await enhancedOCR.processDocumentEnhanced(
        document.id,
        req.file.path,
        {
          documentType,
          locale,
          ...processingOptions
        }
      );

      // Update document with results
      await req.prisma.document.update({
        where: { id: document.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          processingResults: {
            create: {
              extractedData: result.extractedData,
              confidenceScore: result.confidenceScore,
              confidenceBreakdown: result.confidenceBreakdown,
              qualityMetrics: result.qualityMetrics,
              processingTime: result.processingTime,
              metadata: result.metadata
            }
          }
        }
      });

      // Track analytics
      await analyticsSystem.trackEvent(req.tenant.id, req.user.id, 'document_processed', {
        documentId: document.id,
        documentType,
        confidence: result.confidenceScore,
        processingTime: result.processingTime
      });

      res.json({
        success: true,
        documentId: document.id,
        extractedData: result.extractedData,
        confidence: result.confidenceScore,
        qualityMetrics: result.qualityMetrics,
        requiresReview: result.confidenceScore < 0.8
      });

    } catch (error) {
      logger.error('Enhanced document processing failed:', error);
      res.status(500).json({ error: 'Document processing failed', details: error.message });
    }
  }
);

/**
 * Enhanced bank statement processing
 */
router.post('/bank-statements/process-enhanced',
  upload.single('statement'),
  validateInput({
    body: {
      accountId: { type: 'string', required: false },
      bankType: { type: 'string', required: false },
      processingOptions: { type: 'object', required: false }
    }
  }),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No bank statement uploaded' });
      }

      const { accountId, bankType, processingOptions = {} } = req.body;

      // Process with enhanced bank processor
      const result = await enhancedBank.processStatement(req.file.path, {
        accountId,
        bankType,
        locale: req.user.locale || 'en-US',
        ...processingOptions
      });

      if (result.success) {
        // Save transactions to database
        const savedTransactions = await Promise.all(
          result.transactions.map(transaction =>
            req.prisma.bankTransaction.create({
              data: {
                tenantId: req.tenant.id,
                companyId: req.user.companyId,
                accountId: accountId || null,
                amount: transaction.amount,
                description: transaction.description,
                transactionDate: new Date(transaction.date),
                balance: transaction.balance,
                currency: { connect: { code: transaction.currency } },
                referenceNumber: transaction.id,
                bankFormat: transaction.bankFormat,
                metadata: transaction.metadata
              }
            })
          )
        );

        // Track analytics
        await analyticsSystem.trackEvent(req.tenant.id, req.user.id, 'bank_statement_processed', {
          transactionCount: savedTransactions.length,
          bankFormat: result.bankFormat,
          processingTime: result.processingTime
        });

        res.json({
          success: true,
          transactions: savedTransactions,
          summary: result.summary,
          bankFormat: result.bankFormat,
          metadata: result.metadata
        });
      } else {
        res.status(400).json({ error: 'Bank statement processing failed', details: result.error });
      }

    } catch (error) {
      logger.error('Enhanced bank statement processing failed:', error);
      res.status(500).json({ error: 'Bank statement processing failed', details: error.message });
    }
  }
);

// ================== SMART RECONCILIATION ==================

/**
 * Start smart reconciliation process
 */
router.post('/reconciliation/smart-reconcile',
  validateInput({
    body: {
      dateFrom: { type: 'string', required: false },
      dateTo: { type: 'string', required: false },
      currencyFilter: { type: 'string', required: false },
      maxMatches: { type: 'number', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { dateFrom, dateTo, currencyFilter, maxMatches } = req.body;

      const result = await reconciliationEngine.reconcileExpenses({
        tenantId: req.tenant.id,
        companyId: req.user.companyId,
        dateFrom,
        dateTo,
        currencyFilter,
        maxMatches,
        userId: req.user.id
      });

      // Track analytics
      await analyticsSystem.trackEvent(req.tenant.id, req.user.id, 'reconciliation_completed', {
        matchesFound: result.matches.length,
        autoConfirmed: result.stats.autoConfirmed,
        processingTime: result.processingTime
      });

      res.json(result);

    } catch (error) {
      logger.error('Smart reconciliation failed:', error);
      res.status(500).json({ error: 'Reconciliation failed', details: error.message });
    }
  }
);

/**
 * Get reconciliation statistics
 */
router.get('/reconciliation/stats',
  validateInput({
    query: {
      dateFrom: { type: 'string', required: false },
      dateTo: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const stats = await reconciliationEngine.getReconciliationStats(
        req.tenant.id,
        req.user.companyId,
        dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null
      );

      res.json(stats);

    } catch (error) {
      logger.error('Failed to get reconciliation stats:', error);
      res.status(500).json({ error: 'Failed to get reconciliation statistics' });
    }
  }
);

// ================== DATA VERIFICATION ==================

/**
 * Get verification queue
 */
router.get('/verification/queue',
  validateInput({
    query: {
      type: { type: 'string', required: false },
      priority: { type: 'string', required: false },
      limit: { type: 'number', required: false },
      offset: { type: 'number', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { type, priority, limit, offset } = req.query;

      const queue = await verificationInterface.getVerificationQueue(req.tenant.id, {
        type,
        priority,
        assignedTo: req.user.id,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      res.json(queue);

    } catch (error) {
      logger.error('Failed to get verification queue:', error);
      res.status(500).json({ error: 'Failed to load verification queue' });
    }
  }
);

/**
 * Process verification submission
 */
router.post('/verification/:verificationId/process',
  validateInput({
    params: {
      verificationId: { type: 'string', required: true }
    },
    body: {
      type: { type: 'string', required: true },
      action: { type: 'string', required: true },
      data: { type: 'object', required: false },
      notes: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { verificationId } = req.params;
      const verificationData = req.body;

      const result = await verificationInterface.processVerification(
        verificationId,
        verificationData,
        req.user.id
      );

      // Track analytics
      await analyticsSystem.trackEvent(req.tenant.id, req.user.id, 'verification_completed', {
        verificationId,
        action: verificationData.action,
        type: verificationData.type,
        processingTime: result.processingTime
      });

      res.json(result);

    } catch (error) {
      logger.error('Verification processing failed:', error);
      res.status(500).json({ error: 'Verification processing failed', details: error.message });
    }
  }
);

/**
 * Get verification statistics
 */
router.get('/verification/stats',
  validateInput({
    query: {
      dateFrom: { type: 'string', required: false },
      dateTo: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const stats = await verificationInterface.getVerificationStats(
        req.tenant.id,
        req.user.id,
        dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null
      );

      res.json(stats);

    } catch (error) {
      logger.error('Failed to get verification stats:', error);
      res.status(500).json({ error: 'Failed to get verification statistics' });
    }
  }
);

// ================== REPORTING DASHBOARD ==================

/**
 * Get dashboard overview
 */
router.get('/dashboard/overview',
  validateInput({
    query: {
      dateRange: { type: 'string', required: false },
      currency: { type: 'string', required: false },
      customRange: { type: 'object', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { dateRange, currency, customRange } = req.query;

      const overview = await reportingDashboard.getDashboardOverview(req.tenant.id, {
        companyId: req.user.companyId,
        userId: req.user.role === 'USER' ? req.user.id : null,
        dateRange,
        currency,
        customRange: customRange ? JSON.parse(customRange) : null
      });

      // Track analytics
      await analyticsSystem.trackEvent(req.tenant.id, req.user.id, 'dashboard_viewed', {
        dateRange,
        currency
      });

      res.json(overview);

    } catch (error) {
      logger.error('Failed to get dashboard overview:', error);
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
  }
);

/**
 * Get advanced analytics
 */
router.get('/dashboard/analytics',
  validateInput({
    query: {
      analysisType: { type: 'string', required: false },
      period: { type: 'string', required: false },
      groupBy: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { analysisType, period, groupBy } = req.query;

      const analytics = await reportingDashboard.getAdvancedAnalytics(req.tenant.id, {
        companyId: req.user.companyId,
        analysisType,
        period,
        groupBy,
        currency: req.user.preferredCurrency
      });

      res.json(analytics);

    } catch (error) {
      logger.error('Failed to get advanced analytics:', error);
      res.status(500).json({ error: 'Failed to load analytics data' });
    }
  }
);

// ================== EXPORT SYSTEM ==================

/**
 * Export data
 */
router.post('/export',
  validateInput({
    body: {
      dataType: { type: 'string', required: true },
      format: { type: 'string', required: true },
      template: { type: 'string', required: false },
      filters: { type: 'object', required: false },
      accountingSoftware: { type: 'string', required: false },
      taxReportType: { type: 'string', required: false },
      includeDocuments: { type: 'boolean', required: false }
    }
  }),
  async (req, res) => {
    try {
      const exportRequest = {
        ...req.body,
        filters: {
          ...req.body.filters,
          companyId: req.user.companyId
        },
        locale: req.user.locale || 'en-US'
      };

      const result = await exportSystem.exportData(req.tenant.id, exportRequest);

      // Track analytics
      await analyticsSystem.trackEvent(req.tenant.id, req.user.id, 'export_generated', {
        dataType: exportRequest.dataType,
        format: exportRequest.format,
        template: exportRequest.template,
        recordCount: result.metadata.totalRecords
      });

      res.json({
        success: true,
        exportId: result.fileName,
        downloadUrl: `/api/enhanced/export/download/${result.fileName}`,
        metadata: result.metadata
      });

    } catch (error) {
      logger.error('Export failed:', error);
      res.status(500).json({ error: 'Export failed', details: error.message });
    }
  }
);

/**
 * Download export file
 */
router.get('/export/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Verify user has access to this export
    const exportLog = await req.prisma.exportLog.findFirst({
      where: {
        tenantId: req.tenant.id,
        fileName: fileName
      }
    });

    if (!exportLog) {
      return res.status(404).json({ error: 'Export file not found' });
    }

    const filePath = `exports/${fileName}`;
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        logger.error('Export download failed:', err);
        res.status(500).json({ error: 'Download failed' });
      }
    });

  } catch (error) {
    logger.error('Export download failed:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

/**
 * Get export history
 */
router.get('/export/history',
  validateInput({
    query: {
      limit: { type: 'number', required: false },
      offset: { type: 'number', required: false },
      dataType: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { limit, offset, dataType } = req.query;

      const history = await exportSystem.getExportHistory(req.tenant.id, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        dataType
      });

      res.json({ exports: history });

    } catch (error) {
      logger.error('Failed to get export history:', error);
      res.status(500).json({ error: 'Failed to load export history' });
    }
  }
);

// ================== FEEDBACK & ANALYTICS ==================

/**
 * Submit user feedback
 */
router.post('/feedback',
  validateInput({
    body: {
      category: { type: 'string', required: true },
      title: { type: 'string', required: false },
      description: { type: 'string', required: true },
      priority: { type: 'string', required: false },
      metadata: { type: 'object', required: false }
    }
  }),
  async (req, res) => {
    try {
      const feedbackData = {
        ...req.body,
        metadata: {
          ...req.body.metadata,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      };

      const result = await analyticsSystem.submitFeedback(
        req.tenant.id,
        req.user.id,
        feedbackData
      );

      res.json(result);

    } catch (error) {
      logger.error('Feedback submission failed:', error);
      res.status(500).json({ error: 'Feedback submission failed', details: error.message });
    }
  }
);

/**
 * Track user event
 */
router.post('/analytics/track',
  validateInput({
    body: {
      eventType: { type: 'string', required: true },
      eventData: { type: 'object', required: false },
      metadata: { type: 'object', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventType, eventData, metadata } = req.body;

      const result = await analyticsSystem.trackEvent(
        req.tenant.id,
        req.user.id,
        eventType,
        eventData,
        {
          ...metadata,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          sessionId: req.session?.id
        }
      );

      res.json(result);

    } catch (error) {
      logger.error('Event tracking failed:', error);
      res.status(500).json({ error: 'Event tracking failed' });
    }
  }
);

/**
 * Track performance metric
 */
router.post('/analytics/performance',
  validateInput({
    body: {
      metricName: { type: 'string', required: true },
      value: { type: 'number', required: true },
      context: { type: 'object', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { metricName, value, context } = req.body;

      const result = await analyticsSystem.trackPerformance(
        req.tenant.id,
        req.user.id,
        metricName,
        value,
        context
      );

      res.json(result);

    } catch (error) {
      logger.error('Performance tracking failed:', error);
      res.status(500).json({ error: 'Performance tracking failed' });
    }
  }
);

/**
 * Get analytics dashboard
 */
router.get('/analytics/dashboard',
  validateInput({
    query: {
      dateRange: { type: 'string', required: false },
      region: { type: 'string', required: false },
      includeComparison: { type: 'boolean', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { dateRange, region, includeComparison } = req.query;

      const dashboard = await analyticsSystem.getAnalyticsDashboard(req.tenant.id, {
        dateRange,
        userId: req.user.role === 'ADMIN' ? null : req.user.id,
        region,
        includeComparison: includeComparison === 'true'
      });

      res.json(dashboard);

    } catch (error) {
      logger.error('Failed to get analytics dashboard:', error);
      res.status(500).json({ error: 'Failed to load analytics dashboard' });
    }
  }
);

/**
 * Generate beta testing insights
 */
router.get('/analytics/beta-insights',
  validateInput({
    query: {
      cohort: { type: 'string', required: false },
      period: { type: 'string', required: false },
      includeRecommendations: { type: 'boolean', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { cohort, period, includeRecommendations } = req.query;

      const insights = await analyticsSystem.generateBetaTestingInsights(req.tenant.id, {
        cohort,
        period,
        includeRecommendations: includeRecommendations === 'true'
      });

      res.json(insights);

    } catch (error) {
      logger.error('Failed to generate beta insights:', error);
      res.status(500).json({ error: 'Failed to generate beta testing insights' });
    }
  }
);

// ================== UTILITY ENDPOINTS ==================

/**
 * Health check for enhanced services
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        enhancedOCR: 'available',
        enhancedBank: 'available',
        reconciliation: 'available',
        verification: 'available',
        reporting: 'available',
        export: 'available',
        analytics: 'available'
      },
      version: process.env.APP_VERSION || '1.0.0'
    };

    res.json(health);

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get feature flags
 */
router.get('/features', async (req, res) => {
  try {
    const features = {
      enhancedOCR: true,
      smartReconciliation: true,
      advancedReporting: true,
      multiCurrencySupport: true,
      realTimeAnalytics: true,
      betaTesting: true,
      exportTemplates: true,
      feedbackSystem: true
    };

    res.json({ features });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get feature flags' });
  }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  logger.error('Enhanced API error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
  }
  
  res.status(500).json({ 
    error: 'Internal server error', 
    details: process.env.NODE_ENV === 'development' ? error.message : undefined 
  });
});

// Export the router and initialization function
module.exports = { router, initializeServices }; 