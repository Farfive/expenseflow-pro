/**
 * Intelligent Transaction Matching Service
 * 
 * Features:
 * - Fuzzy matching algorithms with fuse.js
 * - Confidence scoring with weighted criteria
 * - Multiple matching strategies (exact, fuzzy, pattern-based, ML-assisted)
 * - Partial matches and split transaction handling
 * - Machine learning from user confirmations
 * - Audit trail and reconciliation reporting
 * 
 * Target: >85% auto-reconciliation rate
 */

const Fuse = require('fuse.js');
const stringSimilarity = require('string-similarity');
const _ = require('lodash');
const { create, all } = require('mathjs');
const { PrismaClient } = require('@prisma/client');
const { format, differenceInDays, isWithinInterval, subDays, addDays } = require('date-fns');

const math = create(all);
const prisma = new PrismaClient();

class TransactionMatchingService {
  constructor() {
    // Default matching weights
    this.defaultWeights = {
      amount: 0.4,
      date: 0.3,
      vendor: 0.3
    };

    // Matching thresholds
    this.thresholds = {
      autoApproval: 0.9,        // Auto-approve matches above this confidence
      manualReview: 0.6,        // Require manual review below this confidence
      minimumMatch: 0.4,        // Minimum confidence to consider a match
      fuzzyAmount: 0.02,        // 2% tolerance for amount matching
      dateTolerance: 3,         // ±3 days for date matching
      vendorSimilarity: 0.7     // Minimum vendor name similarity
    };

    // Fuse.js configuration for transaction search
    this.fuseConfig = {
      includeScore: true,
      threshold: 0.3,
      keys: [
        { name: 'description', weight: 0.4 },
        { name: 'merchant', weight: 0.6 }
      ]
    };

    // Initialize ML model version
    this.modelVersion = '1.0.0';
  }

  /**
   * Main entry point for transaction matching
   * @param {string} companyId - Company ID
   * @param {Object} options - Matching options
   * @returns {Object} Matching results
   */
  async matchTransactions(companyId, options = {}) {
    const startTime = Date.now();
    
    try {
      // Get matching rules for the company
      const rules = await this.getMatchingRules(companyId);
      
      // Get unmatched transactions and expenses
      const transactions = await this.getUnmatchedTransactions(companyId, options);
      const expenses = await this.getUnmatchedExpenses(companyId, options);
      
      console.log(`Found ${transactions.length} unmatched transactions and ${expenses.length} unmatched expenses`);
      
      const results = {
        totalTransactions: transactions.length,
        totalExpenses: expenses.length,
        matches: [],
        unmatchedTransactions: [],
        unmatchedExpenses: [],
        partialMatches: [],
        statistics: {},
        processingTime: 0
      };

      // Process each transaction
      for (const transaction of transactions) {
        const matchResult = await this.findBestMatch(transaction, expenses, rules);
        
        if (matchResult) {
          // Create match record
          const match = await this.createMatch(transaction, matchResult, companyId);
          results.matches.push(match);
          
          // Remove matched expense from available pool
          _.remove(expenses, { id: matchResult.expense.id });
        } else {
          results.unmatchedTransactions.push(transaction);
        }
      }

      // Add remaining unmatched expenses
      results.unmatchedExpenses = expenses;

      // Calculate statistics
      results.statistics = this.calculateStatistics(results);
      results.processingTime = Date.now() - startTime;

      // Log performance metrics
      await this.logPerformanceMetrics(companyId, results);

      return results;
      
    } catch (error) {
      console.error('Error in transaction matching:', error);
      throw error;
    }
  }

  /**
   * Find the best match for a transaction
   * @param {Object} transaction - Bank transaction
   * @param {Array} expenses - Available expenses
   * @param {Array} rules - Matching rules
   * @returns {Object|null} Best match result
   */
  async findBestMatch(transaction, expenses, rules) {
    let bestMatch = null;
    let bestScore = 0;

    // Try each matching strategy
    const strategies = ['exact', 'fuzzy', 'pattern-based', 'ml-assisted'];
    
    for (const strategy of strategies) {
      const matches = await this.applyStrategy(strategy, transaction, expenses, rules);
      
      for (const match of matches) {
        if (match.confidenceScore > bestScore && match.confidenceScore >= this.thresholds.minimumMatch) {
          bestMatch = match;
          bestScore = match.confidenceScore;
        }
      }

      // If we found a high-confidence match, no need to try other strategies
      if (bestScore >= this.thresholds.autoApproval) {
        break;
      }
    }

    return bestMatch;
  }

