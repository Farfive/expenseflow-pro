/**
 * Comprehensive Data Export Service
 * 
 * Supports multiple export formats for accounting systems:
 * - Standard formats: CSV, Excel, JSON, XML
 * - Custom templates using Handlebars
 * - Integration templates for QuickBooks, Xero, Sage
 * - Scheduled exports with node-cron
 * - Data validation and audit logging
 */

const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const archiver = require('archiver');

// Export format libraries
const csvWriter = require('csv-writer');
const XLSX = require('xlsx');
const xml2js = require('xml2js');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const jsPDF = require('jspdf').jsPDF;

// Validation libraries
const Joi = require('joi');
const yup = require('yup');

// Scheduling
const cron = require('node-cron');

// Database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ComprehensiveExportService {
  constructor() {
    this.exportFormats = {
      csv: this.exportCSV.bind(this),
      excel: this.exportExcel.bind(this),
      json: this.exportJSON.bind(this),
      xml: this.exportXML.bind(this),
      pdf: this.exportPDF.bind(this),
      custom: this.exportCustomTemplate.bind(this)
    };

    this.accountingSoftwareTemplates = new Map();
    this.scheduledExports = new Map();
    this.activeExports = new Map();

    // Initialize templates and validation schemas
    this.initializeAccountingTemplates();
    this.initializeValidationSchemas();
    this.initializeHandlebarsHelpers();
  }

  /**
   * Main export method - entry point for all exports
   */
  async exportData(options) {
    try {
      // Validate export request
      const validation = await this.validateExportRequest(options);
      if (!validation.valid) {
        throw new Error(`Export validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate unique export ID for tracking
      const exportId = this.generateExportId();
      
      // Log export start
      await this.logExportActivity(exportId, 'STARTED', options);

      // Set up progress tracking
      this.activeExports.set(exportId, {
        status: 'PROCESSING',
        progress: 0,
        startTime: new Date(),
        options
      });

      // Fetch data based on request
      const data = await this.fetchExportData(options);

      // Validate data before export
      const dataValidation = await this.validateExportData(data, options);
      if (!dataValidation.valid) {
        throw new Error(`Data validation failed: ${dataValidation.errors.join(', ')}`);
      }

      // Update progress
      this.updateExportProgress(exportId, 25);

      // Process export based on format
      const exportResult = await this.processExport(data, options, exportId);

      // Update progress
      this.updateExportProgress(exportId, 90);

      // Create audit record
      await this.createExportAuditRecord(exportId, exportResult, options);

      // Update progress to complete
      this.updateExportProgress(exportId, 100);
      this.activeExports.get(exportId).status = 'COMPLETED';

      // Log export completion
      await this.logExportActivity(exportId, 'COMPLETED', options, exportResult);

      return {
        success: true,
        exportId,
        ...exportResult
      };

    } catch (error) {
      console.error('Export error:', error);
      
      if (exportId) {
        this.activeExports.get(exportId).status = 'FAILED';
        await this.logExportActivity(exportId, 'FAILED', options, { error: error.message });
      }

      return {
        success: false,
        error: error.message,
        exportId
      };
    }
  }

  /**
   * CSV Export with customizable field mapping
   */
  async exportCSV(data, options, exportId) {
    const { fieldMapping, delimiter = ',', includeHeaders = true } = options.csvOptions || {};
    
    // Apply field mapping if provided
    const mappedData = fieldMapping ? this.applyFieldMapping(data, fieldMapping) : data;

    // Determine headers
    const headers = includeHeaders ? this.generateCSVHeaders(mappedData, fieldMapping) : null;

    // Create CSV file path
    const fileName = `export_${exportId}_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure export directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Create CSV writer
    const writer = csvWriter.createObjectWriter({
      path: filePath,
      header: headers,
      delimiter
    });

    // Write data
    await writer.writeRecords(mappedData);

    return {
      format: 'csv',
      fileName,
      filePath,
      recordCount: mappedData.length,
      fileSize: (await fs.stat(filePath)).size
    };
  }

  /**
   * Excel Export using XLSX library
   */
  async exportExcel(data, options, exportId) {
    const { sheetName = 'Export', includeHeaders = true, formatting = {} } = options.excelOptions || {};

    // Create new workbook
    const workbook = XLSX.utils.book_new();

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data, { 
      header: includeHeaders ? Object.keys(data[0] || {}) : undefined 
    });

    // Apply formatting if specified
    if (formatting.columnWidths) {
      worksheet['!cols'] = formatting.columnWidths.map(width => ({ width }));
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Create file path
    const fileName = `export_${exportId}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure export directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    XLSX.writeFile(workbook, filePath);

    return {
      format: 'excel',
      fileName,
      filePath,
      recordCount: data.length,
      fileSize: (await fs.stat(filePath)).size,
      sheets: [sheetName]
    };
  }

  /**
   * JSON Export with custom formatting
   */
  async exportJSON(data, options, exportId) {
    const { pretty = true, groupBy, metadata = true } = options.jsonOptions || {};

    let exportData = data;

    // Group data if requested
    if (groupBy) {
      exportData = this.groupDataBy(data, groupBy);
    }

    // Add metadata if requested
    const finalData = metadata ? {
      metadata: {
        exportId,
        timestamp: new Date().toISOString(),
        recordCount: Array.isArray(data) ? data.length : Object.keys(data).length,
        format: 'json',
        groupedBy: groupBy || null
      },
      data: exportData
    } : exportData;

    // Create file path
    const fileName = `export_${exportId}_${moment().format('YYYYMMDD_HHmmss')}.json`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure export directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write JSON file
    const jsonString = pretty ? JSON.stringify(finalData, null, 2) : JSON.stringify(finalData);
    await fs.writeFile(filePath, jsonString, 'utf8');

    return {
      format: 'json',
      fileName,
      filePath,
      recordCount: Array.isArray(data) ? data.length : Object.keys(data).length,
      fileSize: (await fs.stat(filePath)).size,
      pretty
    };
  }

  /**
   * XML Export using xml2js builder
   */
  async exportXML(data, options, exportId) {
    const { rootElement = 'export', recordElement = 'record', xmlOptions = {} } = options.xmlOptions || {};

    // Prepare XML structure
    const xmlData = {
      [rootElement]: {
        $: {
          exportId,
          timestamp: new Date().toISOString(),
          recordCount: data.length
        },
        [recordElement]: data
      }
    };

    // Create XML builder
    const builder = new xml2js.Builder({
      rootName: rootElement,
      headless: false,
      ...xmlOptions
    });

    // Build XML
    const xmlString = builder.buildObject(xmlData);

    // Create file path
    const fileName = `export_${exportId}_${moment().format('YYYYMMDD_HHmmss')}.xml`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure export directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write XML file
    await fs.writeFile(filePath, xmlString, 'utf8');

    return {
      format: 'xml',
      fileName,
      filePath,
      recordCount: data.length,
      fileSize: (await fs.stat(filePath)).size,
      rootElement,
      recordElement
    };
  }

  /**
   * PDF Export using Puppeteer
   */
  async exportPDF(data, options, exportId) {
    const { template = 'default', orientation = 'portrait', format = 'A4' } = options.pdfOptions || {};

    // Generate HTML content
    const htmlContent = await this.generatePDFHTML(data, template, options);

    // Create file path
    const fileName = `export_${exportId}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure export directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(htmlContent);
    await page.pdf({
      path: filePath,
      format,
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });

    await browser.close();

    return {
      format: 'pdf',
      fileName,
      filePath,
      recordCount: data.length,
      fileSize: (await fs.stat(filePath)).size,
      template,
      orientation,
      pageFormat: format
    };
  }

  /**
   * Custom Template Export using Handlebars
   */
  async exportCustomTemplate(data, options, exportId) {
    const { templateName, templateSource, outputFormat = 'txt', templateData = {} } = options.customOptions || {};

    let template;

    if (templateName) {
      // Load pre-defined template
      template = await this.loadTemplate(templateName);
    } else if (templateSource) {
      // Use provided template source
      template = handlebars.compile(templateSource);
    } else {
      throw new Error('Template name or source must be provided for custom export');
    }

    // Prepare template context
    const context = {
      data,
      metadata: {
        exportId,
        timestamp: new Date().toISOString(),
        recordCount: data.length
      },
      ...templateData
    };

    // Render template
    const output = template(context);

    // Create file path
    const fileName = `export_${exportId}_${moment().format('YYYYMMDD_HHmmss')}.${outputFormat}`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure export directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write output file
    await fs.writeFile(filePath, output, 'utf8');

    return {
      format: 'custom',
      outputFormat,
      fileName,
      filePath,
      recordCount: data.length,
      fileSize: (await fs.stat(filePath)).size,
      templateName: templateName || 'inline'
    };
  }

  /**
   * Batch Export for multiple periods
   */
  async batchExport(batchOptions) {
    const { periods, format, options, zipOutput = true } = batchOptions;
    const batchId = this.generateExportId('batch');
    
    const results = [];
    const totalPeriods = periods.length;

    try {
      // Log batch start
      await this.logExportActivity(batchId, 'BATCH_STARTED', batchOptions);

      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const periodOptions = {
          ...options,
          period,
          batchId,
          batchIndex: i + 1,
          batchTotal: totalPeriods
        };

        // Update batch progress
        const progress = Math.round((i / totalPeriods) * 90);
        this.updateExportProgress(batchId, progress);

        // Export for this period
        const result = await this.exportData({
          format,
          ...periodOptions
        });

        results.push({
          period,
          result
        });
      }

      // Create ZIP archive if requested
      let zipResult = null;
      if (zipOutput && results.length > 1) {
        zipResult = await this.createZipArchive(results, batchId);
      }

      // Update to complete
      this.updateExportProgress(batchId, 100);

      // Log batch completion
      await this.logExportActivity(batchId, 'BATCH_COMPLETED', batchOptions, {
        totalPeriods,
        successfulExports: results.filter(r => r.result.success).length,
        zipFile: zipResult?.fileName
      });

      return {
        success: true,
        batchId,
        totalPeriods,
        results,
        zipFile: zipResult
      };

    } catch (error) {
      await this.logExportActivity(batchId, 'BATCH_FAILED', batchOptions, { error: error.message });
      
      return {
        success: false,
        batchId,
        error: error.message,
        results
      };
    }
  }

  /**
   * Initialize accounting software templates
   */
  initializeAccountingTemplates() {
    // QuickBooks CSV format
    this.accountingSoftwareTemplates.set('quickbooks_csv', {
      name: 'QuickBooks CSV Import',
      format: 'csv',
      fieldMapping: {
        'Date': 'transactionDate',
        'Description': 'description',
        'Amount': 'amount',
        'Account': 'accountName',
        'Memo': 'memo',
        'Name': 'vendorName',
        'Class': 'category'
      },
      csvOptions: {
        delimiter: ',',
        includeHeaders: true
      },
      validation: {
        required: ['Date', 'Description', 'Amount'],
        dateFormat: 'MM/DD/YYYY'
      }
    });

    // Xero CSV format
    this.accountingSoftwareTemplates.set('xero_csv', {
      name: 'Xero Bank Statement Import',
      format: 'csv',
      fieldMapping: {
        '*Date': 'transactionDate',
        '*Amount': 'amount',
        '*Description': 'description',
        'Reference': 'referenceNumber',
        'Code': 'accountCode'
      },
      csvOptions: {
        delimiter: ',',
        includeHeaders: true
      },
      validation: {
        required: ['*Date', '*Amount', '*Description'],
        dateFormat: 'DD/MM/YYYY'
      }
    });

    // Sage XML format
    this.accountingSoftwareTemplates.set('sage_xml', {
      name: 'Sage XML Import',
      format: 'xml',
      xmlOptions: {
        rootElement: 'ImportData',
        recordElement: 'Transaction'
      },
      fieldMapping: {
        'TransactionDate': 'transactionDate',
        'Reference': 'referenceNumber',
        'Description': 'description',
        'NetAmount': 'amount',
        'TaxAmount': 'taxAmount',
        'GrossAmount': 'grossAmount',
        'NominalCode': 'accountCode'
      }
    });

    // Generic JSON format for API integrations
    this.accountingSoftwareTemplates.set('generic_api', {
      name: 'Generic API JSON',
      format: 'json',
      jsonOptions: {
        pretty: true,
        metadata: true,
        groupBy: 'category'
      },
      fieldMapping: {
        'date': 'transactionDate',
        'amount': 'amount',
        'description': 'description',
        'reference': 'referenceNumber',
        'category': 'category',
        'vendor': 'vendorName'
      }
    });
  }

  /**
   * Initialize validation schemas
   */
  initializeValidationSchemas() {
    // Joi schema for export requests
    this.exportRequestSchema = Joi.object({
      format: Joi.string().valid('csv', 'excel', 'json', 'xml', 'pdf', 'custom').required(),
      period: Joi.object({
        start: Joi.date().required(),
        end: Joi.date().required()
      }).required(),
      filters: Joi.object().optional(),
      options: Joi.object().optional(),
      template: Joi.string().optional()
    });

    // Yup schema for export data validation
    this.exportDataSchema = yup.array().of(
      yup.object().shape({
        transactionDate: yup.date().required(),
        amount: yup.number().required(),
        description: yup.string().required(),
        category: yup.string().optional(),
        vendorName: yup.string().optional()
      })
    );
  }

  /**
   * Initialize Handlebars helpers
   */
  initializeHandlebarsHelpers() {
    // Date formatting helper
    handlebars.registerHelper('formatDate', function(date, format) {
      return moment(date).format(format || 'YYYY-MM-DD');
    });

    // Currency formatting helper
    handlebars.registerHelper('formatCurrency', function(amount, currency = 'PLN') {
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    // Sum helper for calculations
    handlebars.registerHelper('sum', function(array, field) {
      return array.reduce((total, item) => total + (item[field] || 0), 0);
    });

    // Conditional helper
    handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Loop helper with index
    handlebars.registerHelper('eachWithIndex', function(array, options) {
      let result = '';
      for (let i = 0; i < array.length; i++) {
        result += options.fn({ ...array[i], index: i + 1 });
      }
      return result;
    });
  }

  /**
   * Scheduled Export Management
   */
  scheduleExport(scheduleOptions) {
    const { 
      schedule, 
      exportConfig, 
      name, 
      enabled = true,
      timezone = 'Europe/Warsaw'
    } = scheduleOptions;

    if (!cron.validate(schedule)) {
      throw new Error('Invalid cron schedule format');
    }

    const taskId = `export_${Date.now()}`;

    const task = cron.schedule(schedule, async () => {
      try {
        console.log(`Running scheduled export: ${name}`);
        const result = await this.exportData(exportConfig);
        
        await this.logExportActivity(taskId, 'SCHEDULED_EXPORT_COMPLETED', exportConfig, result);
      } catch (error) {
        console.error(`Scheduled export failed: ${name}`, error);
        await this.logExportActivity(taskId, 'SCHEDULED_EXPORT_FAILED', exportConfig, { error: error.message });
      }
    }, {
      scheduled: enabled,
      timezone
    });

    this.scheduledExports.set(taskId, {
      task,
      name,
      schedule,
      exportConfig,
      enabled,
      createdAt: new Date()
    });

    return taskId;
  }

  /**
   * Helper methods
   */
  generateExportId(prefix = 'exp') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateExportProgress(exportId, progress) {
    if (this.activeExports.has(exportId)) {
      this.activeExports.get(exportId).progress = progress;
    }
  }

  async validateExportRequest(options) {
    try {
      await this.exportRequestSchema.validateAsync(options);
      return { valid: true, errors: [] };
    } catch (error) {
      return { valid: false, errors: error.details.map(d => d.message) };
    }
  }

  async validateExportData(data, options) {
    try {
      await this.exportDataSchema.validate(data);
      return { valid: true, errors: [] };
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  }

  async fetchExportData(options) {
    const { period, filters = {}, dataType = 'expenses' } = options;

    // Build query based on data type and filters
    const where = {
      transactionDate: {
        gte: new Date(period.start),
        lte: new Date(period.end)
      },
      ...filters
    };

    switch (dataType) {
      case 'expenses':
        return await prisma.expense.findMany({
          where,
          include: {
            category: true,
            project: true,
            user: true
          }
        });

      case 'transactions':
        return await prisma.bankTransaction.findMany({
          where,
          include: {
            statement: true
          }
        });

      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  async processExport(data, options, exportId) {
    const { format, template } = options;

    // Use accounting software template if specified
    if (template && this.accountingSoftwareTemplates.has(template)) {
      const templateConfig = this.accountingSoftwareTemplates.get(template);
      options = { ...options, ...templateConfig };
    }

    // Execute export based on format
    const processor = this.exportFormats[format];
    if (!processor) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    return await processor(data, options, exportId);
  }

  applyFieldMapping(data, fieldMapping) {
    return data.map(record => {
      const mappedRecord = {};
      for (const [targetField, sourceField] of Object.entries(fieldMapping)) {
        mappedRecord[targetField] = record[sourceField];
      }
      return mappedRecord;
    });
  }

  generateCSVHeaders(data, fieldMapping) {
    if (fieldMapping) {
      return Object.keys(fieldMapping).map(field => ({ id: field, title: field }));
    }
    
    if (data.length > 0) {
      return Object.keys(data[0]).map(field => ({ id: field, title: field }));
    }
    
    return [];
  }

  groupDataBy(data, groupField) {
    return data.reduce((groups, item) => {
      const key = item[groupField] || 'ungrouped';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  async generatePDFHTML(data, template, options) {
    // Load PDF template
    const templatePath = path.join(__dirname, '..', 'templates', 'pdf', `${template}.hbs`);
    
    try {
      const templateSource = await fs.readFile(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(templateSource);
      
      return compiledTemplate({
        data,
        options,
        timestamp: new Date().toISOString(),
        title: options.title || 'Export Report'
      });
    } catch (error) {
      // Fallback to default template
      return this.getDefaultPDFTemplate(data, options);
    }
  }

  getDefaultPDFTemplate(data, options) {
    const title = options.title || 'Export Report';
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>Record Count: ${data.length}</p>
        
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>ExpenseFlow Pro - Data Export</p>
        </div>
      </body>
      </html>
    `;
  }

  async loadTemplate(templateName) {
    const templatePath = path.join(__dirname, '..', 'templates', 'custom', `${templateName}.hbs`);
    const templateSource = await fs.readFile(templatePath, 'utf8');
    return handlebars.compile(templateSource);
  }

  async createZipArchive(results, batchId) {
    const zipFileName = `batch_export_${batchId}_${moment().format('YYYYMMDD_HHmmss')}.zip`;
    const zipFilePath = path.join(process.cwd(), 'exports', zipFileName);

    const output = require('fs').createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    // Add all export files to archive
    for (const result of results) {
      if (result.result.success && result.result.filePath) {
        const fileName = `${result.period.start}_${result.period.end}_${result.result.fileName}`;
        archive.file(result.result.filePath, { name: fileName });
      }
    }

    await archive.finalize();

    return {
      fileName: zipFileName,
      filePath: zipFilePath,
      fileCount: results.filter(r => r.result.success).length
    };
  }

  async logExportActivity(exportId, action, options, result = {}) {
    try {
      await prisma.exportLog.create({
        data: {
          exportId,
          action,
          options: JSON.stringify(options),
          result: JSON.stringify(result),
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log export activity:', error);
    }
  }

  async createExportAuditRecord(exportId, exportResult, options) {
    try {
      await prisma.exportAudit.create({
        data: {
          exportId,
          format: options.format,
          recordCount: exportResult.recordCount,
          fileSize: exportResult.fileSize,
          fileName: exportResult.fileName,
          options: JSON.stringify(options),
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to create export audit record:', error);
    }
  }

  // Public API methods for export status and management
  getExportStatus(exportId) {
    return this.activeExports.get(exportId) || null;
  }

  getAllActiveExports() {
    return Array.from(this.activeExports.entries()).map(([id, data]) => ({
      exportId: id,
      ...data
    }));
  }

  getScheduledExports() {
    return Array.from(this.scheduledExports.entries()).map(([id, data]) => ({
      taskId: id,
      ...data,
      task: undefined // Don't expose the task object
    }));
  }

  cancelExport(exportId) {
    if (this.activeExports.has(exportId)) {
      this.activeExports.get(exportId).status = 'CANCELLED';
      return true;
    }
    return false;
  }

  removeScheduledExport(taskId) {
    if (this.scheduledExports.has(taskId)) {
      const scheduled = this.scheduledExports.get(taskId);
      scheduled.task.stop();
      this.scheduledExports.delete(taskId);
      return true;
    }
    return false;
  }
}

module.exports = ComprehensiveExportService; 