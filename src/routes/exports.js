/**
 * Comprehensive Export API Routes
 * 
 * Supports multiple export formats and accounting software integrations
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleAuth');
const ComprehensiveExportService = require('../services/exportService');

const router = express.Router();
const prisma = new PrismaClient();

// Initialize export service
const exportService = new ComprehensiveExportService();

// Rate limiting for exports
const exportLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 export requests per windowMs
  message: 'Too many export requests, please try again later'
});

// Apply middleware
router.use(authMiddleware);
router.use(exportLimit);

// ========================================
// Standard Export Endpoints
// ========================================

/**
 * POST /api/exports/create
 * Create new export with specified format and options
 */
router.post('/create', [
  body('format').isIn(['csv', 'excel', 'json', 'xml', 'pdf', 'custom']).withMessage('Invalid export format'),
  body('period.start').isISO8601().withMessage('Invalid start date'),
  body('period.end').isISO8601().withMessage('Invalid end date'),
  body('dataType').optional().isIn(['expenses', 'transactions', 'all']),
  body('filters').optional().isObject(),
  body('template').optional().isString(),
  body('options').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId, userId } = req.user;
    const exportRequest = {
      ...req.body,
      companyId,
      userId,
      requestedAt: new Date()
    };

    const result = await exportService.exportData(exportRequest);

    if (result.success) {
      res.json({
        success: true,
        message: 'Export created successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Export failed',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Export creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create export',
      error: error.message
    });
  }
});

/**
 * GET /api/exports/download/:exportId
 * Download completed export file
 */
router.get('/download/:exportId', [
  param('exportId').notEmpty().withMessage('Export ID is required')
], async (req, res) => {
  try {
    const { exportId } = req.params;
    const { companyId } = req.user;

    // Verify export belongs to company
    const exportAudit = await prisma.exportAudit.findFirst({
      where: {
        exportId,
        // Add company verification through related records
      }
    });

    if (!exportAudit) {
      return res.status(404).json({
        success: false,
        message: 'Export not found'
      });
    }

    const filePath = path.join(process.cwd(), 'exports', exportAudit.fileName);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Export file not found'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${exportAudit.fileName}"`);
    res.setHeader('Content-Type', getContentTypeForFormat(exportAudit.format));
    
    // Stream file
    res.sendFile(filePath);

  } catch (error) {
    console.error('Export download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download export'
    });
  }
});

// ========================================
// Accounting Software Templates
// ========================================

/**
 * GET /api/exports/templates
 * Get available export templates for accounting software
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'quickbooks_csv',
        name: 'QuickBooks CSV Import',
        software: 'QuickBooks',
        format: 'csv',
        description: 'Standard QuickBooks CSV import format'
      },
      {
        id: 'xero_csv',
        name: 'Xero Bank Statement Import',
        software: 'Xero',
        format: 'csv',
        description: 'Xero bank statement import format'
      },
      {
        id: 'sage_xml',
        name: 'Sage XML Import',
        software: 'Sage',
        format: 'xml',
        description: 'Sage accounting XML import format'
      },
      {
        id: 'generic_api',
        name: 'Generic API JSON',
        software: 'Generic',
        format: 'json',
        description: 'Generic JSON format for API integrations'
      }
    ];

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
});

/**
 * POST /api/exports/quickbooks
 * Export data in QuickBooks format
 */
router.post('/quickbooks', [
  body('period.start').isISO8601(),
  body('period.end').isISO8601(),
  body('includeExpenses').optional().isBoolean(),
  body('includeTransactions').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId, userId } = req.user;
    const exportRequest = {
      format: 'csv',
      template: 'quickbooks_csv',
      ...req.body,
      companyId,
      userId
    };

    const result = await exportService.exportData(exportRequest);

    res.json({
      success: result.success,
      message: result.success ? 'QuickBooks export created successfully' : 'Export failed',
      data: result
    });

  } catch (error) {
    console.error('QuickBooks export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create QuickBooks export'
    });
  }
});

