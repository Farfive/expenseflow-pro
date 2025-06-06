const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parse');
const xlsx = require('xlsx');
const pdf = require('pdf-parse');
const pdfTable = require('pdf-table-extractor');
const tabula = require('tabula-js');
const moment = require('moment');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const { formatCurrency, formatDate } = require('../utils/i18n');

/**
 * Enhanced Bank Statement Processor
 * Handles complex PDF structures and various international bank formats
 */
class EnhancedBankProcessor {
  constructor() {
    this.supportedFormats = ['pdf', 'csv', 'xlsx', 'xls', 'txt'];
    this.bankFormatDetectors = this.initializeBankFormatDetectors();
    this.currencyDetectors = this.initializeCurrencyDetectors();
    this.dateFormats = this.initializeDateFormats();
    this.amountPatterns = this.initializeAmountPatterns();
  }

  /**
   * Initialize bank format detectors for various international banks
   */
  initializeBankFormatDetectors() {
    return {
      // Polish Banks
      pko: {
        name: 'PKO Bank Polski',
        patterns: [/PKO.*BANK/i, /POWSZECHNA.*KASA/i],
        dateFormat: 'YYYY-MM-DD',
        columns: ['date', 'description', 'amount', 'balance'],
        amountSeparator: ',',
        thousandsSeparator: ' ',
        currency: 'PLN'
      },
      
      mbank: {
        name: 'mBank',
        patterns: [/mBank/i, /MULTI.*BANK/i],
        dateFormat: 'DD-MM-YYYY',
        columns: ['date', 'type', 'description', 'amount', 'balance'],
        amountSeparator: ',',
        thousandsSeparator: ' ',
        currency: 'PLN'
      },
      
      ing: {
        name: 'ING Bank Śląski',
        patterns: [/ING.*BANK/i, /ŚLĄSKI/i],
        dateFormat: 'DD.MM.YYYY',
        columns: ['date', 'description', 'debit', 'credit', 'balance'],
        amountSeparator: ',',
        thousandsSeparator: ' ',
        currency: 'PLN'
      },
      
      santander: {
        name: 'Santander Bank Polska',
        patterns: [/SANTANDER/i, /ZACHODNI/i],
        dateFormat: 'DD/MM/YYYY',
        columns: ['date', 'title', 'recipient', 'amount', 'balance'],
        amountSeparator: ',',
        thousandsSeparator: ' ',
        currency: 'PLN'
      },
      
      // German Banks
      deutsche: {
        name: 'Deutsche Bank',
        patterns: [/DEUTSCHE.*BANK/i],
        dateFormat: 'DD.MM.YYYY',
        columns: ['date', 'type', 'description', 'amount', 'balance'],
        amountSeparator: ',',
        thousandsSeparator: '.',
        currency: 'EUR'
      },
      
      commerzbank: {
        name: 'Commerzbank',
        patterns: [/COMMERZBANK/i],
        dateFormat: 'DD.MM.YY',
        columns: ['date', 'description', 'purpose', 'amount', 'balance'],
        amountSeparator: ',',
        thousandsSeparator: '.',
        currency: 'EUR'
      },
      
      sparkasse: {
        name: 'Sparkasse',
        patterns: [/SPARKASSE/i, /S-.*BANK/i],
        dateFormat: 'DD.MM.YYYY',
        columns: ['date', 'value_date', 'type', 'description', 'amount', 'balance'],
        amountSeparator: ',',
        thousandsSeparator: '.',
        currency: 'EUR'
      },
      
      // US Banks
      chase: {
        name: 'Chase Bank',
        patterns: [/CHASE/i, /JPMORGAN/i],
        dateFormat: 'MM/DD/YYYY',
        columns: ['date', 'description', 'amount', 'type', 'balance'],
        amountSeparator: '.',
        thousandsSeparator: ',',
        currency: 'USD'
      },
      
      bofa: {
        name: 'Bank of America',
        patterns: [/BANK.*OF.*AMERICA/i, /BOA/i],
        dateFormat: 'MM/DD/YYYY',
        columns: ['date', 'description', 'amount', 'running_balance'],
        amountSeparator: '.',
        thousandsSeparator: ',',
        currency: 'USD'
      },
      
      wells: {
        name: 'Wells Fargo',
        patterns: [/WELLS.*FARGO/i],
        dateFormat: 'MM/DD/YYYY',
        columns: ['date', 'amount', 'description', 'balance'],
        amountSeparator: '.',
        thousandsSeparator: ',',
        currency: 'USD'
      },
      
      // UK Banks
      hsbc: {
        name: 'HSBC',
        patterns: [/HSBC/i],
        dateFormat: 'DD/MM/YYYY',
        columns: ['date', 'description', 'paid_out', 'paid_in', 'balance'],
        amountSeparator: '.',
        thousandsSeparator: ',',
        currency: 'GBP'
      },
      
      barclays: {
        name: 'Barclays',
        patterns: [/BARCLAYS/i],
        dateFormat: 'DD MMM YYYY',
        columns: ['date', 'description', 'amount', 'balance'],
        amountSeparator: '.',
        thousandsSeparator: ',',
        currency: 'GBP'
      },
      
      // Swiss Banks
      ubs: {
        name: 'UBS',
        patterns: [/UBS/i, /UNION.*BANK/i],
        dateFormat: 'DD.MM.YYYY',
        columns: ['date', 'description', 'debit', 'credit', 'balance'],
        amountSeparator: '.',
        thousandsSeparator: "'",
        currency: 'CHF'
      },
      
      // Generic formats
      generic_eu: {
        name: 'Generic European',
        patterns: [/IBAN/i, /SWIFT/i, /BIC/i],
        dateFormat: 'DD.MM.YYYY',
        columns: ['date', 'description', 'amount', 'balance'],
        amountSeparator: ',',
        thousandsSeparator: '.',
        currency: 'EUR'
      },
      
      generic_us: {
        name: 'Generic US',
        patterns: [/ROUTING/i, /ABA/i],
        dateFormat: 'MM/DD/YYYY',
        columns: ['date', 'description', 'amount', 'balance'],
        amountSeparator: '.',
        thousandsSeparator: ',',
        currency: 'USD'
      }
    };
  }

