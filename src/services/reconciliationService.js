/**
 * Reconciliation Service
 * 
 * Generates reconciliation reports showing matched/unmatched items,
 * provides comprehensive statistics, and creates various report formats.
 */

const { PrismaClient } = require('@prisma/client');
const _ = require('lodash');
const { create, all } = require('mathjs');
const ExcelJS = require('exceljs');
const fs = require('fs-extra');
const path = require('path');
const { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } = require('date-fns');

const math = create(all);
const prisma = new PrismaClient();

class ReconciliationService {
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'uploads', 'reports');
    this.ensureReportsDirectory();
  }

  /**
   * Ensure reports directory exists
   */
  async ensureReportsDirectory() {
    await fs.ensureDir(this.reportsDir);
  }

  /**
   * Generate comprehensive reconciliation report
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID generating the report
   * @param {Object} options - Report options
   * @returns {Object} Generated report
   */
  async generateReconciliationReport(companyId, userId, options = {}) {
    const startTime = Date.now();

    // Set default date range
    const { periodStart, periodEnd, reportType = 'MONTHLY', format = 'EXCEL' } = options;
    const dateRange = this.calculateDateRange(periodStart, periodEnd, reportType);

    console.log(`Generating ${reportType} reconciliation report for ${companyId} from ${dateRange.start} to ${dateRange.end}`);

    // Gather all necessary data
    const reportData = await this.gatherReportData(companyId, dateRange);
    
    // Calculate statistics
    const statistics = this.calculateReportStatistics(reportData);
    
    // Generate report file if requested
    let reportPath = null;
    if (format !== 'JSON') {
      reportPath = await this.generateReportFile(reportData, statistics, companyId, format, reportType);
    }

    // Create report record in database
    const report = await prisma.reconciliationReport.create({
      data: {
        companyId,
        generatedBy: userId,
        periodStart: dateRange.start,
        periodEnd: dateRange.end,
        reportType,
        totalTransactions: reportData.transactions.length,
        totalExpenses: reportData.expenses.length,
        matchedCount: reportData.matches.filter(m => m.status === 'APPROVED').length,
        unmatchedTransactions: reportData.unmatchedTransactions.length,
        unmatchedExpenses: reportData.unmatchedExpenses.length,
        partialMatches: reportData.matches.filter(m => m.isPartialMatch).length,
        totalTransactionAmount: reportData.totalTransactionAmount,
        totalExpenseAmount: reportData.totalExpenseAmount,
        matchedAmount: reportData.matchedAmount,
        unmatchedAmount: reportData.unmatchedAmount,
        autoReconciliationRate: statistics.autoReconciliationRate,
        averageConfidenceScore: statistics.averageConfidenceScore,
        processingTime: Date.now() - startTime,
        reportData,
        unmatchedItems: {
          transactions: reportData.unmatchedTransactions,
          expenses: reportData.unmatchedExpenses
        },
        reportPath,
        reportFormat: format
      }
    });

    return {
      ...report,
      statistics,
      summary: this.generateReportSummary(reportData, statistics)
    };
  }

  /**
   * Gather all data needed for reconciliation report
   * @param {string} companyId - Company ID
   * @param {Object} dateRange - Date range
   * @returns {Object} Report data
   */
  async gatherReportData(companyId, dateRange) {
    const [
      transactions,
      expenses,
      matches,
      auditLogs
    ] = await Promise.all([
      this.getTransactionsInPeriod(companyId, dateRange),
      this.getExpensesInPeriod(companyId, dateRange),
      this.getMatchesInPeriod(companyId, dateRange),
      this.getAuditLogsInPeriod(companyId, dateRange)
    ]);

    // Calculate amounts
    const totalTransactionAmount = this.calculateTotalAmount(transactions);
    const totalExpenseAmount = this.calculateTotalAmount(expenses);
    const matchedTransactions = matches.filter(m => m.status === 'APPROVED').map(m => m.transaction);
    const matchedAmount = this.calculateTotalAmount(matchedTransactions);
    const unmatchedAmount = totalTransactionAmount - matchedAmount;

    // Identify unmatched items
    const matchedTransactionIds = matches.filter(m => m.status === 'APPROVED').map(m => m.transactionId);
    const matchedExpenseIds = matches.filter(m => m.status === 'APPROVED').map(m => m.expenseId);
    
    const unmatchedTransactions = transactions.filter(t => !matchedTransactionIds.includes(t.id));
    const unmatchedExpenses = expenses.filter(e => !matchedExpenseIds.includes(e.id));

    return {
      transactions,
      expenses,
      matches,
      auditLogs,
      totalTransactionAmount,
      totalExpenseAmount,
      matchedAmount,
      unmatchedAmount,
      unmatchedTransactions,
      unmatchedExpenses
    };
  }

  /**
   * Calculate comprehensive report statistics
   * @param {Object} reportData - Report data
   * @returns {Object} Statistics
   */
  calculateReportStatistics(reportData) {
    const {
      transactions,
      expenses,
      matches,
      totalTransactionAmount,
      totalExpenseAmount,
      matchedAmount,
      unmatchedTransactions,
      unmatchedExpenses
    } = reportData;

    const approvedMatches = matches.filter(m => m.status === 'APPROVED');
    const rejectedMatches = matches.filter(m => m.status === 'REJECTED');
    const pendingMatches = matches.filter(m => ['PENDING', 'MANUAL_REVIEW'].includes(m.status));
    const autoMatches = matches.filter(m => m.status === 'AUTO_APPROVED');
    const manualMatches = matches.filter(m => m.status === 'APPROVED' && m.reviewedBy);
    const splitMatches = matches.filter(m => m.isPartialMatch);

    // Calculate reconciliation rates
    const autoReconciliationRate = transactions.length > 0 ? 
      (autoMatches.length / transactions.length) * 100 : 0;
    
    const totalReconciliationRate = transactions.length > 0 ? 
      (approvedMatches.length / transactions.length) * 100 : 0;

    // Calculate confidence statistics
    const confidenceScores = approvedMatches.map(m => m.confidenceScore).filter(s => s != null);
    const averageConfidenceScore = confidenceScores.length > 0 ? 
      confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length : 0;
    
    const highConfidenceMatches = confidenceScores.filter(s => s >= 0.9).length;
    const mediumConfidenceMatches = confidenceScores.filter(s => s >= 0.7 && s < 0.9).length;
    const lowConfidenceMatches = confidenceScores.filter(s => s < 0.7).length;

    // Amount reconciliation
    const amountReconciliationRate = totalTransactionAmount > 0 ?
      (matchedAmount / totalTransactionAmount) * 100 : 0;

    // Strategy effectiveness
    const strategyStats = this.calculateStrategyStatistics(matches);

    return {
      // Basic counts
      totalTransactions: transactions.length,
      totalExpenses: expenses.length,
      totalMatches: matches.length,
      approvedMatches: approvedMatches.length,
      rejectedMatches: rejectedMatches.length,
      pendingMatches: pendingMatches.length,
      autoMatches: autoMatches.length,
      manualMatches: manualMatches.length,
      splitMatches: splitMatches.length,
      unmatchedTransactions: unmatchedTransactions.length,
      unmatchedExpenses: unmatchedExpenses.length,

      // Rates and percentages
      autoReconciliationRate,
      totalReconciliationRate,
      amountReconciliationRate,
      rejectionRate: matches.length > 0 ? (rejectedMatches.length / matches.length) * 100 : 0,
      pendingRate: matches.length > 0 ? (pendingMatches.length / matches.length) * 100 : 0,

      // Confidence statistics
      averageConfidenceScore,
      highConfidenceMatches,
      mediumConfidenceMatches,
      lowConfidenceMatches,
      confidenceDistribution: {
        high: confidenceScores.length > 0 ? (highConfidenceMatches / confidenceScores.length) * 100 : 0,
        medium: confidenceScores.length > 0 ? (mediumConfidenceMatches / confidenceScores.length) * 100 : 0,
        low: confidenceScores.length > 0 ? (lowConfidenceMatches / confidenceScores.length) * 100 : 0
      },

      // Amount statistics
      totalTransactionAmount,
      totalExpenseAmount,
      matchedAmount,
      unmatchedAmount: totalTransactionAmount - matchedAmount,
      amountVariance: Math.abs(totalTransactionAmount - totalExpenseAmount),

      // Strategy effectiveness
      strategyStats
    };
  }

  /**
   * Calculate strategy effectiveness statistics
   * @param {Array} matches - Match records
   * @returns {Object} Strategy statistics
   */
  calculateStrategyStatistics(matches) {
    const strategies = ['exact', 'fuzzy', 'pattern-based', 'ml-assisted', 'manual'];
    const stats = {};

    for (const strategy of strategies) {
      const strategyMatches = matches.filter(m => m.matchStrategy === strategy);
      const approvedStrategyMatches = strategyMatches.filter(m => m.status === 'APPROVED');
      
      stats[strategy] = {
        total: strategyMatches.length,
        approved: approvedStrategyMatches.length,
        successRate: strategyMatches.length > 0 ? 
          (approvedStrategyMatches.length / strategyMatches.length) * 100 : 0,
        averageConfidence: approvedStrategyMatches.length > 0 ?
          approvedStrategyMatches.reduce((sum, m) => sum + (m.confidenceScore || 0), 0) / approvedStrategyMatches.length : 0
      };
    }

    return stats;
  }

  /**
   * Generate report file in specified format
   * @param {Object} reportData - Report data
   * @param {Object} statistics - Report statistics
   * @param {string} companyId - Company ID
   * @param {string} format - Report format (EXCEL, CSV, PDF)
   * @param {string} reportType - Report type
   * @returns {string} File path
   */
  async generateReportFile(reportData, statistics, companyId, format, reportType) {
    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const filename = `reconciliation-${reportType.toLowerCase()}-${companyId}-${timestamp}`;

    switch (format.toUpperCase()) {
      case 'EXCEL':
        return await this.generateExcelReport(reportData, statistics, filename);
      case 'CSV':
        return await this.generateCSVReport(reportData, statistics, filename);
      case 'PDF':
        return await this.generatePDFReport(reportData, statistics, filename);
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  /**
   * Generate Excel report
   * @param {Object} reportData - Report data
   * @param {Object} statistics - Report statistics
   * @param {string} filename - Base filename
   * @returns {string} File path
   */
  async generateExcelReport(reportData, statistics, filename) {
    const workbook = new ExcelJS.Workbook();
    const filepath = path.join(this.reportsDir, `${filename}.xlsx`);

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    this.addSummaryToSheet(summarySheet, statistics);

    // Matched transactions sheet
    const matchedSheet = workbook.addWorksheet('Matched Transactions');
    this.addMatchedTransactionsToSheet(matchedSheet, reportData.matches.filter(m => m.status === 'APPROVED'));

    // Unmatched transactions sheet
    const unmatchedTxSheet = workbook.addWorksheet('Unmatched Transactions');
    this.addUnmatchedTransactionsToSheet(unmatchedTxSheet, reportData.unmatchedTransactions);

    // Unmatched expenses sheet
    const unmatchedExpSheet = workbook.addWorksheet('Unmatched Expenses');
    this.addUnmatchedExpensesToSheet(unmatchedExpSheet, reportData.unmatchedExpenses);

    // Strategy performance sheet
    const strategySheet = workbook.addWorksheet('Strategy Performance');
    this.addStrategyPerformanceToSheet(strategySheet, statistics.strategyStats);

    await workbook.xlsx.writeFile(filepath);
    return filepath;
  }

  /**
   * Add summary data to Excel sheet
   * @param {Object} sheet - Excel worksheet
   * @param {Object} statistics - Statistics data
   */
  addSummaryToSheet(sheet, statistics) {
    sheet.addRow(['Reconciliation Summary Report']);
    sheet.addRow([]);
    
    // Basic statistics
    sheet.addRow(['Metric', 'Value', 'Percentage']);
    sheet.addRow(['Total Transactions', statistics.totalTransactions]);
    sheet.addRow(['Total Expenses', statistics.totalExpenses]);
    sheet.addRow(['Auto-Matched', statistics.autoMatches, `${statistics.autoReconciliationRate.toFixed(2)}%`]);
    sheet.addRow(['Manually Matched', statistics.manualMatches]);
    sheet.addRow(['Total Matched', statistics.approvedMatches, `${statistics.totalReconciliationRate.toFixed(2)}%`]);
    sheet.addRow(['Rejected Matches', statistics.rejectedMatches, `${statistics.rejectionRate.toFixed(2)}%`]);
    sheet.addRow(['Pending Review', statistics.pendingMatches, `${statistics.pendingRate.toFixed(2)}%`]);
    sheet.addRow(['Unmatched Transactions', statistics.unmatchedTransactions]);
    sheet.addRow(['Unmatched Expenses', statistics.unmatchedExpenses]);
    sheet.addRow([]);
    
    // Amount reconciliation
    sheet.addRow(['Amount Reconciliation']);
    sheet.addRow(['Total Transaction Amount', statistics.totalTransactionAmount]);
    sheet.addRow(['Total Expense Amount', statistics.totalExpenseAmount]);
    sheet.addRow(['Matched Amount', statistics.matchedAmount]);
    sheet.addRow(['Unmatched Amount', statistics.unmatchedAmount]);
    sheet.addRow(['Amount Reconciliation Rate', `${statistics.amountReconciliationRate.toFixed(2)}%`]);
    sheet.addRow([]);
    
    // Confidence statistics
    sheet.addRow(['Confidence Distribution']);
    sheet.addRow(['Average Confidence Score', statistics.averageConfidenceScore.toFixed(3)]);
    sheet.addRow(['High Confidence (>90%)', statistics.highConfidenceMatches, `${statistics.confidenceDistribution.high.toFixed(1)}%`]);
    sheet.addRow(['Medium Confidence (70-90%)', statistics.mediumConfidenceMatches, `${statistics.confidenceDistribution.medium.toFixed(1)}%`]);
    sheet.addRow(['Low Confidence (<70%)', statistics.lowConfidenceMatches, `${statistics.confidenceDistribution.low.toFixed(1)}%`]);

    // Format header
    sheet.getRow(1).font = { bold: true, size: 14 };
    sheet.getRow(3).font = { bold: true };
    sheet.getRow(11).font = { bold: true };
    sheet.getRow(18).font = { bold: true };
  }

  /**
   * Add matched transactions to Excel sheet
   * @param {Object} sheet - Excel worksheet
   * @param {Array} matches - Matched transactions
   */
  addMatchedTransactionsToSheet(sheet, matches) {
    // Headers
    sheet.addRow([
      'Transaction Date',
      'Transaction Amount',
      'Transaction Description',
      'Expense Amount',
      'Expense Merchant',
      'Match Confidence',
      'Match Strategy',
      'Amount Score',
      'Date Score',
      'Vendor Score'
    ]);

    // Data
    matches.forEach(match => {
      sheet.addRow([
        format(new Date(match.transaction.date), 'yyyy-MM-dd'),
        match.transaction.amount,
        match.transaction.description,
        match.expense.amount,
        match.expense.merchantName,
        (match.confidenceScore * 100).toFixed(1) + '%',
        match.matchStrategy,
        (match.amountScore * 100).toFixed(1) + '%',
        (match.dateScore * 100).toFixed(1) + '%',
        (match.vendorScore * 100).toFixed(1) + '%'
      ]);
    });

    // Format headers
    sheet.getRow(1).font = { bold: true };
  }

  /**
   * Add unmatched transactions to Excel sheet
   * @param {Object} sheet - Excel worksheet
   * @param {Array} transactions - Unmatched transactions
   */
  addUnmatchedTransactionsToSheet(sheet, transactions) {
    // Headers
    sheet.addRow([
      'Date',
      'Amount',
      'Description',
      'Type',
      'Merchant',
      'Status'
    ]);

    // Data
    transactions.forEach(transaction => {
      sheet.addRow([
        format(new Date(transaction.date), 'yyyy-MM-dd'),
        transaction.amount,
        transaction.description,
        transaction.type,
        transaction.merchant,
        transaction.matchStatus
      ]);
    });

    // Format headers
    sheet.getRow(1).font = { bold: true };
  }

  /**
   * Add unmatched expenses to Excel sheet
   * @param {Object} sheet - Excel worksheet
   * @param {Array} expenses - Unmatched expenses
   */
  addUnmatchedExpensesToSheet(sheet, expenses) {
    // Headers
    sheet.addRow([
      'Date',
      'Amount',
      'Title',
      'Description',
      'Merchant',
      'Status'
    ]);

    // Data
    expenses.forEach(expense => {
      sheet.addRow([
        format(new Date(expense.transactionDate), 'yyyy-MM-dd'),
        expense.amount,
        expense.title,
        expense.description,
        expense.merchantName,
        expense.status
      ]);
    });

    // Format headers
    sheet.getRow(1).font = { bold: true };
  }

  /**
   * Add strategy performance to Excel sheet
   * @param {Object} sheet - Excel worksheet
   * @param {Object} strategyStats - Strategy statistics
   */
  addStrategyPerformanceToSheet(sheet, strategyStats) {
    // Headers
    sheet.addRow([
      'Strategy',
      'Total Attempts',
      'Successful Matches',
      'Success Rate',
      'Average Confidence'
    ]);

    // Data
    Object.entries(strategyStats).forEach(([strategy, stats]) => {
      sheet.addRow([
        strategy,
        stats.total,
        stats.approved,
        `${stats.successRate.toFixed(1)}%`,
        stats.averageConfidence.toFixed(3)
      ]);
    });

    // Format headers
    sheet.getRow(1).font = { bold: true };
  }

  /**
   * Generate report summary for quick overview
   * @param {Object} reportData - Report data
   * @param {Object} statistics - Statistics
   * @returns {Object} Report summary
   */
  generateReportSummary(reportData, statistics) {
    return {
      reconciliationHealth: this.assessReconciliationHealth(statistics),
      keyMetrics: {
        autoReconciliationRate: statistics.autoReconciliationRate,
        totalReconciliationRate: statistics.totalReconciliationRate,
        averageConfidence: statistics.averageConfidenceScore,
        amountReconciliationRate: statistics.amountReconciliationRate
      },
      recommendations: this.generateRecommendations(statistics),
      topIssues: this.identifyTopIssues(reportData, statistics)
    };
  }

  /**
   * Assess overall reconciliation health
   * @param {Object} statistics - Statistics
   * @returns {string} Health assessment
   */
  assessReconciliationHealth(statistics) {
    const { autoReconciliationRate, averageConfidenceScore, rejectionRate } = statistics;

    if (autoReconciliationRate >= 85 && averageConfidenceScore >= 0.8 && rejectionRate <= 10) {
      return 'EXCELLENT';
    } else if (autoReconciliationRate >= 70 && averageConfidenceScore >= 0.7 && rejectionRate <= 20) {
      return 'GOOD';
    } else if (autoReconciliationRate >= 50 && averageConfidenceScore >= 0.6 && rejectionRate <= 35) {
      return 'FAIR';
    } else {
      return 'NEEDS_IMPROVEMENT';
    }
  }

  /**
   * Generate recommendations based on statistics
   * @param {Object} statistics - Statistics
   * @returns {Array} Recommendations
   */
  generateRecommendations(statistics) {
    const recommendations = [];

    if (statistics.autoReconciliationRate < 85) {
      recommendations.push({
        type: 'IMPROVE_AUTO_MATCHING',
        message: 'Auto-reconciliation rate is below target. Consider adjusting matching rules or training data.',
        priority: 'HIGH'
      });
    }

    if (statistics.averageConfidenceScore < 0.7) {
      recommendations.push({
        type: 'IMPROVE_CONFIDENCE',
        message: 'Average confidence score is low. Review and optimize matching algorithms.',
        priority: 'MEDIUM'
      });
    }

    if (statistics.unmatchedTransactions > statistics.totalTransactions * 0.2) {
      recommendations.push({
        type: 'REDUCE_UNMATCHED',
        message: 'High number of unmatched transactions. Review expense recording processes.',
        priority: 'HIGH'
      });
    }

    if (statistics.rejectionRate > 20) {
      recommendations.push({
        type: 'REDUCE_REJECTIONS',
        message: 'High rejection rate indicates potential issues with matching logic.',
        priority: 'MEDIUM'
      });
    }

    return recommendations;
  }

  /**
   * Identify top issues requiring attention
   * @param {Object} reportData - Report data
   * @param {Object} statistics - Statistics
   * @returns {Array} Top issues
   */
  identifyTopIssues(reportData, statistics) {
    const issues = [];

    // Large unmatched amounts
    const largeUnmatchedTransactions = reportData.unmatchedTransactions
      .filter(t => Math.abs(parseFloat(t.amount)) > 1000)
      .sort((a, b) => Math.abs(parseFloat(b.amount)) - Math.abs(parseFloat(a.amount)))
      .slice(0, 5);

    if (largeUnmatchedTransactions.length > 0) {
      issues.push({
        type: 'LARGE_UNMATCHED_AMOUNTS',
        description: 'Large unmatched transactions requiring attention',
        items: largeUnmatchedTransactions,
        priority: 'HIGH'
      });
    }

    // Old unmatched items
    const oldUnmatchedTransactions = reportData.unmatchedTransactions
      .filter(t => {
        const daysDiff = (new Date() - new Date(t.date)) / (1000 * 60 * 60 * 24);
        return daysDiff > 30;
      })
      .slice(0, 10);

    if (oldUnmatchedTransactions.length > 0) {
      issues.push({
        type: 'OLD_UNMATCHED_ITEMS',
        description: 'Old unmatched transactions that may need manual review',
        items: oldUnmatchedTransactions,
        priority: 'MEDIUM'
      });
    }

    return issues;
  }

  // Helper methods for data retrieval
  async getTransactionsInPeriod(companyId, dateRange) {
    return await prisma.bankTransaction.findMany({
      where: {
        companyId,
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      orderBy: { date: 'desc' }
    });
  }

  async getExpensesInPeriod(companyId, dateRange) {
    return await prisma.expense.findMany({
      where: {
        companyId,
        transactionDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      orderBy: { transactionDate: 'desc' }
    });
  }

  async getMatchesInPeriod(companyId, dateRange) {
    return await prisma.transactionMatch.findMany({
      where: {
        companyId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      include: {
        transaction: true,
        expense: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAuditLogsInPeriod(companyId, dateRange) {
    return await prisma.matchingAuditLog.findMany({
      where: {
        companyId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  calculateTotalAmount(items) {
    return items.reduce((sum, item) => sum + Math.abs(parseFloat(item.amount || 0)), 0);
  }

  calculateDateRange(periodStart, periodEnd, reportType) {
    if (periodStart && periodEnd) {
      return {
        start: new Date(periodStart),
        end: new Date(periodEnd)
      };
    }

    const now = new Date();
    
    switch (reportType) {
      case 'WEEKLY':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now)
        };
      case 'MONTHLY':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'QUARTERLY':
        const quarter = Math.floor(now.getMonth() / 3);
        return {
          start: new Date(now.getFullYear(), quarter * 3, 1),
          end: new Date(now.getFullYear(), (quarter + 1) * 3, 0)
        };
      case 'YEARLY':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  }
}

module.exports = ReconciliationService; 