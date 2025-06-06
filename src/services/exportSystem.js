const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const csv = require('csv-stringify');
const xlsx = require('xlsx');
const xmlbuilder = require('xmlbuilder');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const logger = require('../utils/logger');
const { formatCurrency, formatDate } = require('../utils/i18n');

/**
 * Comprehensive Export System
 * Flexible data export with customizable templates for international accounting software
 */
class ExportSystem {
  constructor(prisma) {
    this.prisma = prisma;
    this.exportTemplates = this.initializeExportTemplates();
    this.accountingSoftwareFormats = this.initializeAccountingSoftwareFormats();
    this.taxReportFormats = this.initializeTaxReportFormats();
    this.exportFormats = ['csv', 'xlsx', 'xml', 'pdf', 'json'];
  }

  /**
   * Initialize export templates for different purposes
   */
  initializeExportTemplates() {
    return {
      // Standard expense export templates
      expense_summary: {
        name: 'Expense Summary',
        description: 'Basic expense report with totals',
        fields: [
          'transaction_date', 'merchant_name', 'amount', 'currency', 
          'category', 'description', 'user_name', 'status'
        ],
        groupBy: ['category'],
        includeSubtotals: true
      },
      
      expense_detailed: {
        name: 'Detailed Expense Report',
        description: 'Complete expense information including tax details',
        fields: [
          'transaction_date', 'merchant_name', 'amount', 'currency', 
          'tax_amount', 'net_amount', 'tax_rate', 'category', 
          'description', 'user_name', 'approval_status', 'receipt_number',
          'payment_method', 'business_purpose'
        ],
        groupBy: ['user', 'category'],
        includeSubtotals: true,
        includeTaxSummary: true
      },
      
      // Bank statement export templates
      bank_transactions: {
        name: 'Bank Transactions',
        description: 'Bank transaction export with reconciliation status',
        fields: [
          'transaction_date', 'description', 'amount', 'balance',
          'reference_number', 'matching_status', 'matched_expense'
        ],
        groupBy: ['account'],
        includeBalances: true
      },
      
      // Reconciliation templates
      reconciliation_report: {
        name: 'Reconciliation Report',
        description: 'Expense to bank transaction matching report',
        fields: [
          'expense_date', 'expense_amount', 'expense_merchant',
          'bank_date', 'bank_amount', 'bank_description',
          'match_score', 'match_status', 'variance'
        ],
        groupBy: ['match_status'],
        includeMatchingStats: true
      },
      
      // Tax report templates
      vat_report: {
        name: 'VAT Report',
        description: 'VAT summary for tax reporting',
        fields: [
          'transaction_date', 'merchant_name', 'invoice_number',
          'net_amount', 'vat_rate', 'vat_amount', 'gross_amount',
          'tax_id', 'category'
        ],
        groupBy: ['vat_rate'],
        includeTaxSummary: true,
        vatSpecific: true
      }
    };
  }