  /**
   * Initialize currency detectors
   */
  initializeCurrencyDetectors() {
    return {
      'PLN': [/PLN/i, /zł/i, /złoty/i, /złotych/i],
      'EUR': [/EUR/i, /€/i, /euro/i],
      'USD': [/USD/i, /\$/i, /dollar/i, /usd/i],
      'GBP': [/GBP/i, /£/i, /pound/i, /sterling/i],
      'CHF': [/CHF/i, /franc/i, /schweizer/i],
      'CZK': [/CZK/i, /koruna/i, /korony/i],
      'HUF': [/HUF/i, /forint/i],
      'SEK': [/SEK/i, /krona/i, /kronor/i],
      'NOK': [/NOK/i, /krone/i, /kroner/i],
      'DKK': [/DKK/i, /danske/i]
    };
  }

  /**
   * Initialize date formats for different regions
   */
  initializeDateFormats() {
    return [
      'YYYY-MM-DD',    // ISO format
      'DD.MM.YYYY',    // German/Polish format
      'DD/MM/YYYY',    // European format
      'MM/DD/YYYY',    // US format
      'DD-MM-YYYY',    // Alternative European
      'YYYY/MM/DD',    // Alternative ISO
      'DD MMM YYYY',   // UK format (15 Jan 2024)
      'MMM DD, YYYY',  // US format (Jan 15, 2024)
      'DD.MM.YY',      // Short German
      'MM/DD/YY',      // Short US
      'DD/MM/YY',      // Short European
      'YYYYMMDD',      // Compact format
      'DD-MMM-YYYY',   // Alternative UK
      'YYYY-MM-DD HH:mm:ss', // With time
      'DD.MM.YYYY HH:mm',    // German with time
      'MM/DD/YYYY HH:mm'     // US with time
    ];
  }

