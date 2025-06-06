const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireCompanyAccess } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const AnalyticsService = require('../services/analyticsService');
const ReportGenerationService = require('../services/reportGenerationService');
const rateLimit = require('express-rate-limit');

const prisma = new PrismaClient();
const analyticsService = new AnalyticsService();
const reportService = new ReportGenerationService();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many analytics requests from this IP, please try again later.'
});

// Apply rate limiting to all routes
router.use(analyticsLimiter);

/**
 * GET /api/analytics/overview
 * Get comprehensive expense analytics overview
 */
router.get('/overview', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0],
      category,
      vendor,
      employeeId,
      projectId
    } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (vendor) filters.vendor = vendor;
    if (employeeId) filters.employeeId = employeeId;
    if (projectId) filters.projectId = projectId;

    const analytics = await analyticsService.getExpenseAnalytics(companyId, dateFrom, dateTo, filters);

    res.json({
      success: true,
      data: analytics,
      period: { dateFrom, dateTo },
      filters
    });

  } catch (error) {
    console.error('Error getting analytics overview:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve analytics overview',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/kpis
 * Get KPI metrics for dashboard widgets
 */
router.get('/kpis', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0]
    } = req.query;

    const kpis = await analyticsService.getKPIMetrics(companyId, dateFrom, dateTo);

    res.json({
      success: true,
      data: kpis,
      period: { dateFrom, dateTo }
    });

  } catch (error) {
    console.error('Error getting KPI metrics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve KPI metrics',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/trends
 * Get expense trends over time
 */
router.get('/trends', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0],
      category,
      vendor
    } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (vendor) filters.vendor = vendor;

    const trends = await analyticsService.calculateExpenseTrends(companyId, dateFrom, dateTo, filters);

    res.json({
      success: true,
      data: trends,
      period: { dateFrom, dateTo },
      filters
    });

  } catch (error) {
    console.error('Error getting expense trends:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve expense trends',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/categories
 * Get category breakdown analysis
 */
router.get('/categories', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0]
    } = req.query;

    const analytics = await analyticsService.getExpenseAnalytics(companyId, dateFrom, dateTo);

    res.json({
      success: true,
      data: analytics.categoryBreakdown,
      period: { dateFrom, dateTo }
    });

  } catch (error) {
    console.error('Error getting category breakdown:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve category breakdown',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/vendors
 * Get vendor spending analysis
 */
router.get('/vendors', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0],
      limit = 50
    } = req.query;

    const analytics = await analyticsService.getExpenseAnalytics(companyId, dateFrom, dateTo);
    const vendors = analytics.vendorAnalysis.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: vendors,
      period: { dateFrom, dateTo }
    });

  } catch (error) {
    console.error('Error getting vendor analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve vendor analysis',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/budget-tracking
 * Get budget vs actual analysis
 */
router.get('/budget-tracking', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0]
    } = req.query;

    const budgetTracking = await analyticsService.getBudgetTracking(companyId, dateFrom, dateTo);

    res.json({
      success: true,
      data: budgetTracking,
      period: { dateFrom, dateTo }
    });

  } catch (error) {
    console.error('Error getting budget tracking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve budget tracking',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/tax-deductible
 * Get tax-deductible expense analysis
 */
router.get('/tax-deductible', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0]
    } = req.query;

    const analytics = await analyticsService.getExpenseAnalytics(companyId, dateFrom, dateTo);

    res.json({
      success: true,
      data: analytics.taxDeductible,
      period: { dateFrom, dateTo }
    });

  } catch (error) {
    console.error('Error getting tax-deductible analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve tax-deductible analysis',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/departments
 * Get department spending analysis
 */
router.get('/departments', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0]
    } = req.query;

    const analytics = await analyticsService.getExpenseAnalytics(companyId, dateFrom, dateTo);

    res.json({
      success: true,
      data: analytics.departmentAnalysis,
      period: { dateFrom, dateTo }
    });

  } catch (error) {
    console.error('Error getting department analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve department analysis',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/projects
 * Get project spending analysis
 */
router.get('/projects', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0]
    } = req.query;

    const analytics = await analyticsService.getExpenseAnalytics(companyId, dateFrom, dateTo);

    res.json({
      success: true,
      data: analytics.projectAnalysis,
      period: { dateFrom, dateTo }
    });

  } catch (error) {
    console.error('Error getting project analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve project analysis',
      error: error.message 
    });
  }
});

