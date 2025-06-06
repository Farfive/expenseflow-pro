/**
 * Format Configuration Service
 * 
 * Manages custom format configurations for enterprise clients
 * allowing them to define parsing rules for specific bank statement formats
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FormatConfigurationService {
  constructor() {
    this.formatTemplates = new Map();
    this.loadDefaultTemplates();
  }

  /**
   * Load default format templates for common banks
   */
  loadDefaultTemplates() {
    // Polish Banks
    this.formatTemplates.set('pkobp_pdf', {
      name: 'PKO BP PDF Statement',
      type: 'pdf',
      country: 'Poland',
      bank: 'PKO Bank Polski',
      rules: {
        dateColumn: 0,
        dateFormat: 'DD.MM.YYYY',
        descriptionColumn: 1,
        amountColumn: 2,
        balanceColumn: 3,
        headerRows: 1,
        currency: 'PLN',
        tableDetection: {
          minColumns: 4,
          maxColumns: 6,
          keywords: ['Data', 'Opis', 'Kwota', 'Saldo']
        }
      }
    });

    this.formatTemplates.set('mbank_csv', {
      name: 'mBank CSV Export',
      type: 'csv',
      country: 'Poland',
      bank: 'mBank',
      rules: {
        delimiter: ';',
        encoding: 'utf8',
        dateColumn: 0,
        dateFormat: 'YYYY-MM-DD',
        descriptionColumn: 2,
        amountColumn: 6,
        headerRows: 1,
        currency: 'PLN',
        columnMapping: {
          'Data operacji': 'date',
          'Opis operacji': 'description',
          'Kwota': 'amount',
          'Saldo po operacji': 'balance'
        }
      }
    });

    this.formatTemplates.set('ing_html', {
      name: 'ING Bank HTML Statement',
      type: 'html',
      country: 'Poland',
      bank: 'ING Bank Śląski',
      rules: {
        tableSelector: 'table.transaction-table',
        dateSelector: 'td:first-child',
        descriptionSelector: 'td:nth-child(2)',
        amountSelector: 'td:nth-child(3)',
        dateFormat: 'DD-MM-YYYY',
        currency: 'PLN'
      }
    });

    // International Credit Cards
    this.formatTemplates.set('visa_international', {
      name: 'Visa International Statement',
      type: 'pdf',
      country: 'International',
      bank: 'Visa',
      rules: {
        tableDetection: {
          keywords: ['Date', 'Description', 'Amount', 'Transaction Date', 'Post Date'],
          minColumns: 3,
          maxColumns: 8
        },
        dateFormats: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
        currencyDetection: {
          symbols: ['$', '€', '£', 'PLN', 'USD', 'EUR', 'GBP'],
          position: 'before_or_after'
        },
        amountPatterns: [
          /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
          /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s?(USD|EUR|GBP|PLN)/
        ]
      }
    });

    this.formatTemplates.set('mastercard_international', {
      name: 'Mastercard International Statement',
      type: 'pdf',
      country: 'International',
      bank: 'Mastercard',
      rules: {
        tableDetection: {
          keywords: ['Trans Date', 'Post Date', 'Description', 'Amount'],
          minColumns: 4,
          maxColumns: 7
        },
        dateFormats: ['MM/DD/YY', 'DD/MM/YY', 'YYYY-MM-DD'],
        currencyDetection: {
          multiCurrency: true,
          baseCurrency: 'USD'
        }
      }
    });

    this.formatTemplates.set('amex_international', {
      name: 'American Express International',
      type: 'pdf',
      country: 'International',
      bank: 'American Express',
      rules: {
        tableDetection: {
          keywords: ['Date', 'Description', 'Amount', 'Reference'],
          startMarkers: ['TRANSACTIONS', 'ACTIVITY'],
          endMarkers: ['TOTAL', 'BALANCE']
        },
        dateFormats: ['MMM DD, YYYY', 'DD MMM YYYY'],
        specialHandling: {
          negativeAmounts: 'credits',
          foreignTransactions: true,
          conversionRates: true
        }
      }
    });
  }

  /**
   * Create custom format configuration
   */
  async createCustomFormat(companyId, formatConfig) {
    try {
      const config = await prisma.customFormat.create({
        data: {
          companyId,
          name: formatConfig.name,
          description: formatConfig.description,
          bankName: formatConfig.bankName,
          country: formatConfig.country,
          fileTypes: formatConfig.fileTypes,
          parsingRules: formatConfig.rules,
          isActive: true,
          version: '1.0'
        }
      });

      // Cache the format
      this.formatTemplates.set(`custom_${config.id}`, {
        ...formatConfig,
        id: config.id,
        isCustom: true
      });

      return config;
    } catch (error) {
      console.error('Error creating custom format:', error);
      throw error;
    }
  }

  /**
   * Get format configuration by ID or name
   */
  getFormat(identifier) {
    if (this.formatTemplates.has(identifier)) {
      return this.formatTemplates.get(identifier);
    }

    // Check custom formats
    for (const [key, format] of this.formatTemplates.entries()) {
      if (format.name === identifier || format.id === identifier) {
        return format;
      }
    }

    return null;
  }

  /**
   * Auto-detect format based on file content
   */
  async autoDetectFormat(filePath, fileType, content) {
    const detectionResults = [];

    for (const [key, template] of this.formatTemplates.entries()) {
      if (template.type === this.getFormatType(fileType)) {
        const confidence = await this.calculateFormatConfidence(content, template);
        detectionResults.push({
          formatId: key,
          format: template,
          confidence
        });
      }
    }

    // Sort by confidence and return best match
    detectionResults.sort((a, b) => b.confidence - a.confidence);
    
    return detectionResults.length > 0 ? detectionResults[0] : null;
  }

  /**
   * Calculate confidence score for format matching
   */
  async calculateFormatConfidence(content, template) {
    let score = 0;
    const maxScore = 100;

    try {
      // Check for bank-specific keywords
      if (template.bank && content.toLowerCase().includes(template.bank.toLowerCase())) {
        score += 30;
      }

      // Check for expected table structure
      if (template.rules.tableDetection) {
        const keywordMatches = template.rules.tableDetection.keywords.filter(keyword =>
          content.toLowerCase().includes(keyword.toLowerCase())
        ).length;
        
        score += (keywordMatches / template.rules.tableDetection.keywords.length) * 25;
      }

      // Check for date format patterns
      if (template.rules.dateFormats) {
        for (const dateFormat of template.rules.dateFormats) {
          const pattern = this.dateFormatToRegex(dateFormat);
          if (pattern.test(content)) {
            score += 15;
            break;
          }
        }
      } else if (template.rules.dateFormat) {
        const pattern = this.dateFormatToRegex(template.rules.dateFormat);
        if (pattern.test(content)) {
          score += 15;
        }
      }

      // Check for currency patterns
      if (template.rules.currency) {
        if (content.includes(template.rules.currency)) {
          score += 10;
        }
      }

      // Check for amount patterns
      if (template.rules.amountPatterns) {
        for (const pattern of template.rules.amountPatterns) {
          if (pattern.test(content)) {
            score += 20;
            break;
          }
        }
      }

    } catch (error) {
      console.warn('Error calculating format confidence:', error);
    }

    return Math.min(score, maxScore);
  }

  /**
   * Convert date format string to regex pattern
   */
  dateFormatToRegex(dateFormat) {
    const patterns = {
      'DD.MM.YYYY': /\d{2}\.\d{2}\.\d{4}/g,
      'DD/MM/YYYY': /\d{2}\/\d{2}\/\d{4}/g,
      'MM/DD/YYYY': /\d{2}\/\d{2}\/\d{4}/g,
      'YYYY-MM-DD': /\d{4}-\d{2}-\d{2}/g,
      'DD-MM-YYYY': /\d{2}-\d{2}-\d{4}/g,
      'MMM DD, YYYY': /[A-Za-z]{3}\s\d{1,2},\s\d{4}/g,
      'DD MMM YYYY': /\d{1,2}\s[A-Za-z]{3}\s\d{4}/g
    };

    return patterns[dateFormat] || /\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4}/g;
  }

  /**
   * Get format type from file MIME type
   */
  getFormatType(mimeType) {
    const typeMapping = {
      'application/pdf': 'pdf',
      'text/csv': 'csv',
      'text/html': 'html',
      'application/xhtml+xml': 'html',
      'image/jpeg': 'image',
      'image/png': 'image',
      'application/qif': 'qif',
      'application/ofx': 'ofx'
    };

    return typeMapping[mimeType] || 'unknown';
  }

  /**
   * Validate format configuration
   */
  validateFormatConfig(config) {
    const errors = [];

    if (!config.name) {
      errors.push('Format name is required');
    }

    if (!config.type) {
      errors.push('Format type is required');
    }

    if (!config.rules) {
      errors.push('Parsing rules are required');
    }

    // Type-specific validations
    if (config.type === 'csv') {
      if (!config.rules.delimiter) {
        errors.push('CSV delimiter is required');
      }
    }

    if (config.type === 'pdf') {
      if (!config.rules.tableDetection && !config.rules.textParsing) {
        errors.push('PDF format requires table detection or text parsing rules');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export format configuration
   */
  exportFormat(formatId) {
    const format = this.getFormat(formatId);
    if (!format) {
      throw new Error('Format not found');
    }

    return {
      name: format.name,
      type: format.type,
      bank: format.bank,
      country: format.country,
      rules: format.rules,
      version: format.version || '1.0',
      exported: new Date().toISOString()
    };
  }

  /**
   * Import format configuration
   */
  async importFormat(companyId, formatData) {
    const validation = this.validateFormatConfig(formatData);
    if (!validation.valid) {
      throw new Error(`Invalid format configuration: ${validation.errors.join(', ')}`);
    }

    return await this.createCustomFormat(companyId, formatData);
  }

  /**
   * Get all available formats for a company
   */
  async getAvailableFormats(companyId) {
    const defaultFormats = Array.from(this.formatTemplates.entries())
      .filter(([key, format]) => !format.isCustom)
      .map(([key, format]) => ({
        id: key,
        name: format.name,
        type: format.type,
        bank: format.bank,
        country: format.country,
        isDefault: true
      }));

    const customFormats = await prisma.customFormat.findMany({
      where: {
        companyId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        bankName: true,
        country: true,
        fileTypes: true,
        isActive: true
      }
    });

    return {
      default: defaultFormats,
      custom: customFormats.map(format => ({
        id: format.id,
        name: format.name,
        type: format.fileTypes?.[0] || 'unknown',
        bank: format.bankName,
        country: format.country,
        isDefault: false
      }))
    };
  }

  /**
   * Test format configuration with sample data
   */
  async testFormat(formatId, sampleContent) {
    const format = this.getFormat(formatId);
    if (!format) {
      throw new Error('Format not found');
    }

    try {
      // Mock processing to test the format
      const testResult = {
        formatId,
        confidence: await this.calculateFormatConfidence(sampleContent, format),
        detectedStructure: this.analyzeContentStructure(sampleContent, format),
        errors: [],
        warnings: []
      };

      return testResult;
    } catch (error) {
      return {
        formatId,
        confidence: 0,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Analyze content structure based on format rules
   */
  analyzeContentStructure(content, format) {
    const structure = {
      tables: 0,
      rows: 0,
      potentialTransactions: 0,
      datePatterns: [],
      amountPatterns: [],
      currencies: []
    };

    // Basic analysis implementation
    const lines = content.split('\n');
    structure.rows = lines.length;

    // Look for date patterns
    if (format.rules.dateFormats) {
      format.rules.dateFormats.forEach(dateFormat => {
        const pattern = this.dateFormatToRegex(dateFormat);
        const matches = content.match(pattern);
        if (matches) {
          structure.datePatterns.push({
            format: dateFormat,
            count: matches.length
          });
        }
      });
    }

    // Count potential transaction rows
    structure.potentialTransactions = lines.filter(line => 
      this.looksLikeTransactionRow(line, format)
    ).length;

    return structure;
  }

  /**
   * Check if a line looks like a transaction row
   */
  looksLikeTransactionRow(line, format) {
    // Basic heuristic - can be enhanced
    const hasDate = /\d{2}[\.\-\/]\d{2}[\.\-\/]\d{2,4}/.test(line);
    const hasAmount = /\d+[.,]\d{2}/.test(line);
    
    return hasDate && hasAmount;
  }
}

module.exports = FormatConfigurationService; 