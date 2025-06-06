/**
 * Expense Routes
 * 
 * Handles expense CRUD operations, OCR processing, and file uploads
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PrismaClient } = require('@prisma/client');
const { body, param, query, validationResult } = require('express-validator');
const tesseract = require('node-tesseract-ocr');
const Jimp = require('jimp');

const authMiddleware = require('../middleware/auth');
const { processDocument } = require('../services/documentProcessingService');
const { categorizeExpense } = require('../services/categorizationService');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/expenses');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

/**
 * Get user's expenses with filtering and pagination
 * GET /api/expenses/my
 */
router.get('/my',
  authMiddleware,
  [
    query('status').optional().isIn(['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID']),
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { status, period, search, page = 1, limit = 20 } = req.query;
      const userId = req.user.id;
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        userId,
        ...(status && { status }),
      };

      // Add date filtering
      if (period) {
        const now = new Date();
        let startDate;

        switch (period) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }

        if (startDate) {
          where.transactionDate = {
            gte: startDate
          };
        }
      }

      // Add search filtering
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { merchantName: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          include: {
            category: true,
            document: true,
            approvalInstance: {
              include: {
                workflow: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: parseInt(limit)
        }),
        prisma.expense.count({ where })
      ]);

      res.json({
        success: true,
        data: expenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching user expenses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expenses'
      });
    }
  }
);

/**
 * Get expense statistics for current user
 * GET /api/expenses/stats
 */
router.get('/stats',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        totalExpenses,
        monthlyExpenses,
        lastMonthExpenses,
        statusCounts,
        avgAmount
      ] = await Promise.all([
        // Total expenses amount
        prisma.expense.aggregate({
          where: { userId },
          _sum: { amount: true }
        }),
        
        // This month's expenses
        prisma.expense.aggregate({
          where: {
            userId,
            transactionDate: { gte: startOfMonth }
          },
          _sum: { amount: true }
        }),
        
        // Last month's expenses for comparison
        prisma.expense.aggregate({
          where: {
            userId,
            transactionDate: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          },
          _sum: { amount: true }
        }),
        
        // Count by status
        prisma.expense.groupBy({
          by: ['status'],
          where: { userId },
          _count: { status: true }
        }),
        
        // Average expense amount
        prisma.expense.aggregate({
          where: { userId },
          _avg: { amount: true }
        })
      ]);

      // Calculate monthly change percentage
      const currentMonth = monthlyExpenses._sum.amount || 0;
      const lastMonth = lastMonthExpenses._sum.amount || 0;
      const monthlyChange = lastMonth > 0 
        ? ((currentMonth - lastMonth) / lastMonth) * 100
        : 0;

      // Format status counts
      const statusMap = statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          totalExpenses: totalExpenses._sum.amount || 0,
          monthlyTotal: currentMonth,
          pendingCount: statusMap.PENDING_APPROVAL || 0,
          approvedCount: statusMap.APPROVED || 0,
          averageAmount: avgAmount._avg.amount || 0,
          monthlyChange: Math.round(monthlyChange * 100) / 100
        }
      });

    } catch (error) {
      console.error('Error fetching expense stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expense statistics'
      });
    }
  }
);

/**
 * Create new expense with file uploads and OCR processing
 * POST /api/expenses
 */
router.post('/',
  authMiddleware,
  upload.array('files', 10),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('currency').isString().withMessage('Currency is required'),
    body('transactionDate').isISO8601().withMessage('Valid transaction date is required'),
    body('categoryId').isString().withMessage('Category is required'),
    body('merchantName').optional().isString(),
    body('description').optional().isString(),
    body('projectId').optional().isString(),
    body('costCenter').optional().isString(),
    body('receiptNumber').optional().isString(),
    body('isReimbursable').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        title,
        amount,
        currency,
        transactionDate,
        categoryId,
        merchantName,
        description,
        projectId,
        costCenter,
        receiptNumber,
        isReimbursable = true
      } = req.body;

      const userId = req.user.id;
      const companyId = req.user.companyId;

      // Verify category belongs to company
      const category = await prisma.expenseCategory.findFirst({
        where: {
          id: categoryId,
          companyId
        }
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }

      // Process uploaded files
      const documents = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const fileDataKey = `fileData_${i}`;
          const fileData = req.body[fileDataKey] ? JSON.parse(req.body[fileDataKey]) : {};

          try {
            // Create document record
            const document = await prisma.document.create({
              data: {
                fileName: file.originalname,
                filePath: file.path,
                mimeType: file.mimetype,
                fileSize: file.size,
                companyId,
                uploadedBy: userId,
                type: 'RECEIPT',
                extractedData: fileData.ocrData || {},
                validationResults: fileData.validationResults || {},
                processingStatus: 'COMPLETED'
              }
            });

            documents.push(document);
          } catch (error) {
            console.error('Error creating document:', error);
          }
        }
      }

      // Create expense
      const expense = await prisma.expense.create({
        data: {
          title,
          description,
          amount: parseFloat(amount),
          currency,
          transactionDate: new Date(transactionDate),
          categoryId,
          merchantName,
          receiptNumber,
          isReimbursable,
          status: 'SUBMITTED',
          companyId,
          userId,
          documentId: documents.length > 0 ? documents[0].id : null
        },
        include: {
          category: true,
          document: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Link additional documents
      if (documents.length > 1) {
        await Promise.all(
          documents.slice(1).map(doc =>
            prisma.document.update({
              where: { id: doc.id },
              data: { relatedExpenseId: expense.id }
            })
          )
        );
      }

      // Submit for approval if auto-approval is not applicable
      // This would integrate with the approval workflow system

      res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        data: expense
      });

    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create expense'
      });
    }
  }
);