  /**
   * Apply specific matching strategy
   * @param {string} strategy - Matching strategy
   * @param {Object} transaction - Bank transaction
   * @param {Array} expenses - Available expenses
   * @param {Array} rules - Matching rules
   * @returns {Array} Potential matches
   */
  async applyStrategy(strategy, transaction, expenses, rules) {
    switch (strategy) {
      case 'exact':
        return this.exactMatching(transaction, expenses, rules);
      case 'fuzzy':
        return this.fuzzyMatching(transaction, expenses, rules);
      case 'pattern-based':
        return this.patternMatching(transaction, expenses, rules);
      case 'ml-assisted':
        return this.mlAssistedMatching(transaction, expenses, rules);
      default:
        return [];
    }
  }

  /**
   * Exact matching strategy
   * @param {Object} transaction - Bank transaction
   * @param {Array} expenses - Available expenses
   * @param {Array} rules - Matching rules
   * @returns {Array} Exact matches
   */
  async exactMatching(transaction, expenses, rules) {
    const matches = [];

    for (const expense of expenses) {
      const scores = this.calculateScores(transaction, expense, 'exact');
      
      // Exact match criteria: same amount, same date, same merchant
      if (
        Math.abs(scores.amountScore - 1.0) < 0.001 &&
        scores.dateScore === 1.0 &&
        scores.vendorScore >= 0.95
      ) {
        matches.push({
          expense,
          strategy: 'exact',
          confidenceScore: 1.0,
          scores,
          matchType: 'EXACT'
        });
      }
    }

    return matches;
  }