  /**
   * Initialize accounting software specific formats
   */
  initializeAccountingSoftwareFormats() {
    return {
      quickbooks: {
        name: 'QuickBooks',
        format: 'csv',
        delimiter: ',',
        dateFormat: 'MM/DD/YYYY',
        currencyFormat: 'symbol',
        requiredFields: [
          'Date', 'Description', 'Amount', 'Account', 'Class', 'Customer:Job'
        ],
        fieldMapping: {
          'transaction_date': 'Date',
          'description': 'Description',
          'amount': 'Amount',
          'category': 'Account',
          'user_name': 'Class',
          'merchant_name': 'Customer:Job'
        }
      },
      
      xero: {
        name: 'Xero',
        format: 'csv',
        delimiter: ',',
        dateFormat: 'DD/MM/YYYY',
        currencyFormat: 'amount_only',
        requiredFields: [
          'Date', 'Description', 'Reference', 'Amount', 'Account', 'Tax Type'
        ],
        fieldMapping: {
          'transaction_date': 'Date',
          'description': 'Description',
          'invoice_number': 'Reference',
          'amount': 'Amount',
          'category': 'Account',
          'tax_rate': 'Tax Type'
        }
      },
      
      sage: {
        name: 'Sage',
        format: 'csv',
        delimiter: ',',
        dateFormat: 'DD/MM/YYYY',
        currencyFormat: 'amount_only',
        requiredFields: [
          'Date', 'Description', 'Net Amount', 'VAT Amount', 'Gross Amount', 'Department'
        ],
        fieldMapping: {
          'transaction_date': 'Date',
          'description': 'Description',
          'net_amount': 'Net Amount',
          'tax_amount': 'VAT Amount',
          'amount': 'Gross Amount',
          'category': 'Department'
        }
      },
      
      sap: {
        name: 'SAP',
        format: 'xml',
        dateFormat: 'YYYY-MM-DD',
        currencyFormat: 'iso_code',
        schema: 'sap_concur',
        rootElement: 'ExpenseReport',
        fieldMapping: {
          'transaction_date': 'TransactionDate',
          'merchant_name': 'Vendor',
          'amount': 'Amount',
          'currency': 'CurrencyCode',
          'category': 'ExpenseType',
          'description': 'Description'
        }
      },
      
      // Polish accounting software
      comarch_optima: {
        name: 'Comarch Optima',
        format: 'csv',
        delimiter: ';',
        dateFormat: 'YYYY-MM-DD',
        currencyFormat: 'amount_only',
        encoding: 'windows-1250',
        requiredFields: [
          'Data', 'Opis', 'Kwota_netto', 'Stawka_VAT', 'Kwota_VAT', 'Kwota_brutto'
        ],
        fieldMapping: {
          'transaction_date': 'Data',
          'description': 'Opis',
          'net_amount': 'Kwota_netto',
          'tax_rate': 'Stawka_VAT',
          'tax_amount': 'Kwota_VAT',
          'amount': 'Kwota_brutto'
        }
      },
      
      symfonia: {
        name: 'Symfonia',
        format: 'csv',
        delimiter: ';',
        dateFormat: 'DD.MM.YYYY',
        currencyFormat: 'amount_only',
        encoding: 'utf-8',
        requiredFields: [
          'Data operacji', 'Kontrahent', 'Numer faktury', 'Wartość netto', 'VAT', 'Wartość brutto'
        ],
        fieldMapping: {
          'transaction_date': 'Data operacji',
          'merchant_name': 'Kontrahent',
          'invoice_number': 'Numer faktury',
          'net_amount': 'Wartość netto',
          'tax_amount': 'VAT',
          'amount': 'Wartość brutto'
        }
      }
    };
  }

  /**
   * Initialize tax report formats for different countries
   */
  initializeTaxReportFormats() {
    return {
      poland_vat: {
        name: 'Poland VAT Report (JPK_VAT)',
        format: 'xml',
        schema: 'jpk_vat',
        namespace: 'http://jpk.mf.gov.pl/wzor/2017/11/13/1113/',
        dateFormat: 'YYYY-MM-DD',
        currencyFormat: 'amount_only',
        requiredFields: [
          'LpSprzedazy', 'NrKontrahenta', 'NazwaKontrahenta', 'AdresKontrahenta',
          'DowodSprzedazy', 'DataWystawienia', 'DataSprzedazy', 'K_10', 'K_11'
        ]
      },
      
      germany_vat: {
        name: 'Germany VAT Report (USt)',
        format: 'xml',
        schema: 'elster',
        dateFormat: 'YYYY-MM-DD',
        currencyFormat: 'amount_only',
        requiredFields: [
          'Datum', 'Belegnummer', 'Geschäftspartner', 'Nettobetrag', 'Steuersatz', 'Steuerbetrag'
        ]
      },
      
      uk_vat: {
        name: 'UK VAT Return (MTD)',
        format: 'json',
        dateFormat: 'YYYY-MM-DD',
        currencyFormat: 'pence',
        apiFormat: 'hmrc_mtd',
        requiredFields: [
          'vatDueSales', 'vatDueAcquisitions', 'totalVatDue', 'vatReclaimedCurrPeriod'
        ]
      }
    };
  }

