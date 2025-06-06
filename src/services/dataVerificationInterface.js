const moment = require('moment');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const { formatCurrency, formatDate } = require('../utils/i18n');

/**
 * Data Verification Interface
 * Comprehensive verification and correction system for OCR results and reconciliation matches
 */
class DataVerificationInterface {
  constructor(prisma) {
    this.prisma = prisma;
    this.verificationRules = this.initializeVerificationRules();
    this.fieldValidators = this.initializeFieldValidators();
    this.keyboardShortcuts = this.initializeKeyboardShortcuts();
    this.verificationStats = {
      totalItems: 0,
      verified: 0,
      corrected: 0,
      rejected: 0,
      averageTime: 0
    };
  }

  /**
   * Initialize verification rules for different document types
   */
  initializeVerificationRules() {
    return {
      receipt: {
        requiredFields: ['total_amount', 'transaction_date', 'merchant_name'],
        optionalFields: ['vat_amount', 'tax_id', 'items'],
        validationRules: {
          total_amount: { min: 0.01, max: 10000 },
          vat_amount: { min: 0, max: 2000 },
          transaction_date: { 
            minDate: moment().subtract(2, 'years'),
            maxDate: moment().add(1, 'day')
          }
        }
      },
      invoice: {
        requiredFields: ['total_amount', 'transaction_date', 'merchant_name', 'invoice_number'],
        optionalFields: ['vat_amount', 'tax_id', 'bank_account_number', 'items'],
        validationRules: {
          total_amount: { min: 0.01, max: 100000 },
          vat_amount: { min: 0, max: 20000 },
          transaction_date: { 
            minDate: moment().subtract(5, 'years'),
            maxDate: moment().add(30, 'days')
          }
        }
      },
      bank_statement: {
        requiredFields: ['transactions'],
        optionalFields: ['account_number', 'statement_period'],
        validationRules: {
          transaction_amount: { min: -100000, max: 100000 },
          transaction_date: {
            minDate: moment().subtract(2, 'years'),
            maxDate: moment()
          }
        }
      },
      expense_match: {
        requiredFields: ['expense', 'transaction', 'match_score'],
        optionalFields: ['warnings'],
        validationRules: {
          match_score: { min: 0, max: 1 },
          amount_difference: { max: 1000 },
          date_difference: { max: 30 }
        }
      }
    };
  }

