const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const AnalyticsService = require('./analyticsService');

const prisma = new PrismaClient();
const analyticsService = new AnalyticsService();

class ReportGenerationService {
  
  constructor() {
    this.reportsDir = path.join(__dirname, '../../uploads/reports');
    this.ensureReportsDirectory();
    this.setupEmailTransporter();
  }

  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  setupEmailTransporter() {
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Generate comprehensive expense report
   */
  async generateExpenseReport(companyId, reportOptions) {
    try {
      const {
        dateFrom,
        dateTo,
        format = 'pdf', // pdf, excel
        filters = {},
        includeCharts = true,
        includeDetails = true,
        groupBy = 'category'
      } = reportOptions;

      // Get analytics data
      const analytics = await analyticsService.getExpenseAnalytics(companyId, dateFrom, dateTo, filters);
      
      // Get company information
      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });

      const reportData = {
        company,
        analytics,
        period: { dateFrom, dateTo },
        filters,
        generatedAt: new Date()
      };

      let filePath;
      if (format === 'pdf') {
        filePath = await this.generatePDFReport(reportData, reportOptions);
      } else if (format === 'excel') {
        filePath = await this.generateExcelReport(reportData, reportOptions);
      } else {
        throw new Error('Unsupported report format');
      }

      // Save report record to database
      const reportRecord = await this.saveReportRecord(companyId, {
        ...reportOptions,
        filePath,
        status: 'completed'
      });

      return {
        success: true,
        reportId: reportRecord.id,
        filePath,
        downloadUrl: `/api/reports/download/${reportRecord.id}`
      };

    } catch (error) {
      console.error('Error generating expense report:', error);
      throw error;
    }
  }

  /**
   * Generate PDF report
   */
  async generatePDFReport(reportData, options) {
    const { company, analytics, period, generatedAt } = reportData;
    const fileName = `expense-report-${company.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
          info: {
            Title: 'Expense Report',
            Author: 'ExpenseFlow Pro',
            Subject: `Expense Report for ${company.name}`,
            Keywords: 'expenses, report, analytics'
          }
        });
        
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        this.addPDFHeader(doc, company, period, generatedAt);
        
        // Executive Summary
        this.addPDFExecutiveSummary(doc, analytics.summary);
        
        // Category Breakdown
        this.addPDFCategoryBreakdown(doc, analytics.categoryBreakdown);
        
        // Vendor Analysis
        this.addPDFVendorAnalysis(doc, analytics.vendorAnalysis);
        
        // Budget Tracking
        this.addPDFBudgetTracking(doc, analytics.budgetTracking);
        
        // Tax Deductible Summary
        this.addPDFTaxDeductibleSummary(doc, analytics.taxDeductible);
        
        // Detailed Expenses (if included)
        if (options.includeDetails) {
          this.addPDFDetailedExpenses(doc, analytics.expenses);
        }
        
        // Footer
        this.addPDFFooter(doc);
        
        doc.end();
        
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Excel report
   */
  async generateExcelReport(reportData, options) {
    const { company, analytics, period, generatedAt } = reportData;
    const fileName = `expense-report-${company.name.replace(/\s+/g, '-')}-${Date.now()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);
    
    const workbook = new ExcelJS.Workbook();
    
    // Metadata
    workbook.creator = 'ExpenseFlow Pro';
    workbook.created = generatedAt;
    workbook.modified = generatedAt;
    
    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary', {
      pageSetup: { paperSize: 9, orientation: 'portrait' }
    });
    this.addExcelSummarySheet(summarySheet, company, analytics, period);
    
    // Category Breakdown Sheet
    const categorySheet = workbook.addWorksheet('Category Breakdown');
    this.addExcelCategorySheet(categorySheet, analytics.categoryBreakdown);
    
    // Vendor Analysis Sheet
    const vendorSheet = workbook.addWorksheet('Vendor Analysis');
    this.addExcelVendorSheet(vendorSheet, analytics.vendorAnalysis);
    
    // Budget Tracking Sheet
    const budgetSheet = workbook.addWorksheet('Budget Tracking');
    this.addExcelBudgetSheet(budgetSheet, analytics.budgetTracking);
    
    // Trends Sheet
    const trendsSheet = workbook.addWorksheet('Trends');
    this.addExcelTrendsSheet(trendsSheet, analytics.trends);
    
    // Detailed Expenses Sheet (if included)
    if (options.includeDetails) {
      const detailsSheet = workbook.addWorksheet('Detailed Expenses');
      this.addExcelDetailsSheet(detailsSheet, analytics.expenses);
    }
    
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Schedule automated report generation
   */
  async scheduleReport(companyId, scheduleOptions) {
    try {
      const {
        name,
        description,
        frequency, // daily, weekly, monthly, quarterly
        dayOfWeek, // for weekly reports
        dayOfMonth, // for monthly reports
        recipients,
        reportOptions
      } = scheduleOptions;

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          companyId,
          name,
          description,
          frequency,
          dayOfWeek,
          dayOfMonth,
          recipients: JSON.stringify(recipients),
          reportOptions: JSON.stringify(reportOptions),
          isActive: true,
          nextRunDate: this.calculateNextRunDate(frequency, dayOfWeek, dayOfMonth)
        }
      });

      return scheduledReport;

    } catch (error) {
      console.error('Error scheduling report:', error);
      throw error;
    }
  }

  /**
   * Process scheduled reports
   */
  async processScheduledReports() {
    try {
      const now = new Date();
      const scheduledReports = await prisma.scheduledReport.findMany({
        where: {
          isActive: true,
          nextRunDate: {
            lte: now
          }
        },
        include: {
          company: true
        }
      });

      for (const scheduledReport of scheduledReports) {
        try {
          await this.executeScheduledReport(scheduledReport);
          
          // Update next run date
          await prisma.scheduledReport.update({
            where: { id: scheduledReport.id },
            data: {
              nextRunDate: this.calculateNextRunDate(
                scheduledReport.frequency,
                scheduledReport.dayOfWeek,
                scheduledReport.dayOfMonth
              ),
              lastRunDate: now
            }
          });
          
        } catch (error) {
          console.error(`Error executing scheduled report ${scheduledReport.id}:`, error);
          
          // Log the error but continue with other reports
          await prisma.reportExecutionLog.create({
            data: {
              scheduledReportId: scheduledReport.id,
              status: 'failed',
              error: error.message,
              executedAt: now
            }
          });
        }
      }

    } catch (error) {
      console.error('Error processing scheduled reports:', error);
    }
  }

  /**
   * Execute a scheduled report
   */
  async executeScheduledReport(scheduledReport) {
    const reportOptions = JSON.parse(scheduledReport.reportOptions);
    const recipients = JSON.parse(scheduledReport.recipients);
    
    // Generate date range based on frequency
    const { dateFrom, dateTo } = this.generateDateRange(scheduledReport.frequency);
    
    // Generate the report
    const report = await this.generateExpenseReport(scheduledReport.companyId, {
      ...reportOptions,
      dateFrom,
      dateTo
    });
    
    // Send email to recipients
    await this.emailReport(
      recipients,
      scheduledReport.company.name,
      scheduledReport.name,
      report.filePath,
      reportOptions.format
    );
    
    // Log successful execution
    await prisma.reportExecutionLog.create({
      data: {
        scheduledReportId: scheduledReport.id,
        reportId: report.reportId,
        status: 'completed',
        recipients: JSON.stringify(recipients),
        executedAt: new Date()
      }
    });
  }

  /**
   * Email report to recipients
   */
  async emailReport(recipients, companyName, reportName, filePath, format) {
    try {
      const fileName = path.basename(filePath);
      const fileExtension = format === 'pdf' ? 'PDF' : 'Excel';
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'reports@expenseflow.com',
        to: recipients.join(', '),
        subject: `${reportName} - ${companyName}`,
        html: `
          <h2>Expense Report: ${reportName}</h2>
          <p>Please find attached the ${fileExtension} expense report for ${companyName}.</p>
          <p>This report was automatically generated by ExpenseFlow Pro.</p>
          <hr>
          <p><small>This is an automated email. Please do not reply.</small></p>
        `,
        attachments: [
          {
            filename: fileName,
            path: filePath
          }
        ]
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Report emailed successfully to: ${recipients.join(', ')}`);

    } catch (error) {
      console.error('Error emailing report:', error);
      throw error;
    }
  }

  /**
   * Save report record to database
   */
  async saveReportRecord(companyId, reportData) {
    return await prisma.report.create({
      data: {
        companyId,
        name: reportData.name || `Expense Report ${new Date().toLocaleDateString()}`,
        type: 'expense_report',
        format: reportData.format,
        filePath: reportData.filePath,
        filters: JSON.stringify(reportData.filters || {}),
        period: JSON.stringify({
          dateFrom: reportData.dateFrom,
          dateTo: reportData.dateTo
        }),
        status: reportData.status,
        generatedBy: reportData.userId,
        fileSize: this.getFileSize(reportData.filePath)
      }
    });
  }

  // PDF Helper Methods

  addPDFHeader(doc, company, period, generatedAt) {
    doc.fontSize(20).text('Expense Report', { align: 'center' });
    doc.fontSize(16).text(company.name, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Report Period: ${new Date(period.dateFrom).toLocaleDateString()} - ${new Date(period.dateTo).toLocaleDateString()}`);
    doc.text(`Generated: ${generatedAt.toLocaleDateString()} ${generatedAt.toLocaleTimeString()}`);
    doc.moveDown();
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
  }

  addPDFExecutiveSummary(doc, summary) {
    doc.fontSize(16).text('Executive Summary', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Total Expenses: $${summary.totalAmount.toLocaleString()}`);
    doc.text(`Total Transactions: ${summary.totalTransactions.toLocaleString()}`);
    doc.text(`Average Transaction: $${summary.averageAmount.toFixed(2)}`);
    doc.text(`Categories: ${summary.uniqueCategories}`);
    doc.text(`Vendors: ${summary.uniqueVendors}`);
    doc.text(`Employees: ${summary.uniqueEmployees}`);
    doc.moveDown();
  }

  addPDFCategoryBreakdown(doc, categoryBreakdown) {
    if (doc.y > 650) doc.addPage();
    
    doc.fontSize(16).text('Category Breakdown', { underline: true });
    doc.moveDown();
    
    const tableTop = doc.y;
    const itemHeight = 20;
    
    // Table headers
    doc.fontSize(10);
    doc.text('Category', 50, tableTop, { width: 150 });
    doc.text('Amount', 200, tableTop, { width: 80 });
    doc.text('Count', 280, tableTop, { width: 60 });
    doc.text('Percentage', 340, tableTop, { width: 80 });
    doc.text('Avg Amount', 420, tableTop, { width: 80 });
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let currentY = tableTop + itemHeight;
    
    categoryBreakdown.slice(0, 15).forEach((category, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
      
      doc.text(category.name, 50, currentY, { width: 150 });
      doc.text(`$${category.amount.toLocaleString()}`, 200, currentY, { width: 80 });
      doc.text(category.count.toString(), 280, currentY, { width: 60 });
      doc.text(`${category.percentage.toFixed(1)}%`, 340, currentY, { width: 80 });
      doc.text(`$${category.averageAmount.toFixed(2)}`, 420, currentY, { width: 80 });
      
      currentY += itemHeight;
    });
    
    doc.y = currentY + 20;
  }

  addPDFVendorAnalysis(doc, vendorAnalysis) {
    if (doc.y > 600) doc.addPage();
    
    doc.fontSize(16).text('Top Vendors', { underline: true });
    doc.moveDown();
    
    vendorAnalysis.slice(0, 10).forEach((vendor, index) => {
      if (doc.y > 700) doc.addPage();
      
      doc.fontSize(12).text(`${index + 1}. ${vendor.name}`);
      doc.fontSize(10);
      doc.text(`   Amount: $${vendor.amount.toLocaleString()}`);
      doc.text(`   Transactions: ${vendor.count}`);
      doc.text(`   Average: $${vendor.averageAmount.toFixed(2)}`);
      doc.text(`   Categories: ${vendor.categories.join(', ')}`);
      doc.moveDown(0.5);
    });
  }

  addPDFBudgetTracking(doc, budgetTracking) {
    if (doc.y > 600) doc.addPage();
    
    doc.fontSize(16).text('Budget vs Actual', { underline: true });
    doc.moveDown();
    
    budgetTracking.budgets.forEach((budget) => {
      if (doc.y > 700) doc.addPage();
      
      const status = budget.status === 'over' ? 'OVER BUDGET' : 
                    budget.status === 'warning' ? 'WARNING' : 'ON TRACK';
      
      doc.fontSize(12).text(`${budget.category}: ${status}`);
      doc.fontSize(10);
      doc.text(`   Budget: $${budget.budgetAmount.toLocaleString()}`);
      doc.text(`   Actual: $${budget.actualSpend.toLocaleString()}`);
      doc.text(`   Utilization: ${budget.utilization.toFixed(1)}%`);
      doc.text(`   Variance: $${budget.variance.toLocaleString()}`);
      doc.moveDown(0.5);
    });
  }

  addPDFTaxDeductibleSummary(doc, taxDeductible) {
    if (doc.y > 650) doc.addPage();
    
    doc.fontSize(16).text('Tax Deductible Summary', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Tax Deductible Amount: $${taxDeductible.taxDeductibleAmount.toLocaleString()}`);
    doc.text(`Non-Deductible Amount: $${taxDeductible.nonTaxDeductibleAmount.toLocaleString()}`);
    doc.text(`Tax Deductible Percentage: ${taxDeductible.taxDeductiblePercentage.toFixed(1)}%`);
    doc.text(`Estimated Tax Savings: $${taxDeductible.estimatedTaxSavings.toLocaleString()}`);
    doc.moveDown();
  }

  addPDFDetailedExpenses(doc, expenses) {
    doc.addPage();
    doc.fontSize(16).text('Detailed Expenses', { underline: true });
    doc.moveDown();
    
    const tableTop = doc.y;
    const itemHeight = 15;
    
    doc.fontSize(8);
    doc.text('Date', 50, tableTop, { width: 60 });
    doc.text('Vendor', 110, tableTop, { width: 100 });
    doc.text('Category', 210, tableTop, { width: 80 });
    doc.text('Amount', 290, tableTop, { width: 60 });
    doc.text('Employee', 350, tableTop, { width: 80 });
    doc.text('Description', 430, tableTop, { width: 100 });
    
    doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).stroke();
    
    let currentY = tableTop + itemHeight;
    
    expenses.slice(0, 50).forEach((expense) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }
      
      doc.text(new Date(expense.date).toLocaleDateString(), 50, currentY, { width: 60 });
      doc.text(expense.vendor || 'N/A', 110, currentY, { width: 100 });
      doc.text(expense.category || 'N/A', 210, currentY, { width: 80 });
      doc.text(`$${parseFloat(expense.amount).toFixed(2)}`, 290, currentY, { width: 60 });
      doc.text(expense.employee?.name || 'N/A', 350, currentY, { width: 80 });
      doc.text(expense.description || 'N/A', 430, currentY, { width: 100 });
      
      currentY += itemHeight;
    });
  }

  addPDFFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Page ${i + 1} of ${pageCount} | Generated by ExpenseFlow Pro`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }
  }

  // Excel Helper Methods

  addExcelSummarySheet(sheet, company, analytics, period) {
    sheet.getCell('A1').value = 'Expense Report';
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A2').value = company.name;
    sheet.getCell('A2').font = { size: 14, bold: true };
    
    sheet.getCell('A4').value = 'Report Period:';
    sheet.getCell('B4').value = `${new Date(period.dateFrom).toLocaleDateString()} - ${new Date(period.dateTo).toLocaleDateString()}`;
    
    const summary = analytics.summary;
    const summaryData = [
      ['Total Expenses', summary.totalAmount],
      ['Total Transactions', summary.totalTransactions],
      ['Average Transaction', summary.averageAmount],
      ['Unique Categories', summary.uniqueCategories],
      ['Unique Vendors', summary.uniqueVendors],
      ['Unique Employees', summary.uniqueEmployees]
    ];
    
    let row = 6;
    summaryData.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      sheet.getCell(`A${row}`).font = { bold: true };
      row++;
    });
    
    sheet.columns = [{ width: 20 }, { width: 15 }];
  }

  addExcelCategorySheet(sheet, categoryBreakdown) {
    const headers = ['Category', 'Amount', 'Count', 'Percentage', 'Average Amount', 'Tax Deductible'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    
    categoryBreakdown.forEach((category, rowIndex) => {
      const row = rowIndex + 2;
      sheet.getCell(row, 1).value = category.name;
      sheet.getCell(row, 2).value = category.amount;
      sheet.getCell(row, 3).value = category.count;
      sheet.getCell(row, 4).value = category.percentage / 100;
      sheet.getCell(row, 5).value = category.averageAmount;
      sheet.getCell(row, 6).value = category.taxDeductible;
      
      sheet.getCell(row, 2).numFmt = '$#,##0.00';
      sheet.getCell(row, 4).numFmt = '0.0%';
      sheet.getCell(row, 5).numFmt = '$#,##0.00';
      sheet.getCell(row, 6).numFmt = '$#,##0.00';
    });
    
    sheet.columns = [
      { width: 20 }, { width: 12 }, { width: 8 }, { width: 12 }, { width: 15 }, { width: 15 }
    ];
  }

  addExcelVendorSheet(sheet, vendorAnalysis) {
    const headers = ['Vendor', 'Amount', 'Count', 'Average Amount', 'Frequency', 'Categories'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    
    vendorAnalysis.forEach((vendor, rowIndex) => {
      const row = rowIndex + 2;
      sheet.getCell(row, 1).value = vendor.name;
      sheet.getCell(row, 2).value = vendor.amount;
      sheet.getCell(row, 3).value = vendor.count;
      sheet.getCell(row, 4).value = vendor.averageAmount;
      sheet.getCell(row, 5).value = vendor.frequency;
      sheet.getCell(row, 6).value = vendor.categories.join(', ');
      
      sheet.getCell(row, 2).numFmt = '$#,##0.00';
      sheet.getCell(row, 4).numFmt = '$#,##0.00';
      sheet.getCell(row, 5).numFmt = '0.00';
    });
    
    sheet.columns = [
      { width: 25 }, { width: 12 }, { width: 8 }, { width: 15 }, { width: 12 }, { width: 30 }
    ];
  }

  addExcelBudgetSheet(sheet, budgetTracking) {
    const headers = ['Category', 'Budget Amount', 'Actual Spend', 'Utilization', 'Variance', 'Status'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    
    budgetTracking.budgets.forEach((budget, rowIndex) => {
      const row = rowIndex + 2;
      sheet.getCell(row, 1).value = budget.category;
      sheet.getCell(row, 2).value = budget.budgetAmount;
      sheet.getCell(row, 3).value = budget.actualSpend;
      sheet.getCell(row, 4).value = budget.utilization / 100;
      sheet.getCell(row, 5).value = budget.variance;
      sheet.getCell(row, 6).value = budget.status.toUpperCase();
      
      sheet.getCell(row, 2).numFmt = '$#,##0.00';
      sheet.getCell(row, 3).numFmt = '$#,##0.00';
      sheet.getCell(row, 4).numFmt = '0.0%';
      sheet.getCell(row, 5).numFmt = '$#,##0.00';
      
      const statusCell = sheet.getCell(row, 6);
      if (budget.status === 'over') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
      } else if (budget.status === 'warning') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD93D' } };
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6BCF7F' } };
      }
    });
    
    sheet.columns = [
      { width: 20 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 10 }
    ];
  }

  addExcelTrendsSheet(sheet, trends) {
    const headers = ['Date', 'Amount', 'Count'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    
    trends.data.forEach((dataPoint, rowIndex) => {
      const row = rowIndex + 2;
      sheet.getCell(row, 1).value = dataPoint.date;
      sheet.getCell(row, 2).value = dataPoint.amount;
      sheet.getCell(row, 3).value = dataPoint.count;
      
      sheet.getCell(row, 2).numFmt = '$#,##0.00';
    });
    
    sheet.columns = [{ width: 12 }, { width: 12 }, { width: 8 }];
  }

  addExcelDetailsSheet(sheet, expenses) {
    const headers = ['Date', 'Vendor', 'Category', 'Amount', 'Employee', 'Department', 'Description', 'Tax Deductible'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    
    expenses.forEach((expense, rowIndex) => {
      const row = rowIndex + 2;
      sheet.getCell(row, 1).value = new Date(expense.date);
      sheet.getCell(row, 2).value = expense.vendor || 'N/A';
      sheet.getCell(row, 3).value = expense.category || 'N/A';
      sheet.getCell(row, 4).value = parseFloat(expense.amount);
      sheet.getCell(row, 5).value = expense.employee?.name || 'N/A';
      sheet.getCell(row, 6).value = expense.employee?.department || 'N/A';
      sheet.getCell(row, 7).value = expense.description || 'N/A';
      sheet.getCell(row, 8).value = expense.isTaxDeductible ? 'Yes' : 'No';
      
      sheet.getCell(row, 1).numFmt = 'mm/dd/yyyy';
      sheet.getCell(row, 4).numFmt = '$#,##0.00';
    });
    
    sheet.columns = [
      { width: 12 }, { width: 20 }, { width: 15 }, { width: 12 }, 
      { width: 15 }, { width: 15 }, { width: 25 }, { width: 12 }
    ];
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  calculateNextRunDate(frequency, dayOfWeek, dayOfMonth) {
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        const daysUntilTarget = (dayOfWeek - nextRun.getDay() + 7) % 7;
        nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7));
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(dayOfMonth);
        break;
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3);
        nextRun.setDate(1);
        break;
    }
    
    return nextRun;
  }

  generateDateRange(frequency) {
    const now = new Date();
    let dateFrom, dateTo;
    
    switch (frequency) {
      case 'daily':
        dateFrom = new Date(now);
        dateFrom.setDate(dateFrom.getDate() - 1);
        dateTo = new Date(now);
        break;
      case 'weekly':
        dateFrom = new Date(now);
        dateFrom.setDate(dateFrom.getDate() - 7);
        dateTo = new Date(now);
        break;
      case 'monthly':
        dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        dateTo = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        dateFrom = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
        dateTo = new Date(now.getFullYear(), quarter * 3, 0);
        break;
    }
    
    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0]
    };
  }
}

module.exports = ReportGenerationService; 