/**
 * POST /api/analytics/comparative
 * Get comparative analysis (period-over-period)
 */
router.post('/comparative', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      currentPeriod: { dateFrom: currentStart, dateTo: currentEnd },
      previousPeriod: { dateFrom: previousStart, dateTo: previousEnd }
    } = req.body;

    const [currentData, previousData] = await Promise.all([
      analyticsService.getExpenseAnalytics(companyId, currentStart, currentEnd),
      analyticsService.getExpenseAnalytics(companyId, previousStart, previousEnd)
    ]);

    // Calculate comparisons
    const comparison = {
      totalAmount: {
        current: currentData.summary.totalAmount,
        previous: previousData.summary.totalAmount,
        change: analyticsService.calculateGrowth(currentData.summary.totalAmount, previousData.summary.totalAmount)
      },
      totalTransactions: {
        current: currentData.summary.totalTransactions,
        previous: previousData.summary.totalTransactions,
        change: analyticsService.calculateGrowth(currentData.summary.totalTransactions, previousData.summary.totalTransactions)
      },
      averageAmount: {
        current: currentData.summary.averageAmount,
        previous: previousData.summary.averageAmount,
        change: analyticsService.calculateGrowth(currentData.summary.averageAmount, previousData.summary.averageAmount)
      }
    };

    res.json({
      success: true,
      data: {
        current: currentData,
        previous: previousData,
        comparison
      }
    });

  } catch (error) {
    console.error('Error getting comparative analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve comparative analysis',
      error: error.message 
    });
  }
});

/**
 * POST /api/analytics/reports/generate
 * Generate expense report (PDF or Excel)
 */
router.post('/reports/generate', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const reportOptions = {
      ...req.body,
      userId
    };

    const report = await reportService.generateExpenseReport(companyId, reportOptions);

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate report',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/reports
 * Get list of generated reports
 */
router.get('/reports', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      page = 1, 
      limit = 20,
      type,
      format 
    } = req.query;

    const where = { companyId };
    if (type) where.type = type;
    if (format) where.format = format;

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        generatedBy: {
          select: { name: true, email: true }
        }
      }
    });

    const total = await prisma.report.count({ where });

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error getting reports list:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve reports',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/reports/download/:reportId
 * Download generated report
 */
router.get('/reports/download/:reportId', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { reportId } = req.params;

    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        companyId
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const filePath = report.filePath;
    const fileName = path.basename(filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Report file not found'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', report.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to download report',
      error: error.message 
    });
  }
});

/**
 * DELETE /api/analytics/reports/:reportId
 * Delete a generated report
 */
router.delete('/reports/:reportId', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { reportId } = req.params;

    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        companyId
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Delete the file if it exists
    if (fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }

    // Delete the database record
    await prisma.report.delete({
      where: { id: reportId }
    });

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete report',
      error: error.message 
    });
  }
});

/**
 * GET /api/analytics/export-data
 * Export raw analytics data for external analysis
 */
router.get('/export-data', authenticateToken, requireCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0],
      format = 'json' // json, csv
    } = req.query;

    const analytics = await analyticsService.getExpenseAnalytics(companyId, dateFrom, dateTo);

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCsv(analytics.expenses);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="expense-data-${Date.now()}.csv"`);
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: analytics,
        exportedAt: new Date(),
        period: { dateFrom, dateTo }
      });
    }

  } catch (error) {
    console.error('Error exporting analytics data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export analytics data',
      error: error.message 
    });
  }
});

/**
 * Helper function to convert data to CSV
 */
function convertToCsv(expenses) {
  const headers = ['Date', 'Vendor', 'Category', 'Amount', 'Employee', 'Department', 'Description', 'Tax Deductible'];
  const csvRows = [headers.join(',')];

  expenses.forEach(expense => {
    const row = [
      new Date(expense.date).toLocaleDateString(),
      `"${expense.vendor || 'N/A'}"`,
      `"${expense.category || 'N/A'}"`,
      expense.amount,
      `"${expense.employee?.name || 'N/A'}"`,
      `"${expense.employee?.department || 'N/A'}"`,
      `"${expense.description || 'N/A'}"`,
      expense.isTaxDeductible ? 'Yes' : 'No'
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

module.exports = router; 