  /**
   * Initialize field validators
   */
  initializeFieldValidators() {
    return {
      amount: {
        validate: (value) => !isNaN(parseFloat(value)) && parseFloat(value) >= 0,
        normalize: (value) => parseFloat(value).toFixed(2),
        suggestions: (value, context) => this.generateAmountSuggestions(value, context)
      },
      date: {
        validate: (value) => moment(value).isValid(),
        normalize: (value) => moment(value).format('YYYY-MM-DD'),
        suggestions: (value, context) => this.generateDateSuggestions(value, context)
      },
      merchant: {
        validate: (value) => value && value.trim().length > 0,
        normalize: (value) => value.trim().replace(/\s+/g, ' '),
        suggestions: (value, context) => this.generateMerchantSuggestions(value, context)
      },
      tax_id: {
        validate: (value) => this.validateTaxId(value),
        normalize: (value) => value.replace(/\D/g, ''),
        suggestions: (value, context) => this.generateTaxIdSuggestions(value, context)
      },
      currency: {
        validate: (value) => ['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'HUF'].includes(value),
        normalize: (value) => value.toUpperCase(),
        suggestions: (value, context) => this.generateCurrencySuggestions(value, context)
      }
    };
  }

  /**
   * Initialize keyboard shortcuts for efficient verification
   */
  initializeKeyboardShortcuts() {
    return {
      verification: {
        accept: ['Enter', 'Space'],
        reject: ['Delete', 'Backspace'],
        edit: ['F2', 'E'],
        next: ['ArrowDown', 'Tab'],
        previous: ['ArrowUp', 'Shift+Tab'],
        save: ['Ctrl+S'],
        undo: ['Ctrl+Z'],
        redo: ['Ctrl+Y'],
        focusAmount: ['Ctrl+1'],
        focusDate: ['Ctrl+2'],
        focusMerchant: ['Ctrl+3'],
        flagIssue: ['Ctrl+F'],
        addNote: ['Ctrl+N']
      },
      matching: {
        confirmMatch: ['Enter'],
        rejectMatch: ['Delete'],
        viewDetails: ['Space'],
        nextMatch: ['ArrowDown'],
        previousMatch: ['ArrowUp'],
        adjustScore: ['Ctrl+A'],
        manualLink: ['Ctrl+L'],
        splitTransaction: ['Ctrl+S']
      }
    };
  }

  /**
   * Get verification queue for a tenant
   */
  async getVerificationQueue(tenantId, options = {}) {
    try {
      const {
        type = 'all', // 'documents', 'matches', 'all'
        priority = 'all', // 'high', 'medium', 'low', 'all'
        assignedTo = null,
        limit = 50,
        offset = 0
      } = options;

      const verificationItems = [];

      // Get document verification items
      if (type === 'documents' || type === 'all') {
        const documents = await this.getDocumentVerificationItems(tenantId, {
          priority,
          assignedTo,
          limit: Math.floor(limit / 2),
          offset
        });
        verificationItems.push(...documents);
      }

      // Get match verification items
      if (type === 'matches' || type === 'all') {
        const matches = await this.getMatchVerificationItems(tenantId, {
          priority,
          assignedTo,
          limit: Math.floor(limit / 2),
          offset
        });
        verificationItems.push(...matches);
      }

      // Sort by priority and confidence
      verificationItems.sort((a, b) => {
        // Priority order: high -> medium -> low
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by confidence (lower confidence first for review)
        return a.confidence - b.confidence;
      });

      return {
        items: verificationItems.slice(0, limit),
        totalCount: verificationItems.length,
        hasMore: verificationItems.length > limit
      };

    } catch (error) {
      logger.error('Failed to get verification queue:', error);
      throw new AppError('Failed to load verification queue', 500);
    }
  }

  /**
   * Get document verification items
   */
  async getDocumentVerificationItems(tenantId, options = {}) {
    const documents = await this.prisma.document.findMany({
      where: {
        tenantId,
        OR: [
          { status: 'PROCESSED' },
          { status: 'NEEDS_REVIEW' }
        ],
        verificationStatus: {
          in: ['PENDING', 'IN_PROGRESS']
        },
        ...(options.assignedTo && { verificationAssignedTo: options.assignedTo })
      },
      include: {
        expenses: true,
        processingResults: true
      },
      orderBy: [
        { priority: 'desc' },
        { uploadedAt: 'desc' }
      ],
      take: options.limit,
      skip: options.offset
    });

    return documents.map(doc => this.formatDocumentVerificationItem(doc));
  }

  /**
   * Get match verification items
   */
  async getMatchVerificationItems(tenantId, options = {}) {
    const matches = await this.prisma.expenseTransactionMatch.findMany({
      where: {
        tenantId,
        status: 'PENDING_REVIEW',
        ...(options.assignedTo && { verificationAssignedTo: options.assignedTo })
      },
      include: {
        expense: {
          include: {
            currency: true,
            category: true,
            user: true
          }
        },
        bankTransaction: {
          include: {
            currency: true
          }
        }
      },
      orderBy: [
        { matchScore: 'asc' }, // Lower scores first
        { createdAt: 'desc' }
      ],
      take: options.limit,
      skip: options.offset
    });

    return matches.map(match => this.formatMatchVerificationItem(match));
  }

  /**
   * Format document for verification interface
   */
  formatDocumentVerificationItem(document) {
    const processingResult = document.processingResults?.[0];
    const extractedData = processingResult?.extractedData || {};
    
    // Determine priority based on confidence and issues
    let priority = 'medium';
    const confidence = processingResult?.confidenceScore || 0;
    
    if (confidence < 0.6) priority = 'high';
    else if (confidence > 0.8) priority = 'low';
    
    // Check for validation issues
    const issues = this.validateExtractedData(extractedData, document.type);
    if (issues.length > 0) priority = 'high';

    return {
      id: document.id,
      type: 'document',
      documentType: document.type,
      fileName: document.fileName,
      uploadedAt: document.uploadedAt,
      priority,
      confidence,
      extractedData,
      originalImageUrl: document.filePath,
      previewImageUrl: document.previewImagePath,
      issues,
      estimatedTime: this.estimateVerificationTime(extractedData, issues),
      keyboardShortcuts: this.keyboardShortcuts.verification,
      metadata: {
        ocrVersion: processingResult?.metadata?.ocrVersion,
        processingTime: processingResult?.metadata?.processingTime,
        enhancementSteps: processingResult?.metadata?.enhancementSteps
      }
    };
  }

  /**
   * Format match for verification interface
   */
  formatMatchVerificationItem(match) {
    const amountDiff = Math.abs(match.expense.amount - Math.abs(match.bankTransaction.amount));
    const dateDiff = Math.abs(moment(match.expense.transactionDate)
      .diff(moment(match.bankTransaction.transactionDate), 'days'));
    
    let priority = 'medium';
    if (match.matchScore < 0.6 || amountDiff > 100 || dateDiff > 7) {
      priority = 'high';
    } else if (match.matchScore > 0.9 && amountDiff < 10 && dateDiff <= 1) {
      priority = 'low';
    }

    return {
      id: match.id,
      type: 'match',
      matchScore: match.matchScore,
      confidence: match.confidence,
      priority,
      expense: {
        id: match.expense.id,
        amount: match.expense.amount,
        currency: match.expense.currency.code,
        date: match.expense.transactionDate,
        merchant: match.expense.merchantName,
        description: match.expense.description,
        category: match.expense.category?.name,
        user: match.expense.user?.name
      },
      transaction: {
        id: match.bankTransaction.id,
        amount: match.bankTransaction.amount,
        currency: match.bankTransaction.currency?.code || 'PLN',
        date: match.bankTransaction.transactionDate,
        description: match.bankTransaction.description
      },
      differences: {
        amount: amountDiff,
        amountPercentage: (amountDiff / match.expense.amount) * 100,
        date: dateDiff,
        currency: match.expense.currency.code !== (match.bankTransaction.currency?.code || 'PLN')
      },
      warnings: match.warnings || [],
      estimatedTime: this.estimateMatchVerificationTime(match),
      keyboardShortcuts: this.keyboardShortcuts.matching,
      metadata: match.metadata
    };
  }

  /**
   * Process verification submission
   */
  async processVerification(verificationId, verificationData, userId) {
    const startTime = Date.now();
    
    try {
      const { type, action, data, notes } = verificationData;
      
      let result;
      
      if (type === 'document') {
        result = await this.processDocumentVerification(verificationId, action, data, notes, userId);
      } else if (type === 'match') {
        result = await this.processMatchVerification(verificationId, action, data, notes, userId);
      } else {
        throw new AppError('Invalid verification type', 400);
      }
      
      // Update verification statistics
      await this.updateVerificationStats(userId, Date.now() - startTime, action);
      
      return {
        success: true,
        result,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error('Verification processing failed:', error);
      throw error;
    }
  }

  /**
   * Process document verification
   */
  async processDocumentVerification(documentId, action, data, notes, userId) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { processingResults: true }
    });
    
