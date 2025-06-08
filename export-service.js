const XLSX = require('xlsx');
const jsPDF = require('jspdf');
require('jspdf-autotable');
const fs = require('fs');
const path = require('path');

class ExportService {
  constructor() {
    // Ensure exports directory exists
    this.exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  // Export expenses to Excel
  exportExpensesToExcel(expenses, filename = 'expenses') {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = expenses.map(expense => ({
        'ID': expense.id,
        'Title': expense.title,
        'Amount': expense.amount,
        'Currency': expense.currency,
        'Category': expense.category,
        'Date': new Date(expense.date).toLocaleDateString(),
        'Status': expense.status,
        'Employee': expense.employeeName || 'N/A',
        'Description': expense.description,
        'Submitted': new Date(expense.submittedAt).toLocaleDateString(),
        'Receipt': expense.receiptUrl ? 'Yes' : 'No'
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const colWidths = [
        { wch: 10 }, // ID
        { wch: 30 }, // Title
        { wch: 12 }, // Amount
        { wch: 8 },  // Currency
        { wch: 20 }, // Category
        { wch: 12 }, // Date
        { wch: 12 }, // Status
        { wch: 20 }, // Employee
        { wch: 40 }, // Description
        { wch: 12 }, // Submitted
        { wch: 8 }   // Receipt
      ];
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

      // Generate file
      const filepath = path.join(this.exportsDir, `${filename}_${Date.now()}.xlsx`);
      XLSX.writeFile(workbook, filepath);

      return {
        success: true,
        filepath,
        filename: path.basename(filepath),
        size: fs.statSync(filepath).size
      };
    } catch (error) {
      console.error('Excel export error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Export expenses to PDF
  exportExpensesToPDF(expenses, filename = 'expenses') {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Expense Report', 20, 20);
      
      // Add generation date
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text(`Total Expenses: ${expenses.length}`, 20, 40);
      
      // Calculate totals
      const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      doc.text(`Total Amount: ${totalAmount.toLocaleString()} PLN`, 20, 50);

      // Prepare table data
      const tableData = expenses.map(expense => [
        expense.id,
        expense.title.substring(0, 25) + (expense.title.length > 25 ? '...' : ''),
        `${expense.amount.toLocaleString()} ${expense.currency}`,
        expense.category,
        new Date(expense.date).toLocaleDateString(),
        expense.status,
        expense.employeeName || 'N/A'
      ]);

      // Add table
      doc.autoTable({
        head: [['ID', 'Title', 'Amount', 'Category', 'Date', 'Status', 'Employee']],
        body: tableData,
        startY: 60,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      // Save file
      const filepath = path.join(this.exportsDir, `${filename}_${Date.now()}.pdf`);
      doc.save(filepath);

      return {
        success: true,
        filepath,
        filename: path.basename(filepath),
        size: fs.statSync(filepath).size
      };
    } catch (error) {
      console.error('PDF export error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Export to CSV
  exportToCSV(data, filename = 'export') {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      const filepath = path.join(this.exportsDir, `${filename}_${Date.now()}.csv`);
      XLSX.writeFile(workbook, filepath, { bookType: 'csv' });

      return {
        success: true,
        filepath,
        filename: path.basename(filepath),
        size: fs.statSync(filepath).size
      };
    } catch (error) {
      console.error('CSV export error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Export analytics report
  exportAnalyticsReport(analyticsData, format = 'pdf') {
    try {
      if (format === 'pdf') {
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.text('Analytics Report', 20, 20);
        
        // Overview
        doc.setFontSize(14);
        doc.text('Overview', 20, 40);
        doc.setFontSize(12);
        doc.text(`Total Expenses: ${analyticsData.overview.totalExpenses}`, 20, 50);
        doc.text(`Total Amount: ${analyticsData.overview.totalAmount.toLocaleString()} PLN`, 20, 60);
        doc.text(`Average Expense: ${analyticsData.overview.averageExpense.toLocaleString()} PLN`, 20, 70);
        doc.text(`Monthly Growth: ${analyticsData.overview.monthlyGrowth}%`, 20, 80);

        // Category breakdown
        doc.setFontSize(14);
        doc.text('Category Breakdown', 20, 100);
        
        const categoryData = analyticsData.categoryBreakdown.map(cat => [
          cat.category,
          `${cat.amount.toLocaleString()} PLN`,
          `${cat.percentage}%`,
          cat.count.toString()
        ]);

        doc.autoTable({
          head: [['Category', 'Amount', 'Percentage', 'Count']],
          body: categoryData,
          startY: 110,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });

        const filepath = path.join(this.exportsDir, `analytics_report_${Date.now()}.pdf`);
        doc.save(filepath);

        return {
          success: true,
          filepath,
          filename: path.basename(filepath),
          size: fs.statSync(filepath).size
        };
      } else {
        // Excel format
        const workbook = XLSX.utils.book_new();
        
        // Overview sheet
        const overviewData = [
          ['Metric', 'Value'],
          ['Total Expenses', analyticsData.overview.totalExpenses],
          ['Total Amount (PLN)', analyticsData.overview.totalAmount],
          ['Average Expense (PLN)', analyticsData.overview.averageExpense],
          ['Monthly Growth (%)', analyticsData.overview.monthlyGrowth]
        ];
        const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

        // Category breakdown sheet
        const categorySheet = XLSX.utils.json_to_sheet(analyticsData.categoryBreakdown);
        XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');

        // Monthly trends sheet
        const trendsSheet = XLSX.utils.json_to_sheet(analyticsData.monthlyTrends);
        XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Monthly Trends');

        const filepath = path.join(this.exportsDir, `analytics_report_${Date.now()}.xlsx`);
        XLSX.writeFile(workbook, filepath);

        return {
          success: true,
          filepath,
          filename: path.basename(filepath),
          size: fs.statSync(filepath).size
        };
      }
    } catch (error) {
      console.error('Analytics export error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Clean up old export files (older than 24 hours)
  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.exportsDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      files.forEach(file => {
        const filepath = path.join(this.exportsDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filepath);
          console.log(`Cleaned up old export file: ${file}`);
        }
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Get file for download
  getExportFile(filename) {
    const filepath = path.join(this.exportsDir, filename);
    if (fs.existsSync(filepath)) {
      return {
        success: true,
        filepath,
        size: fs.statSync(filepath).size
      };
    }
    return {
      success: false,
      error: 'File not found'
    };
  }
}

module.exports = new ExportService(); 