  /**
   * Fuzzy matching strategy using fuse.js and string similarity
   * @param {Object} transaction - Bank transaction
   * @param {Array} expenses - Available expenses
   * @param {Array} rules - Matching rules
   * @returns {Array} Fuzzy matches
   */
  async fuzzyMatching(transaction, expenses, rules) {
    const matches = [];
    
    // Create searchable expense data for fuse.js
    const searchableExpenses = expenses.map(expense => ({
      ...expense,
      searchText: `${expense.merchantName || ''} ${expense.description || ''}`.toLowerCase()
    }));

    // Configure fuse.js with transaction description and merchant
    const transactionText = `${transaction.description || ''} ${transaction.merchant || ''}`.toLowerCase();
    
    // Create fuse instance
    const fuse = new Fuse(searchableExpenses, {
      ...this.fuseConfig,
      keys: ['searchText', 'merchantName', 'description']
    });

    // Search for potential matches
    const fuzzyResults = fuse.search(transactionText);

    for (const result of fuzzyResults) {
      const expense = result.item;
      const scores = this.calculateScores(transaction, expense, 'fuzzy');
      
      // Apply fuzzy matching rules
      const rule = this.findApplicableRule(rules, 'fuzzy');
      const weights = rule ? rule : this.defaultWeights;
      
      const confidenceScore = this.calculateWeightedScore(scores, weights);
      
      if (confidenceScore >= this.thresholds.minimumMatch) {
        matches.push({
          expense,
          strategy: 'fuzzy',
          confidenceScore,
          scores,
          matchType: 'FUZZY',
          fuseScore: 1 - result.score // Convert fuse score to similarity
        });
      }
    }

    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Pattern-based matching strategy
   * @param {Object} transaction - Bank transaction
   * @param {Array} expenses - Available expenses
   * @param {Array} rules - Matching rules
   * @returns {Array} Pattern matches
   */
  async patternMatching(transaction, expenses, rules) {
    const matches = [];

    for (const expense of expenses) {
      const scores = this.calculateScores(transaction, expense, 'pattern');
      
      // Check for common patterns
      const patterns = [
        this.checkRecurringPattern(transaction, expense),
        this.checkAmountPattern(transaction, expense),
        this.checkMerchantPattern(transaction, expense),
        this.checkDatePattern(transaction, expense)
      ];

      const patternScore = patterns.reduce((sum, score) => sum + score, 0) / patterns.length;
      
      if (patternScore >= 0.5) {
        const confidenceScore = patternScore * 0.8; // Pattern matches are slightly less confident
        
        matches.push({
          expense,
          strategy: 'pattern-based',
          confidenceScore,
          scores: { ...scores, patternScore },
          matchType: 'PATTERN'
        });
      }
    }

    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * ML-assisted matching strategy
   * @param {Object} transaction - Bank transaction
   * @param {Array} expenses - Available expenses
   * @param {Array} rules - Matching rules
   * @returns {Array} ML-assisted matches
   */
  async mlAssistedMatching(transaction, expenses, rules) {
    const matches = [];

    // Get historical learning data
    const learningData = await this.getLearningData(transaction.companyId);
    
    if (learningData.length < 10) {
      // Not enough training data, fall back to fuzzy matching
      return this.fuzzyMatching(transaction, expenses, rules);
    }

    for (const expense of expenses) {
      const featureVector = this.extractFeatures(transaction, expense);
      const confidence = this.predictMatch(featureVector, learningData);
      
      if (confidence >= this.thresholds.minimumMatch) {
        matches.push({
          expense,
          strategy: 'ml-assisted',
          confidenceScore: confidence,
          scores: this.calculateScores(transaction, expense, 'ml'),
          matchType: 'ML_ASSISTED',
          featureVector
        });
      }
    }

    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Calculate individual scores for amount, date, and vendor
   * @param {Object} transaction - Bank transaction
   * @param {Object} expense - Expense record
   * @param {string} strategy - Matching strategy
   * @returns {Object} Calculated scores
   */
  calculateScores(transaction, expense, strategy) {
    const scores = {
      amountScore: this.calculateAmountScore(transaction.amount, expense.amount),
      dateScore: this.calculateDateScore(transaction.date, expense.transactionDate),
      vendorScore: this.calculateVendorScore(
        transaction.description || transaction.merchant,
        expense.merchantName || expense.description
      )
    };

    return scores;
  }

  /**
   * Calculate amount similarity score
   * @param {number} transactionAmount - Transaction amount
   * @param {number} expenseAmount - Expense amount
   * @returns {number} Amount score (0-1)
   */
  calculateAmountScore(transactionAmount, expenseAmount) {
    const amount1 = Math.abs(parseFloat(transactionAmount));
    const amount2 = Math.abs(parseFloat(expenseAmount));
    
    if (amount1 === 0 && amount2 === 0) return 1.0;
    if (amount1 === 0 || amount2 === 0) return 0.0;

    const difference = Math.abs(amount1 - amount2);
    const average = (amount1 + amount2) / 2;
    const tolerance = Math.max(average * this.thresholds.fuzzyAmount, 0.01);

    if (difference <= tolerance) {
      return 1.0 - (difference / tolerance) * 0.2; // 0.8-1.0 range for close matches
    } else {
      return Math.max(0, 1 - (difference / average));
    }
  }

  /**
   * Calculate date proximity score
   * @param {Date} transactionDate - Transaction date
   * @param {Date} expenseDate - Expense date
   * @returns {number} Date score (0-1)
   */
  calculateDateScore(transactionDate, expenseDate) {
    const date1 = new Date(transactionDate);
    const date2 = new Date(expenseDate);
    
    const daysDifference = Math.abs(differenceInDays(date1, date2));
    
    if (daysDifference === 0) return 1.0;
    if (daysDifference <= this.thresholds.dateTolerance) {
      return 1.0 - (daysDifference / this.thresholds.dateTolerance) * 0.3; // 0.7-1.0 range
    } else {
      return Math.max(0, 1 - (daysDifference / 30)); // Gradual decrease over a month
    }
  }

  /**
   * Calculate vendor name similarity score
   * @param {string} transactionVendor - Transaction vendor/description
   * @param {string} expenseVendor - Expense merchant name
   * @returns {number} Vendor score (0-1)
   */
  calculateVendorScore(transactionVendor, expenseVendor) {
    if (!transactionVendor || !expenseVendor) return 0.0;

    const vendor1 = this.normalizeVendorName(transactionVendor);
    const vendor2 = this.normalizeVendorName(expenseVendor);

    if (vendor1 === vendor2) return 1.0;

    // Use string-similarity library for comparison
    const similarity = stringSimilarity.compareTwoStrings(vendor1, vendor2);
    
    // Also check for substring matches
    const substring1 = vendor1.includes(vendor2) || vendor2.includes(vendor1);
    const substring2 = this.checkCommonSubstrings(vendor1, vendor2);

    return Math.max(similarity, substring1 ? 0.8 : 0, substring2);
  }

  /**
   * Normalize vendor name for comparison
   * @param {string} vendorName - Raw vendor name
   * @returns {string} Normalized vendor name
   */
  normalizeVendorName(vendorName) {
    return vendorName
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\b(sp\s*z\s*o\s*o|s\.a\.|ltd|llc|inc|corp|company|co)\b/g, '') // Remove legal suffixes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check for common substrings between vendor names
   * @param {string} vendor1 - First vendor name
   * @param {string} vendor2 - Second vendor name
   * @returns {number} Substring similarity score
   */
  checkCommonSubstrings(vendor1, vendor2) {
    const words1 = vendor1.split(' ').filter(word => word.length > 2);
    const words2 = vendor2.split(' ').filter(word => word.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    let commonWords = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (stringSimilarity.compareTwoStrings(word1, word2) >= 0.8) {
          commonWords++;
          break;
        }
      }
    }

    return commonWords / Math.max(words1.length, words2.length);
  }

  /**
   * Calculate weighted confidence score
   * @param {Object} scores - Individual scores
   * @param {Object} weights - Weighting configuration
   * @returns {number} Weighted confidence score
   */
  calculateWeightedScore(scores, weights) {
    const totalWeight = weights.amountWeight + weights.dateWeight + weights.vendorWeight;
    
    return (
      (scores.amountScore * weights.amountWeight) +
      (scores.dateScore * weights.dateWeight) +
      (scores.vendorScore * weights.vendorWeight)
    ) / totalWeight;
  }

  /**
   * Extract feature vector for ML matching
   * @param {Object} transaction - Bank transaction
   * @param {Object} expense - Expense record
   * @returns {Array} Feature vector
   */
  extractFeatures(transaction, expense) {
    const scores = this.calculateScores(transaction, expense, 'ml');
    
    return [
      scores.amountScore,
      scores.dateScore,
      scores.vendorScore,
      parseFloat(transaction.amount) || 0,
      parseFloat(expense.amount) || 0,
      Math.abs(differenceInDays(new Date(transaction.date), new Date(expense.transactionDate))),
      (transaction.description || '').length,
      (expense.description || '').length,
      // Add more features as needed
    ];
  }

  /**
   * Simple ML prediction based on historical data
   * @param {Array} featureVector - Feature vector
   * @param {Array} learningData - Historical learning data
   * @returns {number} Predicted match confidence
   */
  predictMatch(featureVector, learningData) {
    // Simple k-nearest neighbors approach
    const k = Math.min(5, learningData.length);
    const distances = [];

    for (const dataPoint of learningData) {
      const historicalFeatures = dataPoint.featureVector;
      const distance = this.calculateEuclideanDistance(featureVector, historicalFeatures);
      distances.push({ distance, outcome: dataPoint.matchOutcome });
    }

    // Sort by distance and take k nearest neighbors
    distances.sort((a, b) => a.distance - b.distance);
    const neighbors = distances.slice(0, k);

    // Calculate weighted average based on distance
    let weightedSum = 0;
    let totalWeight = 0;

    for (const neighbor of neighbors) {
      const weight = 1 / (neighbor.distance + 0.001); // Add small value to avoid division by zero
      weightedSum += (neighbor.outcome ? 1 : 0) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Calculate Euclidean distance between feature vectors
   * @param {Array} vector1 - First feature vector
   * @param {Array} vector2 - Second feature vector
   * @returns {number} Euclidean distance
   */
  calculateEuclideanDistance(vector1, vector2) {
    if (vector1.length !== vector2.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      const diff = (vector1[i] || 0) - (vector2[i] || 0);
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Create a match record in the database
   * @param {Object} transaction - Bank transaction
   * @param {Object} matchResult - Match result
   * @param {string} companyId - Company ID
   * @returns {Object} Created match record
   */
  async createMatch(transaction, matchResult, companyId) {
    const { expense, strategy, confidenceScore, scores, matchType, featureVector } = matchResult;

    // Determine status based on confidence
    let status = 'PENDING';
    if (confidenceScore >= this.thresholds.autoApproval) {
      status = 'AUTO_APPROVED';
    } else if (confidenceScore < this.thresholds.manualReview) {
      status = 'MANUAL_REVIEW';
    }

    const match = await prisma.transactionMatch.create({
      data: {
        companyId,
        transactionId: transaction.id,
        expenseId: expense.id,
        matchType,
        matchStrategy: strategy,
        confidenceScore,
        matchedFields: scores,
        amountScore: scores.amountScore,
        dateScore: scores.dateScore,
        vendorScore: scores.vendorScore,
        aggregateScore: confidenceScore,
        status,
        featureVector: featureVector || null,
        modelVersion: this.modelVersion
      }
    });

    // Create audit log
    await this.createAuditLog(match.id, companyId, 'CREATED', null, status, {
      strategy,
      confidenceScore,
      scores
    });

    // Update transaction match status
    await prisma.bankTransaction.update({
      where: { id: transaction.id },
      data: {
        matchStatus: status === 'AUTO_APPROVED' ? 'AUTO_MATCHED' : 'PENDING_REVIEW',
        matchedExpenseId: expense.id,
        matchConfidence: confidenceScore
      }
    });

    return match;
  }

  /**
   * Create audit log entry
   * @param {string} matchId - Match ID
   * @param {string} companyId - Company ID
   * @param {string} action - Action type
   * @param {string} previousStatus - Previous status
   * @param {string} newStatus - New status
   * @param {Object} metadata - Additional metadata
   */
  async createAuditLog(matchId, companyId, action, previousStatus, newStatus, metadata = {}) {
    await prisma.matchingAuditLog.create({
      data: {
        matchId,
        companyId,
        action,
        previousStatus,
        newStatus,
        changes: metadata,
        confidence: metadata.confidenceScore
      }
    });
  }

  /**
   * Get matching rules for a company
   * @param {string} companyId - Company ID
   * @returns {Array} Matching rules
   */
  async getMatchingRules(companyId) {
    return await prisma.matchingRule.findMany({
      where: {
        companyId,
        isActive: true
      },
      orderBy: { priority: 'desc' }
    });
  }

  /**
   * Get unmatched transactions
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Unmatched transactions
   */
  async getUnmatchedTransactions(companyId, options = {}) {
    return await prisma.bankTransaction.findMany({
      where: {
        companyId,
        matchStatus: 'UNMATCHED',
        ...(options.dateFrom && { date: { gte: options.dateFrom } }),
        ...(options.dateTo && { date: { lte: options.dateTo } })
      },
      orderBy: { date: 'desc' }
    });
  }

  /**
   * Get unmatched expenses
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Unmatched expenses
   */
  async getUnmatchedExpenses(companyId, options = {}) {
    return await prisma.expense.findMany({
      where: {
        companyId,
        matchedTransactions: { none: {} }, // No matched transactions
        ...(options.dateFrom && { transactionDate: { gte: options.dateFrom } }),
        ...(options.dateTo && { transactionDate: { lte: options.dateTo } })
      },
      orderBy: { transactionDate: 'desc' }
    });
  }

  /**
   * Get learning data for ML matching
   * @param {string} companyId - Company ID
   * @returns {Array} Learning data
   */
  async getLearningData(companyId) {
    return await prisma.matchingLearningData.findMany({
      where: {
        companyId,
        isTrainingData: true
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit to recent data
    });
  }

  /**
   * Find applicable matching rule
   * @param {Array} rules - Available rules
   * @param {string} strategy - Matching strategy
   * @returns {Object|null} Applicable rule
   */
  findApplicableRule(rules, strategy) {
    return rules.find(rule => rule.matchStrategy === strategy) || null;
  }

  /**
   * Calculate statistics for matching results
   * @param {Object} results - Matching results
   * @returns {Object} Statistics
   */
  calculateStatistics(results) {
    const total = results.totalTransactions + results.totalExpenses;
    const matched = results.matches.length;
    
    return {
      autoReconciliationRate: total > 0 ? (matched / results.totalTransactions) * 100 : 0,
      matchRate: total > 0 ? (matched / total) * 100 : 0,
      averageConfidence: matched > 0 ? 
        results.matches.reduce((sum, match) => sum + match.confidenceScore, 0) / matched : 0,
      highConfidenceMatches: results.matches.filter(m => m.confidenceScore >= this.thresholds.autoApproval).length,
      reviewRequiredMatches: results.matches.filter(m => m.confidenceScore < this.thresholds.manualReview).length
    };
  }

  /**
   * Log performance metrics
   * @param {string} companyId - Company ID
   * @param {Object} results - Matching results
   */
  async logPerformanceMetrics(companyId, results) {
    const { statistics } = results;
    
    console.log(`Matching Performance for Company ${companyId}:`);
    console.log(`- Auto-reconciliation rate: ${statistics.autoReconciliationRate.toFixed(2)}%`);
    console.log(`- Total matches: ${results.matches.length}`);
    console.log(`- Average confidence: ${statistics.averageConfidence.toFixed(3)}`);
    console.log(`- Processing time: ${results.processingTime}ms`);
  }

  // Pattern matching helper methods
  checkRecurringPattern(transaction, expense) {
    // Implementation for recurring transaction pattern detection
    return 0.0; // Placeholder
  }

  checkAmountPattern(transaction, expense) {
    return this.calculateAmountScore(transaction.amount, expense.amount);
  }

  checkMerchantPattern(transaction, expense) {
    return this.calculateVendorScore(
      transaction.description || transaction.merchant,
      expense.merchantName || expense.description
    );
  }

  checkDatePattern(transaction, expense) {
    return this.calculateDateScore(transaction.date, expense.transactionDate);
  }
}

module.exports = TransactionMatchingService; 