  /**
   * Initialize amount patterns for different locales
   */
  initializeAmountPatterns() {
    return [
      // European format: 1.234,56
      {
        pattern: /(-?)(\d{1,3}(?:\.\d{3})*),(\d{2})/,
        thousandsSeparator: '.',
        decimalSeparator: ',',
        groups: { sign: 1, integer: 2, decimal: 3 }
      },
      // US format: 1,234.56
      {
        pattern: /(-?)(\d{1,3}(?:,\d{3})*)\.(\d{2})/,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        groups: { sign: 1, integer: 2, decimal: 3 }
      },
      // Swiss format: 1'234.56
      {
        pattern: /(-?)(\d{1,3}(?:'\d{3})*)\.(\d{2})/,
        thousandsSeparator: "'",
        decimalSeparator: '.',
        groups: { sign: 1, integer: 2, decimal: 3 }
      },
      // Simple format without thousands separator: 1234.56
      {
        pattern: /(-?)(\d+)\.(\d{2})/,
        thousandsSeparator: '',
        decimalSeparator: '.',
        groups: { sign: 1, integer: 2, decimal: 3 }
      },
      // Simple format with comma: 1234,56
      {
        pattern: /(-?)(\d+),(\d{2})/,
        thousandsSeparator: '',
        decimalSeparator: ',',
        groups: { sign: 1, integer: 2, decimal: 3 }
      },
      // Integer amounts
      {
        pattern: /(-?)(\d+)/,
        thousandsSeparator: '',
        decimalSeparator: '',
        groups: { sign: 1, integer: 2, decimal: null }
      }
    ];
  }

  /**
   * Process bank statement with enhanced detection and parsing
   */
  async processStatement(filePath, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing bank statement: ${filePath}`);
      
      // Detect file format
      const fileExtension = path.extname(filePath).toLowerCase().slice(1);
      if (!this.supportedFormats.includes(fileExtension)) {
        throw new AppError(`Unsupported file format: ${fileExtension}`, 400);
      }
      
      // Extract raw data based on format
      let rawData;
      switch (fileExtension) {
        case 'pdf':
          rawData = await this.processPDF(filePath, options);
          break;
        case 'csv':
          rawData = await this.processCSV(filePath, options);
          break;
        case 'xlsx':
        case 'xls':
          rawData = await this.processExcel(filePath, options);
          break;
        case 'txt':
          rawData = await this.processText(filePath, options);
          break;
        default:
          throw new AppError(`Unsupported format: ${fileExtension}`, 400);
      }
      
      // Detect bank format
      const bankFormat = this.detectBankFormat(rawData);
      logger.info(`Detected bank format: ${bankFormat.name}`);
      
      // Parse transactions
      const transactions = await this.parseTransactions(rawData, bankFormat, options);
      
      // Validate and clean transactions
      const validatedTransactions = this.validateTransactions(transactions, bankFormat);
      
      // Extract metadata
      const metadata = this.extractMetadata(rawData, bankFormat, validatedTransactions);
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`Bank statement processed successfully: ${validatedTransactions.length} transactions, ${processingTime}ms`);
      
      return {
        success: true,
        transactions: validatedTransactions,
        metadata,
        bankFormat: bankFormat.name,
        processingTime,
        summary: {
          totalTransactions: validatedTransactions.length,
          totalAmount: this.calculateTotalAmount(validatedTransactions),
          dateRange: this.getDateRange(validatedTransactions),
          currency: metadata.currency || bankFormat.currency
        }
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Bank statement processing failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        processingTime,
        transactions: [],
        metadata: {}
      };
    }
  }

  /**
   * Process PDF bank statements with multiple strategies
   */
  async processPDF(filePath, options = {}) {
    try {
      // Strategy 1: Try tabula-js for structured tables
      let result = await this.processPDFWithTabula(filePath);
      if (result && result.length > 0) {
        logger.debug('PDF processed successfully with Tabula');
        return result;
      }
      
      // Strategy 2: Try pdf-table-extractor
      result = await this.processPDFWithTableExtractor(filePath);
      if (result && result.length > 0) {
        logger.debug('PDF processed successfully with table extractor');
        return result;
      }
      
      // Strategy 3: Fallback to text extraction
      result = await this.processPDFWithTextExtraction(filePath);
      if (result && result.length > 0) {
        logger.debug('PDF processed successfully with text extraction');
        return result;
      }
      
      throw new Error('Failed to extract data from PDF with all strategies');
      
    } catch (error) {
      logger.error('PDF processing failed:', error);
      throw error;
    }
  }

  /**
   * Process PDF using Tabula-JS
   */
  async processPDFWithTabula(filePath) {
    try {
      const tables = await tabula(filePath, {
        pages: 'all',
        area: [0, 0, 100, 100], // Full page
        output: 'json',
        silent: true
      });
      
      return this.flattenTabulaOutput(tables);
    } catch (error) {
      logger.debug('Tabula processing failed:', error);
      return null;
    }
  }

  /**
   * Process PDF using pdf-table-extractor
   */
  async processPDFWithTableExtractor(filePath) {
    return new Promise((resolve) => {
      pdfTable(filePath, (err, data) => {
        if (err) {
          logger.debug('PDF table extractor failed:', err);
          resolve(null);
          return;
        }
        
        try {
          const rows = this.parsePDFTableData(data);
          resolve(rows);
        } catch (parseError) {
          logger.debug('Failed to parse PDF table data:', parseError);
          resolve(null);
        }
      });
    });
  }

  /**
   * Process PDF using text extraction
   */
  async processPDFWithTextExtraction(filePath) {
    try {
      const pdfBuffer = await fs.readFile(filePath);
      const data = await pdf(pdfBuffer);
      
      const lines = data.text.split('\n').filter(line => line.trim().length > 0);
      return this.parseTextLines(lines);
    } catch (error) {
      logger.debug('PDF text extraction failed:', error);
      return null;
    }
  }

  /**
   * Process CSV files
   */
  async processCSV(filePath, options = {}) {
    try {
      const csvContent = await fs.readFile(filePath, 'utf8');
      
      // Try different delimiters and encodings
      const delimiters = [',', ';', '\t', '|'];
      let bestResult = null;
      let maxColumns = 0;
      
      for (const delimiter of delimiters) {
        try {
          const result = await this.parseCSVWithDelimiter(csvContent, delimiter);
          if (result.length > 0 && result[0].length > maxColumns) {
            bestResult = result;
            maxColumns = result[0].length;
          }
        } catch (error) {
          // Try next delimiter
          continue;
        }
      }
      
      if (!bestResult) {
        throw new Error('Failed to parse CSV with any delimiter');
      }
      
      return bestResult;
    } catch (error) {
      logger.error('CSV processing failed:', error);
      throw error;
    }
  }

  /**
   * Parse CSV with specific delimiter
   */
  async parseCSVWithDelimiter(csvContent, delimiter) {
    return new Promise((resolve, reject) => {
      const rows = [];
      
      csv(csvContent, {
        delimiter,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      })
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Process Excel files
   */
  async processExcel(filePath, options = {}) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header row
      const data = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
      
      // Filter out empty rows
      return data.filter(row => row.some(cell => cell && cell.toString().trim().length > 0));
    } catch (error) {
      logger.error('Excel processing failed:', error);
      throw error;
    }
  }

  /**
   * Process text files
   */
  async processText(filePath, options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      return this.parseTextLines(lines);
    } catch (error) {
      logger.error('Text processing failed:', error);
      throw error;
    }
  }

  /**
   * Detect bank format from raw data
   */
  detectBankFormat(rawData) {
    const textContent = this.extractTextFromRawData(rawData);
    
    // Try to match bank patterns
    for (const [key, format] of Object.entries(this.bankFormatDetectors)) {
      for (const pattern of format.patterns) {
        if (pattern.test(textContent)) {
          logger.debug(`Matched bank format: ${format.name}`);
          return { ...format, key };
        }
      }
    }
    
    // Fallback to generic format based on detected characteristics
    const detectedCurrency = this.detectCurrency(textContent);
    const detectedDateFormat = this.detectDateFormat(rawData);
    const detectedAmountFormat = this.detectAmountFormat(textContent);
    
    if (detectedCurrency === 'USD' || detectedDateFormat.includes('MM/DD')) {
      return { ...this.bankFormatDetectors.generic_us, key: 'generic_us' };
    }
    
    return { 
      ...this.bankFormatDetectors.generic_eu, 
      key: 'generic_eu',
      currency: detectedCurrency,
      dateFormat: detectedDateFormat,
      ...detectedAmountFormat
    };
  }

  /**
   * Extract text content from various raw data formats
   */
  extractTextFromRawData(rawData) {
    if (typeof rawData === 'string') {
      return rawData;
    }
    
    if (Array.isArray(rawData)) {
      return rawData.flat(2).join(' ');
    }
    
    if (typeof rawData === 'object') {
      return JSON.stringify(rawData);
    }
    
    return '';
  }

  /**
   * Detect currency from text content
   */
  detectCurrency(textContent) {
    for (const [currency, patterns] of Object.entries(this.currencyDetectors)) {
      for (const pattern of patterns) {
        if (pattern.test(textContent)) {
          return currency;
        }
      }
    }
    
    return 'PLN'; // Default to PLN
  }

  /**
   * Detect date format from raw data
   */
  detectDateFormat(rawData) {
    const dates = this.extractPotentialDates(rawData);
    
    for (const dateFormat of this.dateFormats) {
      let validCount = 0;
      for (const dateStr of dates.slice(0, 10)) { // Check first 10 dates
        if (moment(dateStr, dateFormat, true).isValid()) {
          validCount++;
        }
      }
      
      if (validCount / Math.min(dates.length, 10) > 0.7) {
        return dateFormat;
      }
    }
    
    return 'YYYY-MM-DD'; // Default
  }

  /**
   * Extract potential dates from raw data
   */
  extractPotentialDates(rawData) {
    const textContent = this.extractTextFromRawData(rawData);
    
    // Common date patterns
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/g,
      /\d{2}\.\d{2}\.\d{4}/g,
      /\d{2}\/\d{2}\/\d{4}/g,
      /\d{2}-\d{2}-\d{4}/g,
      /\d{1,2}\s+\w{3}\s+\d{4}/g
    ];
    
    const dates = [];
    for (const pattern of datePatterns) {
      const matches = textContent.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    }
    
    return [...new Set(dates)]; // Remove duplicates
  }

  /**
   * Detect amount format from text content
   */
  detectAmountFormat(textContent) {
    const amounts = textContent.match(/[-]?\d{1,3}(?:[.,'\s]\d{3})*[.,]\d{2}/g) || [];
    
    if (amounts.length === 0) {
      return { amountSeparator: '.', thousandsSeparator: ',' };
    }
    
    // Analyze first few amounts to determine format
    const sample = amounts.slice(0, 5);
    
    let commaDecimal = 0;
    let dotDecimal = 0;
    
    for (const amount of sample) {
      if (amount.match(/,\d{2}$/)) commaDecimal++;
      if (amount.match(/\.\d{2}$/)) dotDecimal++;
    }
    
    if (commaDecimal > dotDecimal) {
      return { amountSeparator: ',', thousandsSeparator: '.' };
    } else {
      return { amountSeparator: '.', thousandsSeparator: ',' };
    }
  }

  /**
   * Parse transactions from raw data using detected bank format
   */
  async parseTransactions(rawData, bankFormat, options = {}) {
    const transactions = [];
    
    try {
      if (Array.isArray(rawData) && Array.isArray(rawData[0])) {
        // Tabular data (CSV, Excel, extracted tables)
        const headerRow = this.findHeaderRow(rawData, bankFormat);
        const columnMapping = this.mapColumns(headerRow, bankFormat);
        
        for (let i = headerRow + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (this.isValidTransactionRow(row, columnMapping)) {
            const transaction = this.parseTransactionRow(row, columnMapping, bankFormat);
            if (transaction) {
              transactions.push(transaction);
            }
          }
        }
      } else {
        // Text-based data
        const lines = Array.isArray(rawData) ? rawData : [rawData];
        for (const line of lines) {
          const transaction = this.parseTransactionLine(line, bankFormat);
          if (transaction) {
            transactions.push(transaction);
          }
        }
      }
    } catch (error) {
      logger.error('Transaction parsing failed:', error);
    }
    
    return transactions;
  }

  /**
   * Find header row in tabular data
   */
  findHeaderRow(data, bankFormat) {
    const keyWords = ['date', 'amount', 'description', 'balance', 'transaction', 'datum', 'betrag', 'beschreibung'];
    
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      
      const matchCount = row.filter(cell => {
        if (!cell || typeof cell !== 'string') return false;
        const cellLower = cell.toLowerCase();
        return keyWords.some(keyword => cellLower.includes(keyword));
      }).length;
      
      if (matchCount >= 2) {
        return i;
      }
    }
    
    return 0; // Default to first row
  }

  /**
   * Map columns to transaction fields
   */
  mapColumns(headerRow, bankFormat) {
    const mapping = {};
    const headers = Array.isArray(headerRow) ? headerRow : [];
    
    for (let i = 0; i < headers.length; i++) {
      const header = (headers[i] || '').toString().toLowerCase().trim();
      
      // Date column
      if (header.match(/date|datum|data|fecha|日付/i)) {
        mapping.date = i;
      }
      // Amount columns
      else if (header.match(/amount|betrag|kwota|montant|cantidad|金額/i)) {
        mapping.amount = i;
      }
      else if (header.match(/debit|ausgabe|obciążenie|débit/i)) {
        mapping.debit = i;
      }
      else if (header.match(/credit|eingang|wpływ|crédit/i)) {
        mapping.credit = i;
      }
      // Description column
      else if (header.match(/description|beschreibung|opis|titre|concepto|説明/i)) {
        mapping.description = i;
      }
      else if (header.match(/reference|referenz|odniesienie|référence/i)) {
        mapping.reference = i;
      }
      // Balance column
      else if (header.match(/balance|saldo|solde|saldo/i)) {
        mapping.balance = i;
      }
      // Type column
      else if (header.match(/type|typ|rodzaj|tipo/i)) {
        mapping.type = i;
      }
    }
    
    // Fallback mapping based on position if specific headers not found
    if (Object.keys(mapping).length < 3 && headers.length >= 3) {
      mapping.date = mapping.date || 0;
      mapping.description = mapping.description || 1;
      mapping.amount = mapping.amount || 2;
      if (headers.length >= 4) {
        mapping.balance = mapping.balance || 3;
      }
    }
    
    return mapping;
  }

  /**
   * Check if row contains valid transaction data
   */
  isValidTransactionRow(row, columnMapping) {
    if (!Array.isArray(row) || row.length < 3) return false;
    
    // Check if date column has date-like value
    const dateValue = row[columnMapping.date || 0];
    if (!dateValue || !this.looksLikeDate(dateValue.toString())) {
      return false;
    }
    
    // Check if amount column has numeric value
    const amountValue = row[columnMapping.amount || 2] || 
                       row[columnMapping.debit || -1] || 
                       row[columnMapping.credit || -1];
    if (!amountValue || !this.looksLikeAmount(amountValue.toString())) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if string looks like a date
   */
  looksLikeDate(str) {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}\.\d{2}\.\d{4}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{2}-\d{2}-\d{4}$/,
      /^\d{1,2}\s+\w{3}\s+\d{4}$/
    ];
    
    return datePatterns.some(pattern => pattern.test(str.trim()));
  }

  /**
   * Check if string looks like an amount
   */
  looksLikeAmount(str) {
    const amountPatterns = [
      /^[-]?\d{1,3}(?:[.,'\s]\d{3})*[.,]\d{2}$/,
      /^[-]?\d+[.,]\d{2}$/,
      /^[-]?\d+$/
    ];
    
    return amountPatterns.some(pattern => pattern.test(str.trim()));
  }

  /**
   * Parse individual transaction row
   */
  parseTransactionRow(row, columnMapping, bankFormat) {
    try {
      // Extract date
      const dateStr = row[columnMapping.date || 0];
      const date = this.parseDate(dateStr, bankFormat.dateFormat);
      if (!date) return null;
      
      // Extract amount
      let amount = 0;
      if (columnMapping.amount !== undefined) {
        amount = this.parseAmount(row[columnMapping.amount], bankFormat);
      } else if (columnMapping.debit !== undefined && columnMapping.credit !== undefined) {
        const debit = this.parseAmount(row[columnMapping.debit], bankFormat) || 0;
        const credit = this.parseAmount(row[columnMapping.credit], bankFormat) || 0;
        amount = credit - debit;
      }
      
      if (amount === 0) return null;
      
      // Extract description
      const description = this.extractDescription(row, columnMapping);
      
      // Extract balance if available
      const balance = columnMapping.balance !== undefined ? 
        this.parseAmount(row[columnMapping.balance], bankFormat) : null;
      
      // Extract type if available
      const type = columnMapping.type !== undefined ? 
        row[columnMapping.type] : null;
      
      return {
        date: date.format('YYYY-MM-DD'),
        description: description || 'Transaction',
        amount,
        balance,
        type,
        currency: bankFormat.currency,
        raw: row
      };
      
    } catch (error) {
      logger.debug('Failed to parse transaction row:', error);
      return null;
    }
  }

  /**
   * Parse date string using specified format
   */
  parseDate(dateStr, format) {
    if (!dateStr) return null;
    
    const str = dateStr.toString().trim();
    
    // Try specified format first
    let date = moment(str, format, true);
    if (date.isValid()) return date;
    
    // Try all known formats
    for (const fmt of this.dateFormats) {
      date = moment(str, fmt, true);
      if (date.isValid()) return date;
    }
    
    // Try loose parsing
    date = moment(str);
    if (date.isValid()) return date;
    
    return null;
  }

  /**
   * Parse amount string using bank format
   */
  parseAmount(amountStr, bankFormat) {
    if (!amountStr) return null;
    
    const str = amountStr.toString().trim().replace(/\s+/g, '');
    if (!str) return null;
    
    // Try format-specific parsing first
    if (bankFormat.amountSeparator && bankFormat.thousandsSeparator) {
      const cleanStr = str
        .replace(new RegExp(`\\${bankFormat.thousandsSeparator}`, 'g'), '')
        .replace(bankFormat.amountSeparator, '.');
      
      const num = parseFloat(cleanStr);
      if (!isNaN(num)) return num;
    }
    
    // Try all amount patterns
    for (const pattern of this.amountPatterns) {
      const match = str.match(pattern.pattern);
      if (match) {
        const sign = match[pattern.groups.sign] === '-' ? -1 : 1;
        const integer = match[pattern.groups.integer].replace(
          new RegExp(`\\${pattern.thousandsSeparator}`, 'g'), ''
        );
        const decimal = match[pattern.groups.decimal] || '00';
        
        const num = parseFloat(`${integer}.${decimal}`);
        if (!isNaN(num)) return sign * num;
      }
    }
    
    // Fallback: try direct parsing
    const num = parseFloat(str.replace(/[^\d.-]/g, ''));
    return isNaN(num) ? null : num;
  }

  /**
   * Extract description from transaction row
   */
  extractDescription(row, columnMapping) {
    const parts = [];
    
    // Primary description
    if (columnMapping.description !== undefined) {
      const desc = row[columnMapping.description];
      if (desc && desc.toString().trim()) {
        parts.push(desc.toString().trim());
      }
    }
    
    // Reference
    if (columnMapping.reference !== undefined) {
      const ref = row[columnMapping.reference];
      if (ref && ref.toString().trim()) {
        parts.push(ref.toString().trim());
      }
    }
    
    // Type
    if (columnMapping.type !== undefined) {
      const type = row[columnMapping.type];
      if (type && type.toString().trim()) {
        parts.push(type.toString().trim());
      }
    }
    
    return parts.join(' | ') || null;
  }

  /**
   * Validate and clean transactions
   */
  validateTransactions(transactions, bankFormat) {
    const validated = [];
    
    for (const transaction of transactions) {
      try {
        // Validate required fields
        if (!transaction.date || !transaction.amount) continue;
        
        // Validate date
        const date = moment(transaction.date);
        if (!date.isValid()) continue;
        
        // Validate amount
        const amount = parseFloat(transaction.amount);
        if (isNaN(amount)) continue;
        
        // Clean and normalize
        const cleaned = {
          id: crypto.randomUUID(),
          date: date.format('YYYY-MM-DD'),
          description: this.cleanDescription(transaction.description),
          amount: Math.round(amount * 100) / 100, // Round to 2 decimals
          balance: transaction.balance ? Math.round(transaction.balance * 100) / 100 : null,
          type: transaction.type || (amount >= 0 ? 'credit' : 'debit'),
          currency: transaction.currency || bankFormat.currency,
          bankFormat: bankFormat.key,
          metadata: {
            raw: transaction.raw,
            processingDate: new Date().toISOString()
          }
        };
        
        validated.push(cleaned);
        
      } catch (error) {
        logger.debug('Transaction validation failed:', error);
      }
    }
    
    // Sort by date
    validated.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return validated;
  }

  /**
   * Clean description text
   */
  cleanDescription(description) {
    if (!description) return 'Transaction';
    
    return description
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,()\/]/g, '')
      .substring(0, 200); // Limit length
  }

  /**
   * Extract metadata from statement
   */
  extractMetadata(rawData, bankFormat, transactions) {
    const metadata = {
      bankName: bankFormat.name,
      bankFormat: bankFormat.key,
      currency: bankFormat.currency,
      processingDate: new Date().toISOString(),
      transactionCount: transactions.length
    };
    
    if (transactions.length > 0) {
      const dates = transactions.map(t => t.date).sort();
      metadata.statementPeriod = {
        from: dates[0],
        to: dates[dates.length - 1]
      };
      
      const amounts = transactions.map(t => t.amount);
      metadata.amountSummary = {
        total: amounts.reduce((sum, amount) => sum + amount, 0),
        min: Math.min(...amounts),
        max: Math.max(...amounts),
        credits: amounts.filter(a => a > 0).reduce((sum, a) => sum + a, 0),
        debits: amounts.filter(a => a < 0).reduce((sum, a) => sum + a, 0)
      };
      
      // Account number extraction attempt
      const textContent = this.extractTextFromRawData(rawData);
      const accountNumber = this.extractAccountNumber(textContent);
      if (accountNumber) {
        metadata.accountNumber = accountNumber;
      }
    }
    
    return metadata;
  }

  /**
   * Extract account number from text
   */
  extractAccountNumber(text) {
    const patterns = [
      /Account.*?(\d{8,20})/i,
      /Konto.*?(\d{8,20})/i,
      /IBAN.*?([A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{1,23})/i,
      /(\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})/g, // Polish account format
      /(\d{4}-\d{4}-\d{4}-\d{4})/g // Hyphenated format
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].replace(/\s|-/g, '');
      }
    }
    
    return null;
  }

  /**
   * Calculate total amount from transactions
   */
  calculateTotalAmount(transactions) {
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  /**
   * Get date range from transactions
   */
  getDateRange(transactions) {
    if (transactions.length === 0) return null;
    
    const dates = transactions.map(t => t.date).sort();
    return {
      from: dates[0],
      to: dates[dates.length - 1]
    };
  }

  // Helper methods for different PDF processing strategies...
  
  flattenTabulaOutput(tables) {
    const rows = [];
    for (const table of tables) {
      if (table.data && Array.isArray(table.data)) {
        rows.push(...table.data);
      }
    }
    return rows;
  }

  parsePDFTableData(data) {
    const rows = [];
    if (data && data.pageTables) {
      for (const page of data.pageTables) {
        if (page.tables) {
          for (const table of page.tables) {
            rows.push(...table);
          }
        }
      }
    }
    return rows;
  }

  parseTextLines(lines) {
    const rows = [];
    for (const line of lines) {
      // Split by multiple spaces, tabs, or common separators
      const parts = line.split(/\s{2,}|\t|[|;]/).filter(p => p.trim());
      if (parts.length >= 3) {
        rows.push(parts);
      }
    }
    return rows;
  }

  parseTransactionLine(line, bankFormat) {
    // Implementation for parsing individual text lines
    // This would include regex patterns for different bank formats
    // For now, return null to indicate no transaction found
    return null;
  }
}

module.exports = EnhancedBankProcessor; 