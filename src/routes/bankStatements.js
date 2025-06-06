const express = require('express');
const multer = require('multer');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
const { PrismaClient } = require('@prisma/client');
const BankStatementProcessor = require('../services/bankStatementProcessor');
const EnhancedBankStatementProcessor = require('../services/bankStatementProcessor');
const FormatConfigurationService = require('../services/formatConfigurationService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();
const bankProcessor = new BankStatementProcessor();
const enhancedProcessor = new EnhancedBankStatementProcessor();
const formatService = new FormatConfigurationService();

// Rate limiting for uploads
const uploadLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per windowMs
  message: 'Too many upload requests, please try again later'
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'bank-statements');
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `statement-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      '.csv', '.xlsx', '.xls', '.pdf', // Traditional formats
      '.jpg', '.jpeg', '.png', '.tiff', // Image formats for OCR
      '.qif', '.ofx', // Financial formats
      '.html', '.htm', '.txt' // Additional text formats
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// Apply middleware
router.use(auth);

// ========================================
// Bank Statement Upload and Processing
// ========================================

/**
 * POST /api/bank-statements/upload
 * Upload and process bank statement
 */
router.post('/upload', uploadLimit, upload.single('statement'), [
  body('accountNumber').optional().isLength({ min: 4, max: 20 }),
  body('accountName').optional().isLength({ min: 1, max: 100 }),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PLN']),
  body('statementPeriod').optional().matches(/^\d{4}-\d{2}$/),
  body('bankFormat').optional().isString(),
        body('autoProcess').optional().isBoolean(),
      body('formatId').optional().isString(),
      body('useEnhancedProcessing').optional().isBoolean(),
      body('extractFromImages').optional().isBoolean(),
      body('convertCurrency').optional().isBoolean(),
      body('baseCurrency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PLN'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { companyId } = req.user;
    const { 
      accountNumber, 
      accountName, 
      currency = 'USD', 
      statementPeriod,
      bankFormat,
      autoProcess = true,
      formatId,
      useEnhancedProcessing = true,
      extractFromImages = true,
      convertCurrency = false,
      baseCurrency = 'PLN'
    } = req.body;

    // Check for duplicate file hash
    const fileBuffer = await fs.readFile(req.file.path);
    const crypto = require('crypto');
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const existingStatement = await prisma.bankStatement.findFirst({
      where: {
        companyId,
        fileHash
      }
    });

    if (existingStatement) {
      // Clean up uploaded file
      await fs.remove(req.file.path);
      
      return res.status(409).json({
        success: false,
        message: 'This file has already been uploaded',
        existingStatementId: existingStatement.id
      });
    }

    const options = {
      companyId,
      originalName: req.file.originalname,
      filePath: req.file.path,
      accountNumber,
      accountName,
      currency,
      statementPeriod,
      bankFormat
    };

    if (autoProcess) {
      // Determine which processor to use
      let result;
      
      if (useEnhancedProcessing) {
        // Auto-detect format if not specified
        let detectedFormat = null;
        if (!formatId) {
          const fileContent = await fs.readFile(req.file.path, 'utf8').catch(() => '');
          detectedFormat = await formatService.autoDetectFormat(req.file.path, req.file.mimetype, fileContent);
        }

        const processingOptions = {
          formatId: formatId || detectedFormat?.formatId,
          extractFromImages,
          convertCurrency,
          baseCurrency,
          ...options
        };

        result = await enhancedProcessor.processStatement(req.file.path, req.file.mimetype, processingOptions);
      } else {
        // Use legacy processor
        result = await bankProcessor.processStatement(req.file.path, options);
      }
      
      res.status(201).json({
        success: true,
        message: 'Bank statement uploaded and processed successfully',
        processor: useEnhancedProcessing ? 'enhanced' : 'legacy',
        ...result
      });
    } else {
      // Just upload, process later
      const statement = await bankProcessor.createStatementRecord({
        size: req.file.size,
        extension: path.extname(req.file.originalname),
        hash: fileHash,
        mimeType: req.file.mimetype
      }, options);

      res.status(201).json({
        success: true,
        message: 'Bank statement uploaded successfully',
        statementId: statement.id,
        status: 'PENDING'
      });
    }

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await fs.remove(req.file.path).catch(() => {});
    }

    logger.error('Bank statement upload failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload bank statement',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/bank-statements/:id/process
 * Process uploaded statement
 */
router.post('/:id/process', [
  param('id').isString(),
  body('bankFormat').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { companyId } = req.user;
    const { bankFormat } = req.body;

    // Get statement
    const statement = await prisma.bankStatement.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    if (statement.processed) {
      return res.status(409).json({
        success: false,
        message: 'Bank statement already processed'
      });
    }

    // Update statement status
    await prisma.bankStatement.update({
      where: { id },
      data: { status: 'PROCESSING' }
    });

    const options = {
      companyId: statement.companyId,
      accountNumber: statement.accountNumber,
      accountName: statement.accountName,
      currency: statement.currency,
      statementPeriod: statement.statementPeriod,
      bankFormat: bankFormat || statement.bankFormat
    };

    const result = await bankProcessor.processStatement(statement.filePath, options);

    res.json({
      success: true,
      message: 'Bank statement processed successfully',
      ...result
    });

  } catch (error) {
    logger.error('Bank statement processing failed:', error);
    
    // Update statement status to failed
    const { id } = req.params;
    await prisma.bankStatement.update({
      where: { id },
      data: { 
        status: 'FAILED',
        processingError: error.message
      }
    }).catch(() => {});

    res.status(500).json({
      success: false,
      message: 'Failed to process bank statement',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ========================================
// Bank Statement Management
// ========================================

/**
 * GET /api/bank-statements
 * Get bank statements with filtering and pagination
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'NEEDS_REVIEW', 'ARCHIVED']),
  query('accountNumber').optional().isString(),
  query('bankName').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId } = req.user;
    const {
      page = 1,
      limit = 20,
      status,
      accountNumber,
      bankName,
      startDate,
      endDate
    } = req.query;

    const skip = (page - 1) * limit;
    const where = { companyId };

    // Apply filters
    if (status) where.status = status;
    if (accountNumber) where.accountNumber = { contains: accountNumber };
    if (bankName) where.bankName = { contains: bankName, mode: 'insensitive' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [statements, total] = await Promise.all([
      prisma.bankStatement.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      }),
      prisma.bankStatement.count({ where })
    ]);

    res.json({
      success: true,
      statements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching bank statements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank statements'
    });
  }
});

/**
 * GET /api/bank-statements/:id
 * Get specific bank statement with transactions
 */
router.get('/:id', [
  param('id').isString(),
  query('includeTransactions').optional().isBoolean(),
  query('transactionPage').optional().isInt({ min: 1 }),
  query('transactionLimit').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { companyId } = req.user;
    const { 
      includeTransactions = false, 
      transactionPage = 1, 
      transactionLimit = 100 
    } = req.query;

    const statement = await prisma.bankStatement.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        _count: {
          select: {
            transactions: true,
            correctionLogs: true
          }
        }
      }
    });

    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    let transactions = null;
    let transactionPagination = null;

    if (includeTransactions) {
      const skip = (transactionPage - 1) * transactionLimit;
      
      const [transactionData, transactionTotal] = await Promise.all([
        prisma.bankTransaction.findMany({
          where: { statementId: id },
          skip,
          take: parseInt(transactionLimit),
          orderBy: { date: 'desc' }
        }),
        prisma.bankTransaction.count({
          where: { statementId: id }
        })
      ]);

      transactions = transactionData;
      transactionPagination = {
        page: parseInt(transactionPage),
        limit: parseInt(transactionLimit),
        total: transactionTotal,
        pages: Math.ceil(transactionTotal / transactionLimit)
      };
    }

    res.json({
      success: true,
      statement,
      transactions,
      transactionPagination
    });

  } catch (error) {
    logger.error('Error fetching bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank statement'
    });
  }
});

/**
 * DELETE /api/bank-statements/:id
 * Delete bank statement and associated transactions
 */
router.delete('/:id', [
  param('id').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { companyId } = req.user;

    const statement = await prisma.bankStatement.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    // Delete file
    if (statement.filePath) {
      await fs.remove(statement.filePath).catch(() => {});
    }

    // Delete statement (cascade will delete transactions)
    await prisma.bankStatement.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Bank statement deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank statement'
    });
  }
});

// ========================================
// Transaction Management
// ========================================

/**
 * GET /api/bank-statements/:id/transactions
 * Get transactions for a specific statement
 */
router.get('/:id/transactions', [
  param('id').isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('type').optional().isIn(['DEBIT', 'CREDIT', 'FEE', 'INTEREST', 'TRANSFER', 'ADJUSTMENT']),
  query('needsReview').optional().isBoolean(),
  query('isDuplicate').optional().isBoolean(),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { companyId } = req.user;
    const {
      page = 1,
      limit = 100,
      type,
      needsReview,
      isDuplicate,
      search
    } = req.query;

    // Verify statement belongs to company
    const statement = await prisma.bankStatement.findFirst({
      where: { id, companyId }
    });

    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    const skip = (page - 1) * limit;
    const where = { statementId: id };

    // Apply filters
    if (type) where.type = type;
    if (needsReview !== undefined) where.needsReview = needsReview === 'true';
    if (isDuplicate !== undefined) where.isDuplicate = isDuplicate === 'true';
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { merchant: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: 'desc' },
        include: {
          matchedExpense: {
            select: {
              id: true,
              title: true,
              amount: true
            }
          }
        }
      }),
      prisma.bankTransaction.count({ where })
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

/**
 * PUT /api/bank-statements/transactions/:transactionId
 * Update/correct transaction data
 */
router.put('/transactions/:transactionId', [
  param('transactionId').isString(),
  body('description').optional().isLength({ min: 1, max: 500 }),
  body('amount').optional().isFloat(),
  body('type').optional().isIn(['DEBIT', 'CREDIT', 'FEE', 'INTEREST', 'TRANSFER', 'ADJUSTMENT']),
  body('merchant').optional().isLength({ max: 100 }),
  body('category').optional().isString(),
  body('correctionReason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { transactionId } = req.params;
    const { companyId, userId } = req.user;
    const { correctionReason, ...updateData } = req.body;

    // Get transaction and verify access
    const transaction = await prisma.bankTransaction.findFirst({
      where: {
        id: transactionId,
        companyId
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Log corrections
    const corrections = [];
    for (const [field, newValue] of Object.entries(updateData)) {
      if (transaction[field] !== newValue) {
        corrections.push({
          transactionId,
          userId,
          fieldName: field,
          oldValue: String(transaction[field] || ''),
          newValue: String(newValue),
          reason: correctionReason
        });
      }
    }

    // Update transaction
    const updatedTransaction = await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        ...updateData,
        isManuallyEdited: true,
        needsReview: false // Clear review flag after manual edit
      }
    });

    // Save corrections
    if (corrections.length > 0) {
      await prisma.transactionCorrection.createMany({
        data: corrections
      });
    }

    res.json({
      success: true,
      transaction: updatedTransaction,
      correctionsLogged: corrections.length
    });

  } catch (error) {
    logger.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction'
    });
  }
});

// ========================================
// Analytics and Statistics
// ========================================

/**
 * GET /api/bank-statements/analytics/summary
 * Get bank statement processing analytics
 */
router.get('/analytics/summary', [
  query('days').optional().isInt({ min: 1, max: 365 }),
  query('accountNumber').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId } = req.user;
    const { days = 30, accountNumber } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const where = {
      companyId,
      createdAt: { gte: since }
    };

    if (accountNumber) {
      where.accountNumber = { contains: accountNumber };
    }

    const [
      statementStats,
      transactionStats,
      processingStats,
      duplicateStats
    ] = await Promise.all([
      // Statement statistics
      prisma.bankStatement.groupBy({
        by: ['status'],
        where,
        _count: true
      }),

      // Transaction statistics
      prisma.bankTransaction.aggregate({
        where: {
          companyId,
          createdAt: { gte: since },
          ...(accountNumber && {
            statement: {
              accountNumber: { contains: accountNumber }
            }
          })
        },
        _count: true,
        _sum: { amount: true },
        _avg: { amount: true }
      }),

      // Processing time statistics
      prisma.bankStatement.aggregate({
        where: {
          ...where,
          processedAt: { not: null }
        },
        _avg: { transactionCount: true }
      }),

      // Duplicate statistics
      prisma.bankTransaction.count({
        where: {
          companyId,
          isDuplicate: true,
          createdAt: { gte: since }
        }
      })
    ]);

    res.json({
      success: true,
      summary: {
        period: {
          days: parseInt(days),
          from: since.toISOString(),
          to: new Date().toISOString()
        },
        statements: {
          byStatus: statementStats,
          total: statementStats.reduce((sum, stat) => sum + stat._count, 0)
        },
        transactions: {
          total: transactionStats._count,
          totalAmount: transactionStats._sum.amount || 0,
          averageAmount: transactionStats._avg.amount || 0
        },
        processing: {
          averageTransactionsPerStatement: processingStats._avg.transactionCount || 0
        },
        duplicates: {
          total: duplicateStats
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

/**
 * GET /api/bank-statements/formats
 * Get supported bank formats
 */
router.get('/formats', async (req, res) => {
  try {
    const formats = bankProcessor.getSupportedFormats();
    
    res.json({
      success: true,
      formats
    });

  } catch (error) {
    logger.error('Error fetching formats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supported formats'
    });
  }
});

// ========================================
// Enhanced Processing Features
// ========================================

/**
 * GET /api/bank-statements/enhanced-formats
 * Get all available format configurations
 */
router.get('/enhanced-formats', async (req, res) => {
  try {
    const { companyId } = req.user;
    const formats = await formatService.getAvailableFormats(companyId);
    
    res.json({
      success: true,
      data: formats
    });

  } catch (error) {
    logger.error('Error fetching enhanced formats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enhanced formats'
    });
  }
});

/**
 * POST /api/bank-statements/detect-format
 * Auto-detect format from uploaded file
 */
router.post('/detect-format', upload.single('statement'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileContent = await fs.readFile(req.file.path, 'utf8').catch(() => '');
    const detectedFormat = await formatService.autoDetectFormat(req.file.path, req.file.mimetype, fileContent);

    // Clean up uploaded file
    await fs.remove(req.file.path);

    res.json({
      success: true,
      data: detectedFormat
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await fs.remove(req.file.path).catch(() => {});
    }

    logger.error('Error detecting format:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect format'
    });
  }
});

/**
 * POST /api/bank-statements/enhanced-upload
 * Enhanced upload with multiple format support
 */
router.post('/enhanced-upload', uploadLimit, upload.array('statements', 10), [
  body('accountNumber').optional().isLength({ min: 4, max: 20 }),
  body('accountName').optional().isLength({ min: 1, max: 100 }),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PLN']),
  body('convertCurrency').optional().isBoolean(),
  body('baseCurrency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PLN']),
  body('extractFromImages').optional().isBoolean(),
  body('formatId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { companyId } = req.user;
    const {
      accountNumber,
      accountName,
      currency = 'PLN',
      convertCurrency = false,
      baseCurrency = 'PLN',
      extractFromImages = true,
      formatId
    } = req.body;

    const results = [];

    for (const file of req.files) {
      try {
        // Auto-detect format if not specified
        let detectedFormat = null;
        if (!formatId) {
          const fileContent = await fs.readFile(file.path, 'utf8').catch(() => '');
          detectedFormat = await formatService.autoDetectFormat(file.path, file.mimetype, fileContent);
        }

        const processingOptions = {
          formatId: formatId || detectedFormat?.formatId,
          extractFromImages,
          convertCurrency,
          baseCurrency,
          companyId,
          originalName: file.originalname,
          filePath: file.path,
          accountNumber,
          accountName,
          currency
        };

        const result = await enhancedProcessor.processStatement(file.path, file.mimetype, processingOptions);

        results.push({
          fileName: file.originalname,
          success: result.success,
          data: result.data,
          metadata: result.metadata,
          detectedFormat: detectedFormat?.format?.name,
          formatConfidence: detectedFormat?.confidence
        });

      } catch (fileError) {
        results.push({
          fileName: file.originalname,
          success: false,
          error: fileError.message
        });
      }

      // Clean up file
      await fs.remove(file.path).catch(() => {});
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(201).json({
      success: successCount > 0,
      message: `Processed ${successCount} files successfully, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        await fs.remove(file.path).catch(() => {});
      }
    }

    logger.error('Enhanced upload failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process uploads',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/bank-statements/custom-format
 * Create custom format configuration
 */
router.post('/custom-format', [
  body('name').notEmpty().withMessage('Format name is required'),
  body('description').optional().isString(),
  body('bankName').optional().isString(),
  body('country').optional().isString(),
  body('fileTypes').isArray().withMessage('File types must be an array'),
  body('rules').isObject().withMessage('Parsing rules are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { companyId } = req.user;
    const formatConfig = req.body;

    // Validate format configuration
    const validation = formatService.validateFormatConfig(formatConfig);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format configuration',
        errors: validation.errors
      });
    }

    const customFormat = await formatService.createCustomFormat(companyId, formatConfig);

    res.status(201).json({
      success: true,
      message: 'Custom format created successfully',
      data: customFormat
    });

  } catch (error) {
    logger.error('Error creating custom format:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create custom format'
    });
  }
});