/**
 * Get expense by ID
 * GET /api/expenses/:id
 */
router.get('/:id',
  authMiddleware,
  [param('id').isString().withMessage('Valid expense ID is required')],
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const expense = await prisma.expense.findFirst({
        where: {
          id,
          userId // Ensure user can only access their own expenses
        },
        include: {
          category: true,
          document: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          approvalInstance: {
            include: {
              workflow: true,
              stepRecords: {
                include: {
                  approver: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                },
                orderBy: {
                  stepOrder: 'asc'
                }
              }
            }
          }
        }
      });

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      res.json({
        success: true,
        data: expense
      });

    } catch (error) {
      console.error('Error fetching expense:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expense'
      });
    }
  }
);

/**
 * Update expense
 * PUT /api/expenses/:id
 */
router.put('/:id',
  authMiddleware,
  [
    param('id').isString().withMessage('Valid expense ID is required'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('currency').optional().isString(),
    body('transactionDate').optional().isISO8601(),
    body('categoryId').optional().isString(),
    body('merchantName').optional().isString(),
    body('description').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      // Check if expense exists and belongs to user
      const existingExpense = await prisma.expense.findFirst({
        where: { id, userId }
      });

      if (!existingExpense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Check if expense can be updated (only drafts and rejected expenses)
      if (!['DRAFT', 'REJECTED'].includes(existingExpense.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update expense in current status'
        });
      }

      // Update expense
      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          ...updateData,
          amount: updateData.amount ? parseFloat(updateData.amount) : undefined,
          transactionDate: updateData.transactionDate ? new Date(updateData.transactionDate) : undefined,
          updatedAt: new Date()
        },
        include: {
          category: true,
          document: true
        }
      });

      res.json({
        success: true,
        message: 'Expense updated successfully',
        data: updatedExpense
      });

    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update expense'
      });
    }
  }
);

/**
 * Delete expense
 * DELETE /api/expenses/:id
 */
router.delete('/:id',
  authMiddleware,
  [param('id').isString().withMessage('Valid expense ID is required')],
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if expense exists and belongs to user
      const expense = await prisma.expense.findFirst({
        where: { id, userId },
        include: { document: true }
      });

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Check if expense can be deleted
      if (!['DRAFT', 'REJECTED'].includes(expense.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete expense in current status'
        });
      }

      // Delete associated files
      if (expense.document && expense.document.filePath) {
        try {
          await fs.unlink(expense.document.filePath);
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
        }
      }

      // Delete expense (cascade will handle related records)
      await prisma.expense.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Expense deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete expense'
      });
    }
  }
);

/**
 * Process OCR for uploaded file
 * POST /api/expenses/process-ocr
 */
router.post('/process-ocr',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const filePath = req.file.path;

      // Process with OCR
      const ocrResult = await tesseract.recognize(filePath, {
        lang: 'eng+pol',
        oem: 1,
        psm: 3,
      });

      // Extract structured data
      const extractedData = extractDataFromOCR(ocrResult);

      // Validate image quality
      const validationResults = await validateImageQuality(filePath);

      // Clean up temporary file
      await fs.unlink(filePath);

      res.json({
        success: true,
        data: {
          rawText: ocrResult,
          extractedData,
          validationResults
        }
      });

    } catch (error) {
      console.error('Error processing OCR:', error);
      
      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to process OCR'
      });
    }
  }
);

// Helper functions
function extractDataFromOCR(text) {
  const data = {};

  // Extract amount with currency
  const amountRegex = /(\d+[.,]\d{2})\s*(PLN|zł|EUR|€|USD|\$)/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch) {
    data.amount = parseFloat(amountMatch[1].replace(',', '.'));
    data.currency = amountMatch[2].toUpperCase().replace('ZŁ', 'PLN');
  }

  // Extract date
  const dateRegex = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    data.transactionDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Extract merchant name (first meaningful line)
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length > 0) {
    data.merchantName = lines[0];
  }

  // Extract receipt number
  const receiptRegex = /(?:paragon|faktura|receipt)?\s*(?:nr|no|#)?\s*:?\s*([A-Z0-9\-\/]+)/i;
  const receiptMatch = text.match(receiptRegex);
  if (receiptMatch) {
    data.receiptNumber = receiptMatch[1];
  }

  return data;
}

async function validateImageQuality(filePath) {
  try {
    const image = await Jimp.read(filePath);
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Basic quality checks
    const quality = {
      resolution: { width, height },
      isGoodResolution: width >= 800 && height >= 600,
      aspectRatio: height / width,
      isReceiptShape: (height / width) > 1.2, // Receipts are usually tall
    };

    return quality;
  } catch (error) {
    console.error('Error validating image quality:', error);
    return { error: 'Failed to validate image quality' };
  }
}

module.exports = router; 