  /**
   * Main export method
   */
  async exportData(tenantId, exportRequest) {
    try {
      const {
        dataType, // 'expenses', 'transactions', 'reconciliation', 'vat'
        format, // 'csv', 'xlsx', 'xml', 'pdf'
        template, // Template name or custom template
        filters = {},
        accountingSoftware = null,
        taxReportType = null,
        includeDocuments = false,
        locale = 'en-US'
      } = exportRequest;

      logger.info(`Starting export: ${dataType} in ${format} format for tenant ${tenantId}`);

      // Validate export request
      this.validateExportRequest(exportRequest);

      // Get data based on type and filters
      const data = await this.getData(tenantId, dataType, filters);

      // Determine template to use
      const exportTemplate = this.getExportTemplate(template, accountingSoftware, taxReportType);

      // Process data according to template
      const processedData = await this.processData(data, exportTemplate, locale);

      // Generate export file
      const exportResult = await this.generateExport(processedData, format, exportTemplate, {
        includeDocuments,
        locale,
        tenantId
      });

      // Log export activity
      await this.logExportActivity(tenantId, exportRequest, exportResult);

      return exportResult;

    } catch (error) {
      logger.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Validate export request
   */
  validateExportRequest(request) {
    const { dataType, format, filters } = request;

    // Validate data type
    const validDataTypes = ['expenses', 'transactions', 'reconciliation', 'vat', 'reports'];
    if (!validDataTypes.includes(dataType)) {
      throw new Error(`Invalid data type: ${dataType}`);
    }

    // Validate format
    if (!this.exportFormats.includes(format)) {
      throw new Error(`Invalid export format: ${format}`);
    }

    // Validate date range
    if (filters.dateFrom && filters.dateTo) {
      const startDate = moment(filters.dateFrom);
      const endDate = moment(filters.dateTo);
      
      if (!startDate.isValid() || !endDate.isValid()) {
        throw new Error('Invalid date range');
      }
      
      if (endDate.isBefore(startDate)) {
        throw new Error('End date must be after start date');
      }
    }
  }

  /**
   * Get data based on type and filters
   */
  async getData(tenantId, dataType, filters) {
    const baseWhere = {
      tenantId,
      ...(filters.companyId && { companyId: filters.companyId }),
      ...(filters.userId && { userId: filters.userId })
    };

    // Add date filter if provided
    if (filters.dateFrom && filters.dateTo) {
      baseWhere.transactionDate = {
        gte: new Date(filters.dateFrom),
        lte: new Date(filters.dateTo)
      };
    }

    switch (dataType) {
      case 'expenses':
        return await this.getExpenseData(baseWhere, filters);
      
      case 'transactions':
        return await this.getTransactionData(baseWhere, filters);
      
      case 'reconciliation':
        return await this.getReconciliationData(baseWhere, filters);
      
      case 'vat':
        return await this.getVATData(baseWhere, filters);
      
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  /**
   * Get expense data with related information
   */
  async getExpenseData(baseWhere, filters) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        ...baseWhere,
        ...(filters.status && { status: filters.status }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.minAmount && { amount: { gte: filters.minAmount } }),
        ...(filters.maxAmount && { amount: { lte: filters.maxAmount } })
      },
      include: {
        category: true,
        user: {
          select: { id: true, name: true, email: true }
        },
        currency: true,
        document: {
          select: { fileName: true, filePath: true, previewImagePath: true }
        },
        bankTransaction: {
          select: { id: true, amount: true, description: true, transactionDate: true }
        },
        approvals: {
          include: {
            approver: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { transactionDate: 'desc' }
    });

    return this.formatExpenseData(expenses);
  }

  /**
   * Get bank transaction data
   */
  async getTransactionData(baseWhere, filters) {
    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        ...baseWhere,
        ...(filters.accountId && { accountId: filters.accountId }),
        ...(filters.matchingStatus && { matchingStatus: filters.matchingStatus })
      },
      include: {
        currency: true,
        expense: {
          select: { id: true, amount: true, merchantName: true, description: true }
        }
      },
      orderBy: { transactionDate: 'desc' }
    });

    return this.formatTransactionData(transactions);
  }

