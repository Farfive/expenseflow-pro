const moment = require('moment');
const levenshtein = require('fast-levenshtein');
const logger = require('../utils/logger');
const { formatCurrency } = require('../utils/i18n');

/**
 * Smart Reconciliation Engine
 * Advanced multi-currency matching with fuzzy logic for expense-to-transaction reconciliation
 */
class SmartReconciliationEngine {
  constructor(prisma) {
    this.prisma = prisma;
    this.matchingRules = {
      // Exact match: same amount, date, and high merchant similarity
      exact: {
        weight: 1.0,
        amountTolerance: 0.0,
        dateTolerance: 0,
        merchantSimilarity: 0.95,
        autoConfirm: true
      },
      // High confidence: close amount, same/next day, good merchant match
      high: {
        weight: 0.9,
        amountTolerance: 0.02, // 2%
        dateTolerance: 1, // 1 day
        merchantSimilarity: 0.8,
        autoConfirm: true
      },
      // Medium confidence: reasonable amount tolerance, few days difference
      medium: {
        weight: 0.7,
        amountTolerance: 0.05, // 5%
        dateTolerance: 3, // 3 days
        merchantSimilarity: 0.6,
        autoConfirm: false
      },
      // Low confidence: higher tolerances, requires manual review
      low: {
        weight: 0.5,
        amountTolerance: 0.1, // 10%
        dateTolerance: 7, // 1 week
        merchantSimilarity: 0.4,
        autoConfirm: false
      }
    };
    
    this.exchangeRateCache = new Map();
    this.merchantAliasCache = new Map();
    this.processingStats = {
      totalExpenses: 0,
      totalTransactions: 0,
      matchesFound: 0,
      autoConfirmed: 0,
      requiresReview: 0
    };
  }

  /**
   * Reconcile expenses with bank transactions
   */
  async reconcileExpenses(options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting smart reconciliation process');
      
      // Reset processing stats
      this.resetProcessingStats();
      
      // Get unmatched expenses and transactions
      const { expenses, transactions } = await this.getUnmatchedData(options);
      
      this.processingStats.totalExpenses = expenses.length;
      this.processingStats.totalTransactions = transactions.length;
      
      logger.info(`Found ${expenses.length} unmatched expenses and ${transactions.length} unmatched transactions`);
      
      // Pre-process data for better matching
      const processedExpenses = await this.preprocessExpenses(expenses);
      const processedTransactions = await this.preprocessTransactions(transactions);
      
      // Update exchange rates for multi-currency matching
      await this.updateExchangeRates();
      
      // Build merchant alias mappings
      await this.buildMerchantAliases(processedExpenses, processedTransactions);
      
      // Find potential matches
      const potentialMatches = await this.findPotentialMatches(
        processedExpenses, 
        processedTransactions, 
        options
      );
      
      // Score and rank matches
      const scoredMatches = await this.scoreMatches(potentialMatches, options);
      
      // Apply business rules and filters
      const filteredMatches = this.applyBusinessRules(scoredMatches, options);
      
      // Resolve conflicts (one-to-one matching)
      const finalMatches = this.resolveConflicts(filteredMatches);
      
      // Save matches to database
      const savedMatches = await this.saveMatches(finalMatches, options);
      
      // Generate reconciliation report
      const report = await this.generateReconciliationReport(savedMatches, options);
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`Reconciliation completed: ${savedMatches.length} matches found in ${processingTime}ms`);
      