    if (!document) {
      throw new AppError('Document not found', 404);
    }
    
    switch (action) {
      case 'accept':
        return await this.acceptDocument(document, data, notes, userId);
      
      case 'correct':
        return await this.correctDocument(document, data, notes, userId);
      
      case 'reject':
        return await this.rejectDocument(document, notes, userId);
      
      case 'flag':
        return await this.flagDocument(document, data, notes, userId);
      
      default:
        throw new AppError('Invalid verification action', 400);
    }
  }

  /**
   * Process match verification
   */
  async processMatchVerification(matchId, action, data, notes, userId) {
    const match = await this.prisma.expenseTransactionMatch.findUnique({
      where: { id: matchId },
      include: {
        expense: true,
        bankTransaction: true
      }
    });
    
    if (!match) {
      throw new AppError('Match not found', 404);
    }
    
    switch (action) {
      case 'confirm':
        return await this.confirmMatch(match, data, notes, userId);
      
      case 'reject':
        return await this.rejectMatch(match, notes, userId);
      
      case 'adjust':
        return await this.adjustMatch(match, data, notes, userId);
      
      case 'manual_link':
        return await this.createManualLink(match, data, notes, userId);
      
      default:
        throw new AppError('Invalid match action', 400);
    }
  }

  /**
   * Accept document with extracted data
   */
  async acceptDocument(document, data, notes, userId) {
    const extractedData = data || document.processingResults?.[0]?.extractedData;
    
    // Validate the data
    const issues = this.validateExtractedData(extractedData, document.type);
    if (issues.length > 0) {
      throw new AppError('Data validation failed: ' + issues.join(', '), 400);
    }
    
    // Create or update expense record
    const expense = await this.createExpenseFromDocument(document, extractedData, userId);
    
    // Update document status
    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'COMPLETED',
        verificationStatus: 'VERIFIED',
        verifiedBy: userId,
        verifiedAt: new Date(),
        verificationNotes: notes
      }
    });
    
    // Log verification action
    await this.logVerificationAction({
      documentId: document.id,
      action: 'ACCEPT',
      userId,
      data: extractedData,
      notes
    });
    
    return { expense, document };
  }

  /**
   * Correct document data
   */
  async correctDocument(document, correctedData, notes, userId) {
    // Validate corrected data
    const issues = this.validateExtractedData(correctedData, document.type);
    if (issues.length > 0) {
      throw new AppError('Corrected data validation failed: ' + issues.join(', '), 400);
    }
    
    // Store original data for audit
    const originalData = document.processingResults?.[0]?.extractedData;
    
    // Update processing results with corrected data
    await this.prisma.documentProcessingResult.updateMany({
      where: { documentId: document.id },
      data: {
        extractedData: correctedData,
        originalExtractedData: originalData,
        correctedBy: userId,
        correctedAt: new Date(),
        correctionNotes: notes
      }
    });
    
    // Create expense with corrected data
    const expense = await this.createExpenseFromDocument(document, correctedData, userId);
    
    // Update document status
    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'COMPLETED',
        verificationStatus: 'CORRECTED',
        verifiedBy: userId,
        verifiedAt: new Date(),
        verificationNotes: notes
      }
    });
    
    // Log correction action
    await this.logVerificationAction({
      documentId: document.id,
      action: 'CORRECT',
      userId,
      data: { original: originalData, corrected: correctedData },
      notes
    });
    
    return { expense, document };
  }

  /**
   * Reject document
   */
  async rejectDocument(document, notes, userId) {
    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'REJECTED',
        verificationStatus: 'REJECTED',
        verifiedBy: userId,
        verifiedAt: new Date(),
        verificationNotes: notes
      }
    });
    
    // Log rejection
    await this.logVerificationAction({
      documentId: document.id,
      action: 'REJECT',
      userId,
      notes
    });
    
    return { document };
  }

  /**
   * Flag document for further review
   */
  async flagDocument(document, flagData, notes, userId) {
    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'FLAGGED',
        verificationStatus: 'FLAGGED',
        flaggedBy: userId,
        flaggedAt: new Date(),
        flagReason: flagData.reason,
        verificationNotes: notes
      }
    });
    
    // Create flag record
    await this.prisma.documentFlag.create({
      data: {
        documentId: document.id,
        reason: flagData.reason,
        category: flagData.category || 'OTHER',
        description: notes,
        flaggedBy: userId,
        priority: flagData.priority || 'MEDIUM'
      }
    });
    
    // Log flag action
    await this.logVerificationAction({
      documentId: document.id,
      action: 'FLAG',
      userId,
      data: flagData,
      notes
    });
    
    return { document };
  }

  /**
   * Confirm expense-transaction match
   */
  async confirmMatch(match, data, notes, userId) {
    // Update match status
    await this.prisma.expenseTransactionMatch.update({
      where: { id: match.id },
      data: {
        status: 'CONFIRMED',
        verifiedBy: userId,
        verifiedAt: new Date(),
        verificationNotes: notes,
        finalScore: data?.adjustedScore || match.matchScore
      }
    });
    
    // Update expense and transaction
    await this.prisma.expense.update({
      where: { id: match.expenseId },
      data: {
        bankTransactionId: match.bankTransactionId,
        matchingStatus: 'MATCHED'
      }
    });
    
    await this.prisma.bankTransaction.update({
      where: { id: match.bankTransactionId },
      data: {
        expenseId: match.expenseId,
        matchingStatus: 'MATCHED'
      }
    });
    
    // Log confirmation
    await this.logVerificationAction({
      matchId: match.id,
      action: 'CONFIRM_MATCH',
      userId,
      data,
      notes
    });
    
    return { match };
  }

  /**
   * Reject expense-transaction match
   */
  async rejectMatch(match, notes, userId) {
    await this.prisma.expenseTransactionMatch.update({
      where: { id: match.id },
      data: {
        status: 'REJECTED',
        verifiedBy: userId,
        verifiedAt: new Date(),
        verificationNotes: notes
      }
    });
    
    // Log rejection
    await this.logVerificationAction({
      matchId: match.id,
      action: 'REJECT_MATCH',
      userId,
      notes
    });
    
    return { match };
  }

  /**
   * Create expense from verified document data
   */
  async createExpenseFromDocument(document, extractedData, userId) {
    // Find or create category
    let categoryId = null;
    if (extractedData.category) {
      const category = await this.prisma.expenseCategory.findFirst({
        where: {
          tenantId: document.tenantId,
          name: extractedData.category
        }
      });
      
      if (category) {
        categoryId = category.id;
      }
    }
    
    // Find currency
    const currency = await this.prisma.currency.findFirst({
      where: { code: extractedData.currency || 'PLN' }
    });
    
    return await this.prisma.expense.create({
      data: {
        tenantId: document.tenantId,
        companyId: document.companyId,
        userId: userId,
        documentId: document.id,
        title: extractedData.description || extractedData.merchant_name || 'Imported Expense',
        description: extractedData.description,
        amount: parseFloat(extractedData.total_amount),
        currencyId: currency?.id,
        categoryId,
        merchantName: extractedData.merchant_name,
        transactionDate: new Date(extractedData.transaction_date),
        taxAmount: extractedData.vat_amount ? parseFloat(extractedData.vat_amount) : null,
        taxId: extractedData.tax_id,
        invoiceNumber: extractedData.invoice_number,
        status: 'APPROVED', // Auto-approve verified expenses
        verificationStatus: 'VERIFIED',
        metadata: {
          ocrExtracted: true,
          originalData: extractedData,
          verificationTimestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Validate extracted data
   */
  validateExtractedData(data, documentType) {
    const issues = [];
    const rules = this.verificationRules[documentType];
    
    if (!rules) return issues;
    
    // Check required fields
    for (const field of rules.requiredFields) {
      if (!data[field] || (Array.isArray(data[field]) && data[field].length === 0)) {
        issues.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate field values
    for (const [field, rule] of Object.entries(rules.validationRules)) {
      const value = data[field];
      if (value === undefined || value === null) continue;
      
      if (field.includes('amount')) {
        const amount = parseFloat(value);
        if (isNaN(amount)) {
          issues.push(`Invalid amount: ${field}`);
        } else if (rule.min !== undefined && amount < rule.min) {
          issues.push(`Amount too low: ${field} (${amount} < ${rule.min})`);
        } else if (rule.max !== undefined && amount > rule.max) {
          issues.push(`Amount too high: ${field} (${amount} > ${rule.max})`);
        }
      }
      
      if (field.includes('date')) {
        const date = moment(value);
        if (!date.isValid()) {
          issues.push(`Invalid date: ${field}`);
        } else if (rule.minDate && date.isBefore(rule.minDate)) {
          issues.push(`Date too old: ${field}`);
        } else if (rule.maxDate && date.isAfter(rule.maxDate)) {
          issues.push(`Date in future: ${field}`);
        }
      }
    }
    
    return issues;
  }

  /**
   * Estimate verification time based on complexity
   */
  estimateVerificationTime(extractedData, issues) {
    let baseTime = 30; // 30 seconds base
    
    // Add time for issues
    baseTime += issues.length * 15;
    
    // Add time for missing data
    const missingFields = Object.values(extractedData).filter(v => !v).length;
    baseTime += missingFields * 10;
    
    // Add time for complex documents
    if (extractedData.items && extractedData.items.length > 5) {
      baseTime += 30;
    }
    
    return Math.min(baseTime, 300); // Max 5 minutes
  }

  /**
   * Estimate match verification time
   */
  estimateMatchVerificationTime(match) {
    let baseTime = 20; // 20 seconds base
    
    // Add time for low confidence
    if (match.matchScore < 0.7) baseTime += 30;
    
    // Add time for warnings
    baseTime += (match.warnings?.length || 0) * 10;
    
    // Add time for large differences
    if (match.amountDifference > 100) baseTime += 20;
    if (match.dateDifference > 3) baseTime += 15;
    
    return Math.min(baseTime, 180); // Max 3 minutes
  }

  /**
   * Log verification action for audit trail
   */
  async logVerificationAction(actionData) {
    try {
      await this.prisma.verificationLog.create({
        data: {
          ...actionData,
          timestamp: new Date(),
          ipAddress: actionData.ipAddress,
          userAgent: actionData.userAgent
        }
      });
    } catch (error) {
      logger.warn('Failed to log verification action:', error);
    }
  }

  /**
   * Update verification statistics
   */
  async updateVerificationStats(userId, processingTime, action) {
    try {
      const stats = await this.prisma.userVerificationStats.upsert({
        where: { userId },
        create: {
          userId,
          totalItems: 1,
          totalTime: processingTime,
          averageTime: processingTime,
          verified: action === 'accept' ? 1 : 0,
          corrected: action === 'correct' ? 1 : 0,
          rejected: action === 'reject' ? 1 : 0
        },
        update: {
          totalItems: { increment: 1 },
          totalTime: { increment: processingTime },
          averageTime: { divide: 2 }, // Will be recalculated
          verified: action === 'accept' ? { increment: 1 } : undefined,
          corrected: action === 'correct' ? { increment: 1 } : undefined,
          rejected: action === 'reject' ? { increment: 1 } : undefined
        }
      });
      
      // Recalculate average time
      await this.prisma.userVerificationStats.update({
        where: { userId },
        data: {
          averageTime: Math.round(stats.totalTime / stats.totalItems)
        }
      });
    } catch (error) {
      logger.warn('Failed to update verification stats:', error);
    }
  }

  /**
   * Get verification statistics for dashboard
   */
  async getVerificationStats(tenantId, userId = null, dateRange = null) {
    const where = {
      tenantId,
      ...(userId && { verifiedBy: userId }),
      ...(dateRange && {
        verifiedAt: {
          gte: new Date(dateRange.from),
          lte: new Date(dateRange.to)
        }
      })
    };
    
    const [documentStats, matchStats] = await Promise.all([
      this.prisma.document.groupBy({
        by: ['verificationStatus'],
        where,
        _count: true
      }),
      this.prisma.expenseTransactionMatch.groupBy({
        by: ['status'],
        where: {
          tenantId,
          ...(userId && { verifiedBy: userId }),
          ...(dateRange && {
            verifiedAt: {
              gte: new Date(dateRange.from),
              lte: new Date(dateRange.to)
            }
          })
        },
        _count: true
      })
    ]);
    
    return {
      documents: documentStats.reduce((acc, stat) => {
        acc[stat.verificationStatus] = stat._count;
        return acc;
      }, {}),
      matches: matchStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {}),
      efficiency: await this.calculateVerificationEfficiency(tenantId, userId, dateRange)
    };
  }

  /**
   * Calculate verification efficiency metrics
   */
  async calculateVerificationEfficiency(tenantId, userId = null, dateRange = null) {
    const where = {
      tenantId,
      ...(userId && { userId }),
      ...(dateRange && {
        timestamp: {
          gte: new Date(dateRange.from),
          lte: new Date(dateRange.to)
        }
      })
    };
    
    const stats = await this.prisma.verificationLog.aggregate({
      where,
      _avg: { processingTime: true },
      _count: true
    });
    
    const accuracy = await this.calculateVerificationAccuracy(tenantId, userId, dateRange);
    
    return {
      averageTime: stats._avg.processingTime || 0,
      totalItems: stats._count,
      accuracy,
      throughput: this.calculateThroughput(stats._count, dateRange)
    };
  }

  /**
   * Calculate verification accuracy
   */
  async calculateVerificationAccuracy(tenantId, userId = null, dateRange = null) {
    // This would need additional tracking of verification quality
    // For now, return a placeholder
    return 0.95; // 95% accuracy
  }

  /**
   * Calculate throughput (items per hour)
   */
  calculateThroughput(totalItems, dateRange) {
    if (!dateRange || !totalItems) return 0;
    
    const start = moment(dateRange.from);
    const end = moment(dateRange.to);
    const hours = end.diff(start, 'hours', true);
    
    return hours > 0 ? totalItems / hours : 0;
  }

  // Helper methods for generating suggestions...
  
  generateAmountSuggestions(value, context) {
    const suggestions = [];
    const amount = parseFloat(value);
    
    if (isNaN(amount)) return suggestions;
    
    // Common amount corrections
    suggestions.push(
      { value: amount.toFixed(2), reason: 'Standard format' },
      { value: (amount * 1.23).toFixed(2), reason: 'With 23% VAT' },
      { value: (amount / 1.23).toFixed(2), reason: 'Without VAT' }
    );
    
    return suggestions;
  }

  generateDateSuggestions(value, context) {
    const suggestions = [];
    const date = moment(value);
    
    if (!date.isValid()) {
      // Try to parse common date formats
      const formats = ['DD.MM.YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
      for (const format of formats) {
        const parsed = moment(value, format, true);
        if (parsed.isValid()) {
          suggestions.push({
            value: parsed.format('YYYY-MM-DD'),
            reason: `Parsed as ${format}`
          });
        }
      }
    } else {
      suggestions.push(
        { value: date.format('YYYY-MM-DD'), reason: 'ISO format' },
        { value: date.add(1, 'day').format('YYYY-MM-DD'), reason: 'Next day' },
        { value: date.subtract(2, 'days').format('YYYY-MM-DD'), reason: 'Previous day' }
      );
    }
    
    return suggestions;
  }

  generateMerchantSuggestions(value, context) {
    // This would typically query a database of known merchants
    // For now, return basic suggestions
    return [
      { value: value.trim(), reason: 'Cleaned up' },
      { value: value.toUpperCase(), reason: 'Uppercase' },
      { value: value.toLowerCase(), reason: 'Lowercase' }
    ];
  }

  generateTaxIdSuggestions(value, context) {
    const suggestions = [];
    
    if (value) {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length >= 10) {
        suggestions.push({
          value: cleaned.substring(0, 10),
          reason: 'Polish NIP format'
        });
      }
    }
    
    return suggestions;
  }

  generateCurrencySuggestions(value, context) {
    const currencies = ['PLN', 'EUR', 'USD', 'GBP', 'CHF'];
    return currencies.map(currency => ({
      value: currency,
      reason: `${currency} currency`
    }));
  }

  validateTaxId(value) {
    if (!value) return false;
    
    const cleaned = value.replace(/\D/g, '');
    
    // Polish NIP validation
    if (cleaned.length === 10) {
      const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
      let sum = 0;
      
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned[i]) * weights[i];
      }
      
      const checkDigit = sum % 11;
      return checkDigit === parseInt(cleaned[9]);
    }
    
    return false;
  }
}

module.exports = DataVerificationInterface; 