  /**
   * Get reconciliation data
   */
  async getReconciliationData(baseWhere, filters) {
    const matches = await this.prisma.expenseTransactionMatch.findMany({
      where: {
        tenantId: baseWhere.tenantId,
        ...(filters.status && { status: filters.status }),
        ...(filters.confidence && { confidence: filters.confidence })
      },
      include: {
        expense: {
          include: {
            category: true,
            user: { select: { name: true } },
            currency: true
          }
        },
        bankTransaction: {
          include: {
            currency: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return this.formatReconciliationData(matches);
  }

  /**
   * Get VAT data for tax reporting
   */
  async getVATData(baseWhere, filters) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        ...baseWhere,
        taxAmount: { not: null },
        taxId: { not: null }
      },
      include: {
        category: true,
        currency: true,
        document: {
          select: { fileName: true }
        }
      },
      orderBy: { transactionDate: 'desc' }
    });

    return this.formatVATData(expenses);
  }

  /**
   * Get appropriate export template
   */
  getExportTemplate(templateName, accountingSoftware, taxReportType) {
    // Priority: accounting software > tax report > custom template > default template
    if (accountingSoftware && this.accountingSoftwareFormats[accountingSoftware]) {
      return {
        ...this.accountingSoftwareFormats[accountingSoftware],
        type: 'accounting_software'
      };
    }

    if (taxReportType && this.taxReportFormats[taxReportType]) {
      return {
        ...this.taxReportFormats[taxReportType],
        type: 'tax_report'
      };
    }

    if (templateName && this.exportTemplates[templateName]) {
      return {
        ...this.exportTemplates[templateName],
        type: 'standard'
      };
    }

    // Default template
    return {
      ...this.exportTemplates.expense_summary,
      type: 'standard'
    };
  }

  /**
   * Process data according to template
   */
  async processData(data, template, locale) {
    // Apply field mapping
    const mappedData = this.applyFieldMapping(data, template);

    // Apply formatting
    const formattedData = this.applyFormatting(mappedData, template, locale);

    // Apply grouping if specified
    const groupedData = this.applyGrouping(formattedData, template);

    // Calculate subtotals if needed
    const processedData = this.calculateSubtotals(groupedData, template);

    return {
      data: processedData,
      metadata: {
        totalRecords: data.length,
        processedAt: new Date().toISOString(),
        template: template.name || 'Custom',
        locale
      }
    };
  }

  /**
   * Apply field mapping based on template
   */
  applyFieldMapping(data, template) {
    if (!template.fieldMapping) {
      return data;
    }

    return data.map(record => {
      const mappedRecord = {};
      
      for (const [sourceField, targetField] of Object.entries(template.fieldMapping)) {
        if (record[sourceField] !== undefined) {
          mappedRecord[targetField] = record[sourceField];
        }
      }
      
      // Include unmapped fields if not strict mapping
      if (!template.strictMapping) {
        for (const [key, value] of Object.entries(record)) {
          if (!template.fieldMapping[key]) {
            mappedRecord[key] = value;
          }
        }
      }
      
      return mappedRecord;
    });
  }

  /**
   * Apply formatting based on template
   */
  applyFormatting(data, template, locale) {
    return data.map(record => {
      const formattedRecord = { ...record };

      // Format dates
      for (const [key, value] of Object.entries(formattedRecord)) {
        if (key.includes('date') || key.includes('Date')) {
          if (value && moment(value).isValid()) {
            formattedRecord[key] = moment(value).format(template.dateFormat || 'YYYY-MM-DD');
          }
        }
      }

      // Format currency amounts
      for (const [key, value] of Object.entries(formattedRecord)) {
        if ((key.includes('amount') || key.includes('Amount')) && typeof value === 'number') {
          switch (template.currencyFormat) {
            case 'symbol':
              formattedRecord[key] = formatCurrency(value, record.currency || 'PLN', locale);
              break;
            case 'amount_only':
              formattedRecord[key] = value.toFixed(2);
              break;
            case 'iso_code':
              formattedRecord[key] = `${value.toFixed(2)} ${record.currency || 'PLN'}`;
              break;
            case 'pence':
              formattedRecord[key] = Math.round(value * 100); // Convert to pence
              break;
            default:
              formattedRecord[key] = value.toFixed(2);
          }
        }
      }

      return formattedRecord;
    });
  }

  /**
   * Apply grouping based on template
   */
  applyGrouping(data, template) {
    if (!template.groupBy || !Array.isArray(template.groupBy)) {
      return { ungrouped: data };
    }

    const grouped = {};
    
    for (const record of data) {
      let groupKey = template.groupBy.map(field => record[field] || 'Unknown').join(' - ');
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      
      grouped[groupKey].push(record);
    }

    return grouped;
  }

  /**
   * Calculate subtotals if needed
   */
  calculateSubtotals(data, template) {
    if (!template.includeSubtotals) {
      return data;
    }

    const processedData = {};

    for (const [groupKey, records] of Object.entries(data)) {
      const subtotals = this.calculateGroupSubtotals(records);
      
      processedData[groupKey] = {
        records,
        subtotals
      };
    }

    return processedData;
  }

  /**
   * Calculate subtotals for a group of records
   */
  calculateGroupSubtotals(records) {
    const subtotals = {
      count: records.length,
      totalAmount: 0,
      totalTaxAmount: 0,
      totalNetAmount: 0
    };

    for (const record of records) {
      if (typeof record.amount === 'number') {
        subtotals.totalAmount += record.amount;
      }
      if (typeof record.tax_amount === 'number') {
        subtotals.totalTaxAmount += record.tax_amount;
      }
      if (typeof record.net_amount === 'number') {
        subtotals.totalNetAmount += record.net_amount;
      }
    }

    return subtotals;
  }

  /**
   * Generate export file based on format
   */
  async generateExport(processedData, format, template, options = {}) {
    const { includeDocuments, locale, tenantId } = options;
    
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const fileName = `export_${template.type || 'data'}_${timestamp}`;

    switch (format) {
      case 'csv':
        return await this.generateCSV(processedData, template, fileName);
      
      case 'xlsx':
        return await this.generateExcel(processedData, template, fileName);
      
      case 'xml':
        return await this.generateXML(processedData, template, fileName);
      
      case 'pdf':
        return await this.generatePDF(processedData, template, fileName, locale);
      
      case 'json':
        return await this.generateJSON(processedData, template, fileName);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate CSV export
   */
  async generateCSV(processedData, template, fileName) {
    const csvPath = path.join(process.cwd(), 'exports', `${fileName}.csv`);
    await fs.ensureDir(path.dirname(csvPath));

    const csvOptions = {
      delimiter: template.delimiter || ',',
      header: true,
      encoding: template.encoding || 'utf8'
    };

    const flatData = this.flattenGroupedData(processedData.data);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(csvPath);
      
      csv(flatData, csvOptions, (err, csvString) => {
        if (err) {
          reject(err);
          return;
        }
        
        output.write(csvString);
        output.end();
        
        resolve({
          format: 'csv',
          fileName: `${fileName}.csv`,
          filePath: csvPath,
          size: Buffer.byteLength(csvString),
          metadata: processedData.metadata
        });
      });
    });
  }

  /**
   * Generate Excel export
   */
  async generateExcel(processedData, template, fileName) {
    const excelPath = path.join(process.cwd(), 'exports', `${fileName}.xlsx`);
    await fs.ensureDir(path.dirname(excelPath));

    const workbook = xlsx.utils.book_new();
    
    if (template.includeSubtotals && typeof processedData.data === 'object') {
      // Create separate sheets for each group
      for (const [groupName, groupData] of Object.entries(processedData.data)) {
        const worksheet = xlsx.utils.json_to_sheet(groupData.records || groupData);
        
        // Add subtotals if available
        if (groupData.subtotals) {
          const subtotalRows = Object.entries(groupData.subtotals).map(([key, value]) => ({
            description: key,
            value: value
          }));
          
          const subtotalSheet = xlsx.utils.json_to_sheet(subtotalRows);
          xlsx.utils.book_append_sheet(workbook, subtotalSheet, `${groupName}_Summary`);
        }
        
        xlsx.utils.book_append_sheet(workbook, worksheet, groupName.substring(0, 31));
      }
    } else {
      // Single sheet
      const flatData = this.flattenGroupedData(processedData.data);
      const worksheet = xlsx.utils.json_to_sheet(flatData);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Export');
    }

    // Add metadata sheet
    const metadataSheet = xlsx.utils.json_to_sheet([processedData.metadata]);
    xlsx.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    xlsx.writeFile(workbook, excelPath);
    
    const stats = await fs.stat(excelPath);
    
    return {
      format: 'xlsx',
      fileName: `${fileName}.xlsx`,
      filePath: excelPath,
      size: stats.size,
      metadata: processedData.metadata
    };
  }

  /**
   * Generate XML export
   */
  async generateXML(processedData, template, fileName) {
    const xmlPath = path.join(process.cwd(), 'exports', `${fileName}.xml`);
    await fs.ensureDir(path.dirname(xmlPath));

    let xml;
    
    if (template.schema === 'jpk_vat') {
      xml = this.generateJPKVATXML(processedData, template);
    } else if (template.schema === 'sap_concur') {
      xml = this.generateSAPConcurXML(processedData, template);
    } else {
      xml = this.generateGenericXML(processedData, template);
    }

    await fs.writeFile(xmlPath, xml, 'utf8');
    
    const stats = await fs.stat(xmlPath);
    
    return {
      format: 'xml',
      fileName: `${fileName}.xml`,
      filePath: xmlPath,
      size: stats.size,
      metadata: processedData.metadata
    };
  }

  /**
   * Generate PDF export
   */
  async generatePDF(processedData, template, fileName, locale) {
    const pdfPath = path.join(process.cwd(), 'exports', `${fileName}.pdf`);
    await fs.ensureDir(path.dirname(pdfPath));

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Add header
    doc.fontSize(16).text(`${template.name || 'Export Report'}`, 50, 50);
    doc.fontSize(10).text(`Generated: ${formatDate(new Date(), locale)}`, 50, 80);
    
    // Add data
    let yPosition = 120;
    const flatData = this.flattenGroupedData(processedData.data);
    
    // Add table headers
    const headers = flatData.length > 0 ? Object.keys(flatData[0]) : [];
    const columnWidth = (doc.page.width - 100) / headers.length;
    
    headers.forEach((header, index) => {
      doc.text(header, 50 + (index * columnWidth), yPosition, { width: columnWidth });
    });
    
    yPosition += 20;
    
    // Add data rows
    flatData.slice(0, 50).forEach(row => { // Limit for PDF performance
      headers.forEach((header, index) => {
        const value = row[header] || '';
        doc.text(String(value).substring(0, 20), 50 + (index * columnWidth), yPosition, { 
          width: columnWidth,
          ellipsis: true
        });
      });
      yPosition += 15;
      
      if (yPosition > doc.page.height - 50) {
        doc.addPage();
        yPosition = 50;
      }
    });

    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', async () => {
        try {
          const stats = await fs.stat(pdfPath);
          resolve({
            format: 'pdf',
            fileName: `${fileName}.pdf`,
            filePath: pdfPath,
            size: stats.size,
            metadata: processedData.metadata
          });
        } catch (error) {
          reject(error);
        }
      });
      