/**
 * POST /api/exports/xero
 * Export data in Xero format
 */
router.post('/xero', [
  body('period.start').isISO8601(),
  body('period.end').isISO8601(),
  body('accountCode').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId, userId } = req.user;
    const exportRequest = {
      format: 'csv',
      template: 'xero_csv',
      ...req.body,
      companyId,
      userId
    };

    const result = await exportService.exportData(exportRequest);

    res.json({
      success: result.success,
      message: result.success ? 'Xero export created successfully' : 'Export failed',
      data: result
    });

  } catch (error) {
    console.error('Xero export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Xero export'
    });
  }
});

/**
 * POST /api/exports/sage
 * Export data in Sage XML format
 */
router.post('/sage', [
  body('period.start').isISO8601(),
  body('period.end').isISO8601(),
  body('nominalCodes').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId, userId } = req.user;
    const exportRequest = {
      format: 'xml',
      template: 'sage_xml',
      ...req.body,
      companyId,
      userId
    };

    const result = await exportService.exportData(exportRequest);

    res.json({
      success: result.success,
      message: result.success ? 'Sage XML export created successfully' : 'Export failed',
      data: result
    });

  } catch (error) {
    console.error('Sage export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Sage export'
    });
  }
});

// ========================================
// Batch and Scheduled Exports
// ========================================

/**
 * POST /api/exports/batch
 * Create batch export for multiple periods
 */
router.post('/batch', [
  body('periods').isArray().withMessage('Periods must be an array'),
  body('periods.*.start').isISO8601(),
  body('periods.*.end').isISO8601(),
  body('format').isIn(['csv', 'excel', 'json', 'xml', 'pdf']),
  body('zipOutput').optional().isBoolean(),
  body('options').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId, userId } = req.user;
    const batchRequest = {
      ...req.body,
      companyId,
      userId
    };

    const result = await exportService.batchExport(batchRequest);

    res.json({
      success: result.success,
      message: result.success ? 'Batch export completed' : 'Batch export failed',
      data: result
    });

  } catch (error) {
    console.error('Batch export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create batch export'
    });
  }
});

/**
 * POST /api/exports/schedule
 * Schedule recurring export
 */
router.post('/schedule', roleMiddleware(['ADMIN', 'MANAGER']), [
  body('name').notEmpty().withMessage('Schedule name is required'),
  body('schedule').notEmpty().withMessage('Cron schedule is required'),
  body('exportConfig').isObject().withMessage('Export configuration is required'),
  body('enabled').optional().isBoolean(),
  body('timezone').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId, userId } = req.user;
    const scheduleRequest = {
      ...req.body,
      exportConfig: {
        ...req.body.exportConfig,
        companyId,
        userId
      }
    };

    const taskId = exportService.scheduleExport(scheduleRequest);

    // Save schedule to database
    await prisma.exportSchedule.create({
      data: {
        taskId,
        companyId,
        createdBy: userId,
        name: req.body.name,
        schedule: req.body.schedule,
        exportConfig: JSON.stringify(req.body.exportConfig),
        enabled: req.body.enabled !== false,
        timezone: req.body.timezone || 'Europe/Warsaw'
      }
    });

    res.json({
      success: true,
      message: 'Export scheduled successfully',
      data: { taskId }
    });

  } catch (error) {
    console.error('Schedule export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule export'
    });
  }
});

/**
 * GET /api/exports/scheduled
 * Get all scheduled exports
 */
router.get('/scheduled', roleMiddleware(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { companyId } = req.user;

    const scheduledExports = await prisma.exportSchedule.findMany({
      where: {
        companyId,
        isActive: true
      },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: scheduledExports
    });

  } catch (error) {
    console.error('Error fetching scheduled exports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled exports'
    });
  }
});

/**
 * DELETE /api/exports/scheduled/:taskId
 * Cancel scheduled export
 */