      return {
        success: true,
        matches: savedMatches,
        report,
        processingTime,
        stats: this.processingStats
      };
      
    } catch (error) {
      logger.error('Reconciliation process failed:', error);
      
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        matches: [],
        stats: this.processingStats
      };
    }
  }

  /**
   * Get unmatched expenses and transactions
   */
  async getUnmatchedData(options = {}) {
    const { tenantId, companyId, dateFrom, dateTo, currencyFilter } = options;
    
    const baseWhere = {
      tenantId,
      ...(companyId && { companyId }),
      ...(dateFrom && dateTo && {
        transactionDate: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo)
        }
      }),
      ...(currencyFilter && { currency: currencyFilter })
    };
    
    // Get unmatched expenses
    const expenses = await this.prisma.expense.findMany({
      where: {
        ...baseWhere,
        OR: [
          { bankTransactionId: null },
          { matchingStatus: 'UNMATCHED' }
        ]
      },
      include: {
        category: true,
        user: true,
        currency: true
      },
      orderBy: { transactionDate: 'desc' }
    });
    
    // Get unmatched bank transactions
    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        tenantId,
        ...(companyId && { companyId }),
        ...(dateFrom && dateTo && {
          transactionDate: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          }
        }),
        OR: [
          { expenseId: null },
          { matchingStatus: 'UNMATCHED' }
        ]
      },
      include: {
        currency: true
      },
      orderBy: { transactionDate: 'desc' }
    });
    
    return { expenses, transactions };
  }

  /**
   * Preprocess expenses for better matching
   */
  async preprocessExpenses(expenses) {
    return expenses.map(expense => ({
      ...expense,
      // Normalize merchant name
      normalizedMerchant: this.normalizeMerchantName(expense.merchantName),
      // Extract keywords from description
      keywords: this.extractKeywords(expense.description || expense.title),
      // Calculate search hash for quick lookups
      searchHash: this.generateSearchHash(expense),
      // Convert amount to base currency equivalent
      baseAmount: expense.amount, // Will be converted later with exchange rates
      originalData: expense
    }));
  }

  /**
   * Preprocess bank transactions for better matching
   */
  async preprocessTransactions(transactions) {
    return transactions.map(transaction => ({
      ...transaction,
      // Normalize description
      normalizedDescription: this.normalizeTransactionDescription(transaction.description),
      // Extract merchant-like information
      extractedMerchant: this.extractMerchantFromDescription(transaction.description),
      // Extract keywords
      keywords: this.extractKeywords(transaction.description),
      // Calculate search hash
      searchHash: this.generateSearchHash(transaction),
      // Convert amount to base currency equivalent
      baseAmount: Math.abs(transaction.amount), // Use absolute value, will be converted
      originalData: transaction
    }));
  }

  /**
   * Normalize merchant names for better matching
   */
  normalizeMerchantName(merchantName) {
    if (!merchantName) return '';
    
    return merchantName
      .toLowerCase()
      .trim()
      // Remove common business suffixes
      .replace(/\b(sp\.?\s*z\.?\s*o\.?\s*o\.?|s\.?\s*a\.?|ltd\.?|inc\.?|corp\.?|gmbh|ag)\b/gi, '')
      // Remove special characters
      .replace(/[^\w\s]/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalize transaction descriptions
   */
  normalizeTransactionDescription(description) {
    if (!description) return '';
    
    return description
      .toLowerCase()
      .trim()
      // Remove transaction codes and references
      .replace(/\b(ref|trn|txn|trans|id)[\s:]*\d+/gi, '')
      // Remove dates
      .replace(/\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/g, '')
      // Remove card numbers
      .replace(/\*+\d{4}/g, '')
      // Remove special characters
      .replace(/[^\w\s]/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract merchant information from transaction description
   */
  extractMerchantFromDescription(description) {
    if (!description) return '';
    
    // Common patterns for merchant extraction
    const patterns = [
      // Card payments: "PURCHASE 1234 MERCHANT NAME CITY"
      /purchase\s+\d+\s+([^0-9]+?)(?:\s+\d|\s*$)/i,
      // Direct patterns: "MERCHANT NAME SOME DETAILS"
      /^([A-Za-z\s&]+?)(?:\s+\d|\s*$)/,
      // After location: "LOCATION - MERCHANT NAME"
      /[-]\s*([A-Za-z\s&]+?)(?:\s+\d|\s*$)/
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return this.normalizeMerchantName(match[1]);
      }
    }
    
    return this.normalizeTransactionDescription(description);
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    if (!text) return [];
    
    const stopWords = new Set([
      'and', 'or', 'but', 'the', 'a', 'an', 'to', 'of', 'in', 'for', 'on', 'at', 'by',
      'i', 'przy', 'dla', 'na', 'w', 'do', 'z', 'ze', 'od', 'po', 'przez',
      'und', 'oder', 'der', 'die', 'das', 'ein', 'eine', 'zu', 'in', 'für', 'mit'
    ]);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to first 10 keywords
  }

  /**
   * Generate search hash for quick lookups
   */
  generateSearchHash(item) {
    const date = moment(item.transactionDate || item.date).format('YYYY-MM-DD');
    const amount = Math.abs(item.amount || 0).toFixed(2);
    const merchant = (item.merchantName || item.extractedMerchant || '').substring(0, 10);
    
    return `${date}_${amount}_${merchant}`.replace(/[^\w]/g, '_');
  }

  /**
   * Update exchange rates for multi-currency matching
   */
  async updateExchangeRates() {
    try {
      // Get all active currencies
      const currencies = await this.prisma.currency.findMany({
        where: { isActive: true }
      });
      
      // Build exchange rate matrix
      for (const fromCurrency of currencies) {
        for (const toCurrency of currencies) {
          if (fromCurrency.code !== toCurrency.code) {
            const rate = await this.getExchangeRate(fromCurrency.code, toCurrency.code);
            this.exchangeRateCache.set(
              `${fromCurrency.code}_${toCurrency.code}`, 
              rate
            );
          }
        }
      }
      
      logger.debug(`Updated ${this.exchangeRateCache.size} exchange rates`);
    } catch (error) {
      logger.warn('Failed to update exchange rates:', error);
    }
  }

  /**
   * Get exchange rate between currencies
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1.0;
    
    try {
      // Try to get from database first
      const exchangeRate = await this.prisma.exchangeRate.findFirst({
        where: {
          fromCurrency,
          toCurrency,
          date: {
            gte: moment().subtract(1, 'day').toDate() // Within last day
          }
        },
        orderBy: { date: 'desc' }
      });
      
      if (exchangeRate) {
        return exchangeRate.rate;
      }
      
      // Fallback to hardcoded rates or external API
      const fallbackRates = {
        'PLN_EUR': 0.23,
        'PLN_USD': 0.25,
        'EUR_PLN': 4.35,
        'EUR_USD': 1.09,
        'USD_PLN': 4.0,
        'USD_EUR': 0.92
      };
      
      return fallbackRates[`${fromCurrency}_${toCurrency}`] || 1.0;
      
    } catch (error) {
      logger.warn(`Failed to get exchange rate ${fromCurrency}->${toCurrency}:`, error);
      return 1.0;
    }
  }

  /**
   * Convert amount between currencies
   */
  convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const rate = this.exchangeRateCache.get(cacheKey) || 1.0;
    
    return amount * rate;
  }

  /**
   * Build merchant alias mappings
   */
  async buildMerchantAliases(expenses, transactions) {
    const merchantNames = new Set();
    const transactionMerchants = new Set();
    
    // Collect all merchant names
    expenses.forEach(exp => {
      if (exp.normalizedMerchant) {
        merchantNames.add(exp.normalizedMerchant);
      }
    });
    
    transactions.forEach(trans => {
      if (trans.extractedMerchant) {
        transactionMerchants.add(trans.extractedMerchant);
      }
    });
    
    // Build alias mappings using similarity
    for (const merchant of merchantNames) {
      const aliases = [];
      
      for (const transMerchant of transactionMerchants) {
        const similarity = this.calculateTextSimilarity(merchant, transMerchant);
        if (similarity > 0.7) {
          aliases.push(transMerchant);
        }
      }
      
      if (aliases.length > 0) {
        this.merchantAliasCache.set(merchant, aliases);
      }
    }
    
    logger.debug(`Built merchant aliases for ${this.merchantAliasCache.size} merchants`);
  }

  /**
   * Find potential matches between expenses and transactions
   */
  async findPotentialMatches(expenses, transactions, options = {}) {
    const matches = [];
    const maxMatches = options.maxMatches || 5; // Max matches per expense
    
    for (const expense of expenses) {
      const expenseMatches = [];
      
      // Convert expense amount to base currency for comparison
      const expenseBaseAmount = this.convertCurrency(
        expense.amount,
        expense.currency?.code || 'PLN',
        'PLN'
      );
      
      for (const transaction of transactions) {
        // Convert transaction amount to base currency
        const transactionBaseAmount = this.convertCurrency(
          Math.abs(transaction.amount),
          transaction.currency?.code || 'PLN',
          'PLN'
        );
        
        // Quick pre-filter checks
        if (!this.passesPreFilter(expense, transaction, expenseBaseAmount, transactionBaseAmount)) {
          continue;
        }
        
        // Calculate detailed match score
        const matchScore = this.calculateMatchScore(
          expense, 
          transaction, 
          expenseBaseAmount, 
          transactionBaseAmount
        );
        
        if (matchScore.overall > 0.3) { // Minimum threshold
          expenseMatches.push({
            expense,
            transaction,
            score: matchScore,
            confidence: this.determineConfidenceLevel(matchScore)
          });
        }
      }
      
      // Sort by score and take top matches
      expenseMatches.sort((a, b) => b.score.overall - a.score.overall);
      matches.push(...expenseMatches.slice(0, maxMatches));
    }
    
    return matches;
  }

  /**
   * Pre-filter to quickly eliminate unlikely matches
   */
  passesPreFilter(expense, transaction, expenseAmount, transactionAmount) {
    // Amount pre-filter (within 50% tolerance)
    const amountRatio = Math.abs(expenseAmount - transactionAmount) / Math.max(expenseAmount, transactionAmount);
    if (amountRatio > 0.5) return false;
    
    // Date pre-filter (within 30 days)
    const expenseDate = moment(expense.transactionDate);
    const transactionDate = moment(transaction.transactionDate);
    const daysDiff = Math.abs(expenseDate.diff(transactionDate, 'days'));
    if (daysDiff > 30) return false;
    
    // Transaction must be debit (negative) for expense matching
    if (transaction.amount > 0) return false;
    
    return true;
  }

  /**
   * Calculate comprehensive match score
   */
  calculateMatchScore(expense, transaction, expenseAmount, transactionAmount) {
    const score = {
      amount: 0,
      date: 0,
      merchant: 0,
      keywords: 0,
      currency: 0,
      overall: 0
    };
    
    // Amount similarity (40% weight)
    score.amount = this.calculateAmountSimilarity(expenseAmount, transactionAmount);
    
    // Date similarity (25% weight)
    score.date = this.calculateDateSimilarity(expense.transactionDate, transaction.transactionDate);
    
    // Merchant/description similarity (25% weight)
    score.merchant = this.calculateMerchantSimilarity(expense, transaction);
    
    // Keyword similarity (5% weight)
    score.keywords = this.calculateKeywordSimilarity(expense.keywords, transaction.keywords);
    
    // Currency compatibility (5% weight)
    score.currency = this.calculateCurrencyCompatibility(expense, transaction);
    
    // Calculate weighted overall score
    score.overall = (
      score.amount * 0.40 +
      score.date * 0.25 +
      score.merchant * 0.25 +
      score.keywords * 0.05 +
      score.currency * 0.05
    );
    
    return score;
  }

  /**
   * Calculate amount similarity
   */
  calculateAmountSimilarity(amount1, amount2) {
    if (amount1 === 0 && amount2 === 0) return 1.0;
    if (amount1 === 0 || amount2 === 0) return 0.0;
    
    const maxAmount = Math.max(amount1, amount2);
    const difference = Math.abs(amount1 - amount2);
    const ratio = difference / maxAmount;
    
    // Exact match
    if (ratio === 0) return 1.0;
    
    // High similarity (within 2%)
    if (ratio <= 0.02) return 0.95;
    
    // Good similarity (within 5%)
    if (ratio <= 0.05) return 0.8;
    
    // Acceptable similarity (within 10%)
    if (ratio <= 0.10) return 0.6;
    
    // Poor similarity (within 20%)
    if (ratio <= 0.20) return 0.3;
    
    // Very poor similarity
    return Math.max(0, 1 - ratio);
  }

  /**
   * Calculate date similarity
   */
  calculateDateSimilarity(date1, date2) {
    const moment1 = moment(date1);
    const moment2 = moment(date2);
    const daysDiff = Math.abs(moment1.diff(moment2, 'days'));
    
    // Same day
    if (daysDiff === 0) return 1.0;
    
    // Next day (common for card transactions)
    if (daysDiff === 1) return 0.9;
    
    // Within 3 days
    if (daysDiff <= 3) return 0.7;
    
    // Within a week
    if (daysDiff <= 7) return 0.5;
    
    // Within two weeks
    if (daysDiff <= 14) return 0.3;
    
    // Beyond two weeks
    return Math.max(0, 1 - (daysDiff / 30));
  }

  /**
   * Calculate merchant similarity
   */
  calculateMerchantSimilarity(expense, transaction) {
    const expenseMerchant = expense.normalizedMerchant || '';
    const transactionMerchant = transaction.extractedMerchant || '';
    
    if (!expenseMerchant && !transactionMerchant) return 0.5;
    if (!expenseMerchant || !transactionMerchant) return 0.1;
    
    // Direct similarity
    let similarity = this.calculateTextSimilarity(expenseMerchant, transactionMerchant);
    
    // Check aliases
    const aliases = this.merchantAliasCache.get(expenseMerchant) || [];
    for (const alias of aliases) {
      const aliasSimilarity = this.calculateTextSimilarity(alias, transactionMerchant);
      similarity = Math.max(similarity, aliasSimilarity);
    }
    
    // Boost for partial matches
    if (similarity < 0.8) {
      const words1 = expenseMerchant.split(' ');
      const words2 = transactionMerchant.split(' ');
      
      let wordMatches = 0;
      for (const word1 of words1) {
        for (const word2 of words2) {
          if (word1.length > 2 && word2.length > 2) {
            const wordSim = this.calculateTextSimilarity(word1, word2);
            if (wordSim > 0.8) {
              wordMatches++;
              break;
            }
          }
        }
      }
      
      const wordSimilarity = wordMatches / Math.max(words1.length, words2.length);
      similarity = Math.max(similarity, wordSimilarity * 0.8);
    }
    
    return similarity;
  }

  /**
   * Calculate text similarity using Levenshtein distance
   */
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1;
    
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1;
    
    const distance = levenshtein.get(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate keyword similarity
   */
  calculateKeywordSimilarity(keywords1, keywords2) {
    if (!keywords1.length && !keywords2.length) return 0.5;
    if (!keywords1.length || !keywords2.length) return 0.1;
    
    let matches = 0;
    for (const keyword1 of keywords1) {
      for (const keyword2 of keywords2) {
        if (this.calculateTextSimilarity(keyword1, keyword2) > 0.8) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(keywords1.length, keywords2.length);
  }

  /**
   * Calculate currency compatibility
   */
  calculateCurrencyCompatibility(expense, transaction) {
    const expenseCurrency = expense.currency?.code || 'PLN';
    const transactionCurrency = transaction.currency?.code || 'PLN';
    
    // Same currency
    if (expenseCurrency === transactionCurrency) return 1.0;
    
    // Compatible currencies (common pairs)
    const compatiblePairs = [
      ['PLN', 'EUR'], ['EUR', 'PLN'],
      ['EUR', 'USD'], ['USD', 'EUR'],
      ['PLN', 'USD'], ['USD', 'PLN']
    ];
    
    const isCompatible = compatiblePairs.some(([c1, c2]) => 
      (expenseCurrency === c1 && transactionCurrency === c2) ||
      (expenseCurrency === c2 && transactionCurrency === c1)
    );
    
    return isCompatible ? 0.8 : 0.5;
  }

  /**
   * Determine confidence level based on score
   */
  determineConfidenceLevel(score) {
    if (score.overall >= 0.9) return 'exact';
    if (score.overall >= 0.7) return 'high';
    if (score.overall >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Score and rank all matches
   */
  async scoreMatches(potentialMatches, options = {}) {
    // Group matches by expense
    const matchesByExpense = new Map();
    
    for (const match of potentialMatches) {
      const expenseId = match.expense.id;
      if (!matchesByExpense.has(expenseId)) {
        matchesByExpense.set(expenseId, []);
      }
      matchesByExpense.get(expenseId).push(match);
    }
    
    // Process each expense's matches
    const scoredMatches = [];
    
    for (const [expenseId, matches] of matchesByExpense) {
      // Sort by score
      matches.sort((a, b) => b.score.overall - a.score.overall);
      
      // Apply confidence bonuses and penalties
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        
        // Penalty for lower-ranked matches
        match.score.overall *= (1 - (i * 0.1));
        
        // Bonus for high individual component scores
        if (match.score.amount > 0.95 && match.score.date > 0.9) {
          match.score.overall *= 1.1;
        }
        
        // Recalculate confidence level after adjustments
        match.confidence = this.determineConfidenceLevel(match.score);
        
        scoredMatches.push(match);
      }
    }
    
    return scoredMatches;
  }

  /**
   * Apply business rules and filters
   */
  applyBusinessRules(scoredMatches, options = {}) {
    const filteredMatches = [];
    
    for (const match of scoredMatches) {
      let includeMatch = true;
      const warnings = [];
      
      // Rule 1: Minimum score threshold
      if (match.score.overall < 0.3) {
        includeMatch = false;
      }
      
      // Rule 2: Amount reasonableness check
      const expenseAmount = match.expense.amount;
      const transactionAmount = Math.abs(match.transaction.amount);
      const amountRatio = Math.abs(expenseAmount - transactionAmount) / Math.max(expenseAmount, transactionAmount);
      
      if (amountRatio > 0.2) {
        warnings.push('high_amount_variance');
        if (amountRatio > 0.5) {
          includeMatch = false;
        }
      }
      
      // Rule 3: Date reasonableness
      const daysDiff = Math.abs(moment(match.expense.transactionDate).diff(moment(match.transaction.transactionDate), 'days'));
      if (daysDiff > 14) {
        warnings.push('large_date_difference');
        if (daysDiff > 30) {
          includeMatch = false;
        }
      }
      
      // Rule 4: Currency conversion reasonableness
      if (match.expense.currency?.code !== match.transaction.currency?.code) {
        warnings.push('currency_conversion');
        if (match.score.currency < 0.5) {
          includeMatch = false;
        }
      }
      
      // Rule 5: Duplicate prevention
      const isDuplicate = filteredMatches.some(existing => 
        existing.expense.id === match.expense.id && 
        existing.transaction.id === match.transaction.id
      );
      
      if (isDuplicate) {
        includeMatch = false;
      }
      
      if (includeMatch) {
        match.warnings = warnings;
        filteredMatches.push(match);
      }
    }
    
    return filteredMatches;
  }

  /**
   * Resolve conflicts to ensure one-to-one matching
   */
  resolveConflicts(matches) {
    const expenseMatches = new Map(); // expense.id -> best match
    const transactionMatches = new Map(); // transaction.id -> best match
    
    // Sort all matches by score
    const sortedMatches = [...matches].sort((a, b) => b.score.overall - a.score.overall);
    
    const finalMatches = [];
    
    for (const match of sortedMatches) {
      const expenseId = match.expense.id;
      const transactionId = match.transaction.id;
      
      // Check if either expense or transaction is already matched
      if (expenseMatches.has(expenseId) || transactionMatches.has(transactionId)) {
        continue;
      }
      
      // Add to final matches
      finalMatches.push(match);
      expenseMatches.set(expenseId, match);
      transactionMatches.set(transactionId, match);
    }
    
    return finalMatches;
  }

  /**
   * Save matches to database
   */
  async saveMatches(matches, options = {}) {
    const savedMatches = [];
    
    for (const match of matches) {
      try {
        // Determine if auto-confirm based on confidence
        const autoConfirm = this.shouldAutoConfirm(match);
        
        const savedMatch = await this.prisma.expenseTransactionMatch.create({
          data: {
            expenseId: match.expense.id,
            bankTransactionId: match.transaction.id,
            tenantId: match.expense.tenantId,
            companyId: match.expense.companyId,
            matchScore: match.score.overall,
            confidence: match.confidence,
            status: autoConfirm ? 'CONFIRMED' : 'PENDING_REVIEW',
            matchingRule: match.confidence,
            amountDifference: Math.abs(match.expense.amount - Math.abs(match.transaction.amount)),
            currencyDifference: match.expense.currency?.code !== match.transaction.currency?.code,
            dateDifference: Math.abs(moment(match.expense.transactionDate).diff(moment(match.transaction.transactionDate), 'days')),
            warnings: match.warnings,
            createdBy: options.userId,
            metadata: {
              scoreBreakdown: match.score,
              processingTimestamp: new Date().toISOString(),
              autoConfirmed: autoConfirm
            }
          }
        });
        
        // Update expense and transaction status
        if (autoConfirm) {
          await this.prisma.expense.update({
            where: { id: match.expense.id },
            data: { 
              bankTransactionId: match.transaction.id,
              matchingStatus: 'MATCHED'
            }
          });
          
          await this.prisma.bankTransaction.update({
            where: { id: match.transaction.id },
            data: { 
              expenseId: match.expense.id,
              matchingStatus: 'MATCHED'
            }
          });
          
          this.processingStats.autoConfirmed++;
        } else {
          this.processingStats.requiresReview++;
        }
        
        savedMatches.push(savedMatch);
        this.processingStats.matchesFound++;
        
      } catch (error) {
        logger.error(`Failed to save match for expense ${match.expense.id}:`, error);
      }
    }
    
    return savedMatches;
  }

  /**
   * Determine if match should be auto-confirmed
   */
  shouldAutoConfirm(match) {
    const rule = this.matchingRules[match.confidence];
    if (!rule) return false;
    
    // Check if confidence level allows auto-confirm
    if (!rule.autoConfirm) return false;
    
    // Additional checks for auto-confirmation
    if (match.warnings && match.warnings.length > 0) return false;
    if (match.score.overall < 0.8) return false;
    
    return true;
  }

  /**
   * Generate reconciliation report
   */
  async generateReconciliationReport(matches, options = {}) {
    const report = {
      summary: {
        totalMatches: matches.length,
        autoConfirmed: this.processingStats.autoConfirmed,
        requiresReview: this.processingStats.requiresReview,
        unmatchedExpenses: this.processingStats.totalExpenses - this.processingStats.matchesFound,
        unmatchedTransactions: this.processingStats.totalTransactions - this.processingStats.matchesFound
      },
      confidenceBreakdown: {
        exact: matches.filter(m => m.confidence === 'exact').length,
        high: matches.filter(m => m.confidence === 'high').length,
        medium: matches.filter(m => m.confidence === 'medium').length,
        low: matches.filter(m => m.confidence === 'low').length
      },
      warnings: this.aggregateWarnings(matches),
      recommendations: this.generateRecommendations(matches),
      processingStats: this.processingStats
    };
    
    return report;
  }

  /**
   * Aggregate warnings from all matches
   */
  aggregateWarnings(matches) {
    const warningCounts = {};
    
    for (const match of matches) {
      if (match.warnings) {
        for (const warning of match.warnings) {
          warningCounts[warning] = (warningCounts[warning] || 0) + 1;
        }
      }
    }
    
    return warningCounts;
  }

  /**
   * Generate recommendations for improving matching
   */
  generateRecommendations(matches) {
    const recommendations = [];
    
    const lowScoreMatches = matches.filter(m => m.score.overall < 0.6).length;
    const highDateVariance = matches.filter(m => m.warnings?.includes('large_date_difference')).length;
    const currencyIssues = matches.filter(m => m.warnings?.includes('currency_conversion')).length;
    
    if (lowScoreMatches > matches.length * 0.3) {
      recommendations.push({
        type: 'data_quality',
        message: 'Consider improving merchant name consistency in expense entries',
        priority: 'medium'
      });
    }
    
    if (highDateVariance > matches.length * 0.2) {
      recommendations.push({
        type: 'timing',
        message: 'Large date differences detected. Consider entering expenses closer to transaction dates',
        priority: 'low'
      });
    }
    
    if (currencyIssues > 0) {
      recommendations.push({
        type: 'currency',
        message: 'Update exchange rates for better multi-currency matching',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Reset processing statistics
   */
  resetProcessingStats() {
    this.processingStats = {
      totalExpenses: 0,
      totalTransactions: 0,
      matchesFound: 0,
      autoConfirmed: 0,
      requiresReview: 0
    };
  }

  /**
   * Get reconciliation statistics for dashboard
   */
  async getReconciliationStats(tenantId, companyId = null, dateRange = null) {
    const where = {
      tenantId,
      ...(companyId && { companyId }),
      ...(dateRange && {
        createdAt: {
          gte: new Date(dateRange.from),
          lte: new Date(dateRange.to)
        }
      })
    };
    
    const stats = await this.prisma.expenseTransactionMatch.groupBy({
      by: ['status', 'confidence'],
      where,
      _count: true
    });
    
    const totalExpenses = await this.prisma.expense.count({
      where: {
        tenantId,
        ...(companyId && { companyId })
      }
    });
    
    const matchedExpenses = await this.prisma.expense.count({
      where: {
        tenantId,
        ...(companyId && { companyId }),
        matchingStatus: 'MATCHED'
      }
    });
    
    return {
      matchingRate: totalExpenses > 0 ? (matchedExpenses / totalExpenses) * 100 : 0,
      totalMatches: stats.reduce((sum, stat) => sum + stat._count, 0),
      statusBreakdown: stats,
      totalExpenses,
      matchedExpenses,
      unmatchedExpenses: totalExpenses - matchedExpenses
    };
  }
}

module.exports = SmartReconciliationEngine; 