/**
 * POST /api/bank-statements/test-format/:formatId
 * Test format configuration with sample data
 */
router.post('/test-format/:formatId', upload.single('sample'), [
  param('formatId').notEmpty().withMessage('Format ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No sample file uploaded'
      });
    }

    const { formatId } = req.params;
    const sampleContent = await fs.readFile(req.file.path, 'utf8');

    const testResult = await formatService.testFormat(formatId, sampleContent);

    // Clean up uploaded file
    await fs.remove(req.file.path);

    res.json({
      success: true,
      data: testResult
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await fs.remove(req.file.path).catch(() => {});
    }

    logger.error('Error testing format:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test format'
    });
  }
});

/**
 * GET /api/bank-statements/currency-rates
 * Get current exchange rates
 */
router.get('/currency-rates', [
  query('from').optional().isString(),
  query('to').optional().isString(),
  query('date').optional().isISO8601()
], async (req, res) => {
  try {
    const { from = 'USD', to = 'PLN', date } = req.query;
    const exchangeDate = date || new Date().toISOString().split('T')[0];

    const rate = await enhancedProcessor.getExchangeRate(from, to, exchangeDate);

    res.json({
      success: true,
      data: {
        from,
        to,
        rate,
        date: exchangeDate,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error fetching exchange rate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rate'
    });
  }
});

/**
 * POST /api/bank-statements/:id/ocr-reprocess
 * Reprocess image-based statement with OCR
 */
router.post('/:id/ocr-reprocess', [
  param('id').isString(),
  body('ocrLanguage').optional().isIn(['eng', 'pol', 'eng+pol']),
  body('enhanceImage').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { companyId } = req.user;
    const { ocrLanguage = 'eng+pol', enhanceImage = true } = req.body;

    // Get statement
    const statement = await prisma.bankStatement.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Statement not found'
      });
    }

    // Check if statement is image-based
    const isImageFormat = ['.jpg', '.jpeg', '.png', '.tiff'].includes(
      path.extname(statement.fileName).toLowerCase()
    );

    if (!isImageFormat) {
      return res.status(400).json({
        success: false,
        message: 'OCR reprocessing is only available for image-based statements'
      });
    }

    const options = {
      ocrLanguage,
      enhanceImage,
      companyId
    };

    const result = await enhancedProcessor.processImageStatement(statement.filePath, options);

    // Update statement with new OCR results
    await prisma.bankStatement.update({
      where: { id },
      data: {
        status: result.success ? 'PROCESSED' : 'FAILED',
        processedAt: new Date(),
        ocrConfidence: result.confidence,
        errorMessage: result.error || null
      }
    });

    res.json({
      success: true,
      message: 'OCR reprocessing completed',
      data: result
    });

  } catch (error) {
    logger.error('Error reprocessing with OCR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess with OCR'
    });
  }
});

module.exports = router; 