      stream.on('error', reject);
    });
  }

  /**
   * Generate JSON export
   */
  async generateJSON(processedData, template, fileName) {
    const jsonPath = path.join(process.cwd(), 'exports', `${fileName}.json`);
    await fs.ensureDir(path.dirname(jsonPath));

    const jsonData = {
      export: {
        template: template.name || 'Custom',
        generatedAt: new Date().toISOString(),
        data: processedData.data,
        metadata: processedData.metadata
      }
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    await fs.writeFile(jsonPath, jsonString, 'utf8');
    
    return {
      format: 'json',
      fileName: `${fileName}.json`,
      filePath: jsonPath,
      size: Buffer.byteLength(jsonString),
      metadata: processedData.metadata
    };
  }

  // Helper methods for data formatting...

  formatExpenseData(expenses) {
    return expenses.map(expense => ({
      id: expense.id,
      transaction_date: expense.transactionDate,
      merchant_name: expense.merchantName,
      amount: expense.amount,
      currency: expense.currency?.code || 'PLN',
      tax_amount: expense.taxAmount,
      net_amount: expense.amount - (expense.taxAmount || 0),
      tax_rate: expense.taxAmount ? ((expense.taxAmount / (expense.amount - expense.taxAmount)) * 100).toFixed(0) + '%' : null,
      category: expense.category?.name || 'Uncategorized',
      description: expense.description,
      user_name: expense.user?.name || 'Unknown',
      user_email: expense.user?.email,
      status: expense.status,
      approval_status: expense.approvals?.[0]?.status || 'PENDING',
      receipt_number: expense.invoiceNumber,
      tax_id: expense.taxId,
      document_filename: expense.document?.fileName,
      created_at: expense.createdAt,
      updated_at: expense.updatedAt
    }));
  }

  formatTransactionData(transactions) {
    return transactions.map(transaction => ({
      id: transaction.id,
      transaction_date: transaction.transactionDate,
      description: transaction.description,
      amount: transaction.amount,
      balance: transaction.balance,
      currency: transaction.currency?.code || 'PLN',
      reference_number: transaction.referenceNumber,
      matching_status: transaction.matchingStatus || 'UNMATCHED',
      matched_expense: transaction.expense?.id || null,
      matched_expense_amount: transaction.expense?.amount || null,
      matched_expense_merchant: transaction.expense?.merchantName || null
    }));
  }

  formatReconciliationData(matches) {
    return matches.map(match => ({
      match_id: match.id,
      expense_id: match.expense.id,
      expense_date: match.expense.transactionDate,
      expense_amount: match.expense.amount,
      expense_merchant: match.expense.merchantName,
      expense_category: match.expense.category?.name,
      expense_user: match.expense.user?.name,
      bank_id: match.bankTransaction.id,
      bank_date: match.bankTransaction.transactionDate,
      bank_amount: match.bankTransaction.amount,
      bank_description: match.bankTransaction.description,
      match_score: match.matchScore,
      match_status: match.status,
      confidence: match.confidence,
      amount_variance: Math.abs(match.expense.amount - Math.abs(match.bankTransaction.amount)),
      date_variance: Math.abs(moment(match.expense.transactionDate).diff(moment(match.bankTransaction.transactionDate), 'days')),
      created_at: match.createdAt
    }));
  }

  formatVATData(expenses) {
    return expenses.map(expense => ({
      transaction_date: expense.transactionDate,
      merchant_name: expense.merchantName,
      invoice_number: expense.invoiceNumber,
      tax_id: expense.taxId,
      net_amount: expense.amount - (expense.taxAmount || 0),
      vat_rate: expense.taxAmount ? ((expense.taxAmount / (expense.amount - expense.taxAmount)) * 100).toFixed(0) + '%' : '0%',
      vat_amount: expense.taxAmount || 0,
      gross_amount: expense.amount,
      category: expense.category?.name,
      currency: expense.currency?.code || 'PLN',
      document_filename: expense.document?.fileName
    }));
  }

  flattenGroupedData(data) {
    if (Array.isArray(data)) {
      return data;
    }

    const flattened = [];
    for (const [groupKey, groupData] of Object.entries(data)) {
      const records = groupData.records || groupData;
      flattened.push(...records);
    }
    
    return flattened;
  }

  // XML generation methods...

  generateJPKVATXML(processedData, template) {
    const root = xmlbuilder.create('JPK', { encoding: 'UTF-8' })
      .att('xmlns', template.namespace);
    
    const header = root.ele('Naglowek');
    header.ele('KodFormularza', 'JPK_VAT');
    header.ele('WariantFormularza', '3');
    header.ele('CelZlozenia', '1');
    header.ele('DataWytworzeniaJPK', moment().format('YYYY-MM-DDTHH:mm:ss'));
    
    const flatData = this.flattenGroupedData(processedData.data);
    
    const salesSection = root.ele('SprzedazWiersz');
    flatData.forEach((record, index) => {
      const sale = salesSection.ele('SprzedazWiersz');
      sale.ele('LpSprzedazy', index + 1);
      sale.ele('NazwaKontrahenta', record.merchant_name || '');
      sale.ele('DowodSprzedazy', record.invoice_number || '');
      sale.ele('DataSprzedazy', record.transaction_date);
      sale.ele('K_10', record.net_amount || 0);
      sale.ele('K_11', record.vat_amount || 0);
    });
    
    return root.end({ pretty: true });
  }

  generateSAPConcurXML(processedData, template) {
    const root = xmlbuilder.create('ExpenseReport', { encoding: 'UTF-8' });
    
    const flatData = this.flattenGroupedData(processedData.data);
    
    flatData.forEach(record => {
      const expense = root.ele('Expense');
      expense.ele('TransactionDate', record.transaction_date);
      expense.ele('Vendor', record.merchant_name || '');
      expense.ele('Amount', record.amount || 0);
      expense.ele('CurrencyCode', record.currency || 'PLN');
      expense.ele('ExpenseType', record.category || '');
      expense.ele('Description', record.description || '');
    });
    
    return root.end({ pretty: true });
  }

  generateGenericXML(processedData, template) {
    const root = xmlbuilder.create('Export', { encoding: 'UTF-8' });
    
    const metadata = root.ele('Metadata');
    metadata.ele('GeneratedAt', new Date().toISOString());
    metadata.ele('Template', template.name || 'Custom');
    metadata.ele('RecordCount', processedData.metadata.totalRecords);
    
    const data = root.ele('Data');
    const flatData = this.flattenGroupedData(processedData.data);
    
    flatData.forEach(record => {
      const item = data.ele('Item');
      for (const [key, value] of Object.entries(record)) {
        item.ele(key.replace(/[^a-zA-Z0-9]/g, '_'), value || '');
      }
    });
    
    return root.end({ pretty: true });
  }

  /**
   * Log export activity
   */
  async logExportActivity(tenantId, exportRequest, exportResult) {
    try {
      await this.prisma.exportLog.create({
        data: {
          tenantId,
          dataType: exportRequest.dataType,
          format: exportRequest.format,
          template: exportRequest.template,
          accountingSoftware: exportRequest.accountingSoftware,
          fileName: exportResult.fileName,
          fileSize: exportResult.size,
          recordCount: exportResult.metadata.totalRecords,
          filters: exportRequest.filters,
          exportedAt: new Date()
        }
      });
    } catch (error) {
      logger.warn('Failed to log export activity:', error);
    }
  }

  /**
   * Get export history
   */
  async getExportHistory(tenantId, options = {}) {
    const { limit = 50, offset = 0, dataType = null } = options;
    
    return await this.prisma.exportLog.findMany({
      where: {
        tenantId,
        ...(dataType && { dataType })
      },
      orderBy: { exportedAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(maxAgeHours = 72) {
    try {
      const exportsDir = path.join(process.cwd(), 'exports');
      const cutoffTime = moment().subtract(maxAgeHours, 'hours');
      
      const files = await fs.readdir(exportsDir);
      
      for (const file of files) {
        const filePath = path.join(exportsDir, file);
        const stats = await fs.stat(filePath);
        
        if (moment(stats.mtime).isBefore(cutoffTime)) {
          await fs.unlink(filePath);
          logger.debug(`Cleaned up old export file: ${file}`);
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup old exports:', error);
    }
  }
}

module.exports = ExportSystem; 