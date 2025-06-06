/**
 * Projects Routes
 * 
 * Manages projects and cost centers for expense assignment
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roleAuth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Get all projects for the company
 * GET /api/projects
 */
router.get('/',
  authMiddleware,
  async (req, res) => {
    try {
      const companyId = req.user.companyId;

      const projects = await prisma.project.findMany({
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
        data: projects
      });

    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch projects'
      });
    }
  }
);

/**
 * Create new project
 * POST /api/projects
 */
router.post('/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  [
    body('name').notEmpty().withMessage('Project name is required'),
    body('code').notEmpty().withMessage('Project code is required'),
    body('description').optional().isString(),
    body('budget').optional().isFloat({ min: 0 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601()
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

      const { name, code, description, budget, startDate, endDate } = req.body;
      const companyId = req.user.companyId;

      // Check if project with same code exists
      const existingProject = await prisma.project.findFirst({
        where: {
          code,
          companyId,
          isActive: true
        }
      });

      if (existingProject) {
        return res.status(400).json({
          success: false,
          message: 'Project with this code already exists'
        });
      }

      const project = await prisma.project.create({
        data: {
          name,
          code: code.toUpperCase(),
          description,
          budget: budget ? parseFloat(budget) : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          companyId,
          isActive: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project
      });

    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create project'
      });
    }
  }
);

/**
 * Update project
 * PUT /api/projects/:id
 */
router.put('/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  [
    param('id').isString().withMessage('Valid project ID is required'),
    body('name').optional().notEmpty().withMessage('Project name cannot be empty'),
    body('code').optional().notEmpty().withMessage('Project code cannot be empty'),
    body('description').optional().isString(),
    body('budget').optional().isFloat({ min: 0 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601()
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
      let updateData = { ...req.body };

      // Convert code to uppercase if provided
      if (updateData.code) {
        updateData.code = updateData.code.toUpperCase();
      }

      // Convert budget to float if provided
      if (updateData.budget) {
        updateData.budget = parseFloat(updateData.budget);
      }

      // Convert dates if provided
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      // Verify project exists and belongs to company
      const existingProject = await prisma.project.findFirst({
        where: { id, companyId }
      });

      if (!existingProject) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check for code conflicts if code is being updated
      if (updateData.code && updateData.code !== existingProject.code) {
        const codeConflict = await prisma.project.findFirst({
          where: {
            code: updateData.code,
            companyId,
            isActive: true,
            id: { not: id }
          }
        });

        if (codeConflict) {
          return res.status(400).json({
            success: false,
            message: 'Project with this code already exists'
          });
        }
      }

      const updatedProject = await prisma.project.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Project updated successfully',
        data: updatedProject
      });

    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project'
      });
    }
  }
);

/**
 * Delete project (soft delete)
 * DELETE /api/projects/:id
 */
router.delete('/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  [param('id').isString().withMessage('Valid project ID is required')],
  async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verify project exists and belongs to company
      const project = await prisma.project.findFirst({
        where: { id, companyId }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check if project is in use
      const expenseCount = await prisma.expense.count({
        where: { projectId: id }
      });

      if (expenseCount > 0) {
        // Soft delete if project is in use
        await prisma.project.update({
          where: { id },
          data: { isActive: false }
        });

        res.json({
          success: true,
          message: 'Project deactivated successfully (expenses exist for this project)'
        });
      } else {
        // Hard delete if no expenses use this project
        await prisma.project.delete({
          where: { id }
        });

        res.json({
          success: true,
          message: 'Project deleted successfully'
        });
      }

    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project'
      });
    }
  }
);

/**
 * Get project with usage statistics
 * GET /api/projects/:id/stats
 */
router.get('/:id/stats',
  authMiddleware,
  [param('id').isString().withMessage('Valid project ID is required')],
  async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verify project exists and belongs to company
      const project = await prisma.project.findFirst({
        where: { id, companyId }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Get usage statistics
      const [
        totalExpenses,
        totalAmount,
        budgetUtilization,
        categoryBreakdown,
        recentExpenses
      ] = await Promise.all([
        // Total number of expenses for this project
        prisma.expense.count({
          where: { projectId: id }
        }),

        // Total amount spent on this project
        prisma.expense.aggregate({
          where: { projectId: id },
          _sum: { amount: true }
        }),

        // Budget utilization (if budget is set)
        project.budget ? prisma.expense.aggregate({
          where: {
            projectId: id,
            status: { in: ['APPROVED', 'PAID'] }
          },
          _sum: { amount: true }
        }) : null,

        // Breakdown by category
        prisma.expense.groupBy({
          by: ['categoryId'],
          where: { projectId: id },
          _count: { id: true },
          _sum: { amount: true },
          include: {
            category: {
              select: { name: true, color: true }
            }
          }
        }),

        // Recent expenses for this project
        prisma.expense.findMany({
          where: { projectId: id },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            category: {
              select: {
                name: true,
                color: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      const spentAmount = totalAmount._sum.amount || 0;
      const approvedAmount = budgetUtilization?._sum.amount || 0;

      res.json({
        success: true,
        data: {
          project,
          stats: {
            totalExpenses,
            totalAmount: spentAmount,
            approvedAmount,
            budget: project.budget,
            budgetUtilization: project.budget ? (approvedAmount / project.budget) * 100 : null,
            remainingBudget: project.budget ? project.budget - approvedAmount : null,
            categoryBreakdown,
            recentExpenses
          }
        }
      });

    } catch (error) {
      console.error('Error fetching project stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project statistics'
      });
    }
  }
);

/**
 * Get projects with budget warnings
 * GET /api/projects/budget-warnings
 */
router.get('/budget-warnings',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER', 'FINANCE']),
  async (req, res) => {
    try {
      const companyId = req.user.companyId;

      // Get projects with budgets
      const projectsWithBudgets = await prisma.project.findMany({
        where: {
          companyId,
          isActive: true,
          budget: { not: null }
        }
      });

      const warnings = [];

      for (const project of projectsWithBudgets) {
        const spent = await prisma.expense.aggregate({
          where: {
            projectId: project.id,
            status: { in: ['APPROVED', 'PAID'] }
          },
          _sum: { amount: true }
        });

        const spentAmount = spent._sum.amount || 0;
        const utilization = (spentAmount / project.budget) * 100;

        if (utilization >= 80) { // 80% threshold for warnings
          warnings.push({
            project,
            spentAmount,
            budget: project.budget,
            utilization: Math.round(utilization * 100) / 100,
            remainingBudget: project.budget - spentAmount,
            warningLevel: utilization >= 100 ? 'exceeded' : utilization >= 90 ? 'critical' : 'warning'
          });
        }
      }

      res.json({
        success: true,
        data: warnings.sort((a, b) => b.utilization - a.utilization)
      });

    } catch (error) {
      console.error('Error fetching budget warnings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch budget warnings'
      });
    }
  }
);

module.exports = router; 