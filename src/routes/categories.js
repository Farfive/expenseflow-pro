/**
 * Categories Routes
 * 
 * Manages expense categories for the company
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleAuth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Get all categories for the company
 * GET /api/categories
 */
router.get('/',
  authMiddleware,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;

      const categories = await prisma.expenseCategory.findMany({
        where: {
          companyId,
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  }
);

/**
 * Create new category
 * POST /api/categories
 */
router.post('/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  [
    body('name').notEmpty().withMessage('Category name is required'),
    body('description').optional().isString(),
    body('color').isHexColor().withMessage('Valid hex color is required'),
    body('icon').optional().isString()
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

      const { name, description, color, icon } = req.body;
      const companyId = req.user.companyId;

      // Check if category with same name exists
      const existingCategory = await prisma.expenseCategory.findFirst({
        where: {
          name,
          companyId,
          isActive: true
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      const category = await prisma.expenseCategory.create({
        data: {
          name,
          description,
          color,
          icon: icon || name.charAt(0).toUpperCase(),
          companyId,
          isActive: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });

    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category'
      });
    }
  }
);

/**
 * Update category
 * PUT /api/categories/:id
 */
router.put('/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  [
    param('id').isString().withMessage('Valid category ID is required'),
    body('name').optional().notEmpty().withMessage('Category name cannot be empty'),
    body('description').optional().isString(),
    body('color').optional().isHexColor().withMessage('Valid hex color is required'),
    body('icon').optional().isString()
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
      const companyId = req.user.companyId;
      const updateData = req.body;

      // Verify category exists and belongs to company
      const existingCategory = await prisma.expenseCategory.findFirst({
        where: { id, companyId }
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check for name conflicts if name is being updated
      if (updateData.name && updateData.name !== existingCategory.name) {
        const nameConflict = await prisma.expenseCategory.findFirst({
          where: {
            name: updateData.name,
            companyId,
            isActive: true,
            id: { not: id }
          }
        });

        if (nameConflict) {
          return res.status(400).json({
            success: false,
            message: 'Category with this name already exists'
          });
        }
      }

      const updatedCategory = await prisma.expenseCategory.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: updatedCategory
      });

    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category'
      });
    }
  }
);

/**
 * Delete category (soft delete)
 * DELETE /api/categories/:id
 */
router.delete('/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  [param('id').isString().withMessage('Valid category ID is required')],
  async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verify category exists and belongs to company
      const category = await prisma.expenseCategory.findFirst({
        where: { id, companyId }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if category is in use
      const expenseCount = await prisma.expense.count({
        where: { categoryId: id }
      });

      if (expenseCount > 0) {
        // Soft delete if category is in use
        await prisma.expenseCategory.update({
          where: { id },
          data: { isActive: false }
        });

        res.json({
          success: true,
          message: 'Category deactivated successfully (expenses exist with this category)'
        });
      } else {
        // Hard delete if no expenses use this category
        await prisma.expenseCategory.delete({
          where: { id }
        });

        res.json({
          success: true,
          message: 'Category deleted successfully'
        });
      }

    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category'
      });
    }
  }
);

/**
 * Get category with usage statistics
 * GET /api/categories/:id/stats
 */
router.get('/:id/stats',
  authMiddleware,
  [param('id').isString().withMessage('Valid category ID is required')],
  async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verify category exists and belongs to company
      const category = await prisma.expenseCategory.findFirst({
        where: { id, companyId }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Get usage statistics
      const [
        totalExpenses,
        totalAmount,
        monthlyStats,
        recentExpenses
      ] = await Promise.all([
        // Total number of expenses in this category
        prisma.expense.count({
          where: { categoryId: id }
        }),

        // Total amount spent in this category
        prisma.expense.aggregate({
          where: { categoryId: id },
          _sum: { amount: true }
        }),

        // Monthly breakdown for the last 6 months
        prisma.expense.groupBy({
          by: ['transactionDate'],
          where: {
            categoryId: id,
            transactionDate: {
              gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
            }
          },
          _count: { id: true },
          _sum: { amount: true }
        }),

        // Recent expenses in this category
        prisma.expense.findMany({
          where: { categoryId: id },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      res.json({
        success: true,
        data: {
          category,
          stats: {
            totalExpenses,
            totalAmount: totalAmount._sum.amount || 0,
            monthlyStats,
            recentExpenses
          }
        }
      });

    } catch (error) {
      console.error('Error fetching category stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category statistics'
      });
    }
  }
);

module.exports = router; 