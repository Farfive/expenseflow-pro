const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const CategorizationService = require('../services/categorizationService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();
const categorizationService = new CategorizationService();

// Rate limiting
const categorizationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many categorization requests, please try again later'
});

// Apply rate limiting and auth to all routes
router.use(categorizationLimit);
router.use(auth);

// ========================================
// Category Management Routes
// ========================================

/**
 * GET /api/categorization/categories
 * Get all categories for a company
 */
router.get('/categories', [
  query('includeStats').optional().isBoolean(),
  query('days').optional().isInt({ min: 1, max: 365 })
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
    const { includeStats = false, days = 30 } = req.query;

    // Get categories
    const categories = await prisma.expenseCategory.findMany({
      where: { 
        companyId,
        isActive: true
      },
      include: {
        _count: {
          select: {
            expenses: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    let result = {
      success: true,
      categories
    };

    // Include statistics if requested
    if (includeStats) {
      const stats = await categorizationService.getCategorizationStats(companyId, parseInt(days));
      result.statistics = stats;
    }

    res.json(result);

  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

/**
 * POST /api/categorization/categories
 * Create a new category
 */
router.post('/categories', [
  body('name').notEmpty().isLength({ min: 1, max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('defaultVatRate').optional().isFloat({ min: 0, max: 100 }),
  body('keywords').optional().isArray(),
  body('taxCategory').optional().isString(),
  body('accountingCode').optional().isString()
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
    const { name, description, color, defaultVatRate, keywords, taxCategory, accountingCode } = req.body;

    // Check if category already exists
    const existingCategory = await prisma.expenseCategory.findFirst({
      where: {
        companyId,
        name: name.toLowerCase()
      }
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Create category
    const category = await prisma.expenseCategory.create({
      data: {
        companyId,
        name: name.toLowerCase(),
        description,
        color,
        defaultVatRate,
        metadata: {
          keywords: keywords || [],
          taxCategory,
          accountingCode
        }
      }
    });

    // Add keywords to ML system if provided
    if (keywords && keywords.length > 0) {
      for (const keyword of keywords) {
        await prisma.categoryKeyword.create({
          data: {
            keyword: keyword.toLowerCase(),
            category: category.name,
            companyId,
            weight: 1.0
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      category
    });

  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
});

/**
 * PUT /api/categorization/categories/:id
 * Update a category
 */
router.put('/categories/:id', [
  param('id').isString(),
  body('name').optional().isLength({ min: 1, max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('defaultVatRate').optional().isFloat({ min: 0, max: 100 }),
  body('keywords').optional().isArray(),
  body('taxCategory').optional().isString(),
  body('accountingCode').optional().isString()
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
    const { name, description, color, defaultVatRate, keywords, taxCategory, accountingCode } = req.body;

    // Check if category exists and belongs to company
    const existingCategory = await prisma.expenseCategory.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update category
    const updatedCategory = await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(name && { name: name.toLowerCase() }),
        description,
        color,
        defaultVatRate,
        metadata: {
          ...existingCategory.metadata,
          ...(keywords && { keywords }),
          ...(taxCategory && { taxCategory }),
          ...(accountingCode && { accountingCode })
        }
      }
    });

    // Update keywords if provided
    if (keywords) {
      // Remove old keywords
      await prisma.categoryKeyword.deleteMany({
        where: {
          category: existingCategory.name,
          companyId
        }
      });

      // Add new keywords
      for (const keyword of keywords) {
        await prisma.categoryKeyword.create({
          data: {
            keyword: keyword.toLowerCase(),
            category: updatedCategory.name,
            companyId,
            weight: 1.0
          }
        });
      }
    }

    res.json({
      success: true,
      category: updatedCategory
    });

  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
});

/**
 * DELETE /api/categorization/categories/:id
 * Delete a category
 */
router.delete('/categories/:id', [
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

    // Check if category exists and belongs to company
    const category = await prisma.expenseCategory.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        _count: {
          select: {
            expenses: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Don't allow deletion if category has expenses
    if (category._count.expenses > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete category with existing expenses'
      });
    }

    // Delete related keywords
    await prisma.categoryKeyword.deleteMany({
      where: {
        category: category.name,
        companyId
      }
    });

    // Delete category
    await prisma.expenseCategory.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
});

// ========================================
// Categorization Routes
// ========================================

/**
 * POST /api/categorization/categorize
 * Categorize a document or expense data
 */
router.post('/categorize', [
  body('vendor').optional().isString(),
  body('description').optional().isString(),
  body('extractedText').optional().isString(),
  body('amount').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { vendor, description, extractedText, amount } = req.body;
    const { companyId } = req.user;

    // Ensure categorization service is initialized
    if (!categorizationService.isInitialized) {
      await categorizationService.initialize();
    }

    // Categorize the document
    const result = await categorizationService.categorizeDocument({
      vendor,
      description,
      extractedText,
      amount
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Error categorizing document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to categorize document'
    });
  }
});

/**
 * POST /api/categorization/learn
 * Learn from user correction
 */
router.post('/learn', [
  body('vendor').optional().isString(),
  body('description').optional().isString(),
  body('extractedText').optional().isString(),
  body('amount').optional().isFloat({ min: 0 }),
  body('userCategory').notEmpty().isString(),
  body('originalPrediction').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { vendor, description, extractedText, amount, userCategory, originalPrediction } = req.body;
    const { companyId } = req.user;

    // Verify category exists
    const category = await prisma.expenseCategory.findFirst({
      where: {
        name: userCategory.toLowerCase(),
        companyId
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Learn from correction
    const result = await categorizationService.learnFromCorrection({
      vendor,
      description,
      extractedText,
      amount
    }, userCategory.toLowerCase(), companyId);

    res.json({
      success: true,
      message: 'Learning applied successfully',
      ...result
    });

  } catch (error) {
    logger.error('Error learning from correction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply learning'
    });
  }
});

/**
 * POST /api/categorization/batch-categorize
 * Categorize multiple documents in batch
 */
router.post('/batch-categorize', [
  body('documents').isArray({ min: 1, max: 50 }),
  body('documents.*.vendor').optional().isString(),
  body('documents.*.description').optional().isString(),
  body('documents.*.extractedText').optional().isString(),
  body('documents.*.amount').optional().isFloat({ min: 0 }),
  body('documents.*.id').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { documents } = req.body;
    const { companyId } = req.user;

    // Ensure categorization service is initialized
    if (!categorizationService.isInitialized) {
      await categorizationService.initialize();
    }

    // Batch categorize documents
    const results = await categorizationService.batchCategorize(documents);

    res.json({
      success: true,
      results
    });

  } catch (error) {
    logger.error('Error batch categorizing documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to categorize documents'
    });
  }
});

// ========================================
// Vendor Management Routes
// ========================================

/**
 * GET /api/categorization/vendors
 * Get known vendors and their categories
 */
router.get('/vendors', [
  query('search').optional().isString(),
  query('category').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
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
    const { search, category, page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    const where = {
      OR: [
        { companyId },
        { companyId: null } // Global vendors
      ]
    };

    if (search) {
      where.vendorName = {
        contains: search,
        mode: 'insensitive'
      };
    }

    if (category) {
      where.category = category.toLowerCase();
    }

    const [vendors, total] = await Promise.all([
      prisma.vendorCategory.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [
          { usageCount: 'desc' },
          { vendorName: 'asc' }
        ]
      }),
      prisma.vendorCategory.count({ where })
    ]);

    res.json({
      success: true,
      vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors'
    });
  }
});

/**
 * POST /api/categorization/vendors
 * Add or update vendor category mapping
 */
router.post('/vendors', [
  body('vendorName').notEmpty().isString(),
  body('category').notEmpty().isString(),
  body('confidence').optional().isFloat({ min: 0, max: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { vendorName, category, confidence = 1.0 } = req.body;
    const { companyId } = req.user;

    const normalizedVendor = vendorName.toLowerCase().trim();

    // Verify category exists
    const categoryExists = await prisma.expenseCategory.findFirst({
      where: {
        name: category.toLowerCase(),
        companyId
      }
    });

    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Create or update vendor mapping
    const vendor = await prisma.vendorCategory.upsert({
      where: {
        normalizedVendor_companyId: {
          normalizedVendor,
          companyId
        }
      },
      update: {
        category: category.toLowerCase(),
        confidence,
        usageCount: { increment: 1 },
        lastUsed: new Date(),
        isVerified: true
      },
      create: {
        vendorName,
        normalizedVendor,
        category: category.toLowerCase(),
        companyId,
        confidence,
        isVerified: true
      }
    });

    res.json({
      success: true,
      vendor
    });

  } catch (error) {
    logger.error('Error managing vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage vendor'
    });
  }
});

// ========================================
// Analytics and Insights Routes
// ========================================

/**
 * GET /api/categorization/insights
 * Get categorization insights and analytics
 */
router.get('/insights', [
  query('days').optional().isInt({ min: 1, max: 365 })
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
    const { days = 30 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    // Get categorization statistics
    const [
      categoryStats,
      confidenceStats,
      learningData,
      topVendors
    ] = await Promise.all([
      // Category distribution
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
          companyId,
          createdAt: { gte: since }
        },
        _count: true,
        _sum: { amount: true }
      }),
      
      // Confidence level distribution
      prisma.document.groupBy({
        by: ['status'],
        where: {
          companyId,
          createdAt: { gte: since },
          confidenceScore: { not: null }
        },
        _count: true,
        _avg: { confidenceScore: true }
      }),
      
      // Learning data
      prisma.categorizationLearning.count({
        where: {
          companyId,
          createdAt: { gte: since }
        }
      }),
      
      // Top vendors by usage
      prisma.vendorCategory.findMany({
        where: {
          OR: [
            { companyId },
            { companyId: null }
          ],
          lastUsed: { gte: since }
        },
        orderBy: { usageCount: 'desc' },
        take: 10
      })
    ]);

    // Get category details
    const categoryIds = categoryStats.map(stat => stat.categoryId).filter(Boolean);
    const categories = await prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } }
    });
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    // Format category stats
    const formattedCategoryStats = categoryStats.map(stat => ({
      category: categoryMap.get(stat.categoryId),
      count: stat._count,
      totalAmount: stat._sum.amount
    }));

    res.json({
      success: true,
      insights: {
        categoryDistribution: formattedCategoryStats,
        confidenceStats,
        learningCount: learningData,
        topVendors,
        period: {
          days: parseInt(days),
          from: since.toISOString(),
          to: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights'
    });
  }
});

/**
 * GET /api/categorization/suggestions
 * Get category suggestions for company
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { companyId } = req.user;

    const suggestions = await categorizationService.getCategorySuggestions(companyId);

    res.json({
      success: true,
      ...suggestions
    });

  } catch (error) {
    logger.error('Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suggestions'
    });
  }
});

/**
 * POST /api/categorization/create-defaults
 * Create default categories for company
 */
router.post('/create-defaults', async (req, res) => {
  try {
    const { companyId } = req.user;

    const categories = await categorizationService.createDefaultCategories(companyId);

    res.json({
      success: true,
      message: 'Default categories created successfully',
      categories
    });

  } catch (error) {
    logger.error('Error creating default categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create default categories'
    });
  }
});

module.exports = router; 