router.delete('/scheduled/:taskId', roleMiddleware(['ADMIN', 'MANAGER']), [
  param('taskId').notEmpty().withMessage('Task ID is required')
], async (req, res) => {
  try {
    const { taskId } = req.params;
    const { companyId } = req.user;

    // Verify schedule belongs to company
    const schedule = await prisma.exportSchedule.findFirst({
      where: {
        taskId,
        companyId
      }
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled export not found'
      });
    }

    // Remove from service
    const removed = exportService.removeScheduledExport(taskId);

    if (removed) {
      // Deactivate in database
      await prisma.exportSchedule.update({
        where: { id: schedule.id },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: 'Scheduled export cancelled successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to cancel scheduled export'
      });
    }

  } catch (error) {
    console.error('Error cancelling scheduled export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel scheduled export'
    });
  }
});

// ========================================
// Export Status and Management
// ========================================

/**
 * GET /api/exports/status/:exportId
 * Get export status and progress
 */
router.get('/status/:exportId', [
  param('exportId').notEmpty().withMessage('Export ID is required')
], async (req, res) => {
  try {
    const { exportId } = req.params;
    
    const status = exportService.getExportStatus(exportId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Export not found'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error fetching export status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch export status'
    });
  }
});

/**
 * GET /api/exports/active
 * Get all active exports for the company
 */
router.get('/active', async (req, res) => {
  try {
    const activeExports = exportService.getAllActiveExports();
    
    res.json({
      success: true,
      data: activeExports
    });

  } catch (error) {
    console.error('Error fetching active exports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active exports'
    });
  }
});

/**
 * DELETE /api/exports/cancel/:exportId
 * Cancel active export
 */
router.delete('/cancel/:exportId', [
  param('exportId').notEmpty().withMessage('Export ID is required')
], async (req, res) => {
  try {
    const { exportId } = req.params;
    
    const cancelled = exportService.cancelExport(exportId);
    
    if (cancelled) {
      res.json({
        success: true,
        message: 'Export cancelled successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Export not found or cannot be cancelled'
      });
    }

  } catch (error) {
    console.error('Error cancelling export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel export'
    });
  }
});

/**
 * GET /api/exports/history
 * Get export history for the company
 */
router.get('/history', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('format').optional().isString(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601()
], async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      page = 1, 
      limit = 20, 
      format, 
      from, 
      to 
    } = req.query;

    const where = {
      // Add company filter through related data
    };

    if (format) {
      where.format = format;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [exports, total] = await Promise.all([
      prisma.exportAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.exportAudit.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        exports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching export history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch export history'
    });
  }
});

// ========================================
// Custom Templates and Formats
// ========================================

/**
 * POST /api/exports/custom-template
 * Create custom export template
 */
router.post('/custom-template', roleMiddleware(['ADMIN', 'MANAGER']), [
  body('name').notEmpty().withMessage('Template name is required'),
  body('description').optional().isString(),
  body('templateSource').notEmpty().withMessage('Template source is required'),
  body('outputFormat').notEmpty().withMessage('Output format is required'),
  body('category').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId, userId } = req.user;

    const template = await prisma.exportTemplate.create({
      data: {
        companyId,
        createdBy: userId,
        name: req.body.name,
        description: req.body.description,
        templateSource: req.body.templateSource,
        outputFormat: req.body.outputFormat,
        category: req.body.category,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: 'Custom template created successfully',
      data: template
    });

  } catch (error) {
    console.error('Error creating custom template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create custom template'
    });
  }
});

// ========================================
// Helper Functions
// ========================================

function getContentTypeForFormat(format) {
  const contentTypes = {
    csv: 'text/csv',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    json: 'application/json',
    xml: 'application/xml',
    pdf: 'application/pdf',
    custom: 'text/plain'
  };
  
  return contentTypes[format] || 'application/octet-stream';
}

module.exports = router; 