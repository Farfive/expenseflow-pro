"/**
 * Matching Review Service
 * 
 * Handles manual review of transaction matches, user feedback,
 * corrections, and learning data collection for ML improvement.
 */

const { PrismaClient } = require('@prisma/client');
const _ = require('lodash');

const prisma = new PrismaClient();

class MatchingReviewService {
  constructor() {
    this.learningWeight = 0.1; // How much to weight new learning data
  }

  /**
   * Get pending matches requiring manual review
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Pending matches for review
   */
  async getPendingReviews(companyId, options = {}) {
    const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    return await prisma.transactionMatch.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'MANUAL_REVIEW'] }
      },
      include: {
        transaction: true,
        expense: true,
        document: true
      },
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset
    });
  }

  /**
   * Approve a transaction match
   * @param {string} matchId - Match ID
   * @param {string} userId - User ID performing the action
   * @param {Object} feedback - User feedback
   * @returns {Object} Updated match
   */
  async approveMatch(matchId, userId, feedback = {}) {
    const match = await prisma.transactionMatch.findUnique({
      where: { id: matchId },
      include: { transaction: true, expense: true }
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // Update match status
    const updatedMatch = await prisma.transactionMatch.update({
      where: { id: matchId },
      data: {
        status: 'APPROVED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        userFeedback: feedback
      }
    });

    // Update transaction status
    await prisma.bankTransaction.update({
      where: { id: match.transactionId },
      data: {
        matchStatus: 'MANUALLY_MATCHED'
      }
    });

    // Create audit log
    await this.createAuditLog(matchId, match.companyId, userId, 'APPROVED', match.status, 'APPROVED');

    // Store learning data
    await this.storeLearningData(match, true, userId, feedback);

    return updatedMatch;
  }

  /**
   * Reject a transaction match
   * @param {string} matchId - Match ID
   * @param {string} userId - User ID performing the action
   * @param {string} reason - Rejection reason
   * @param {Object} feedback - User feedback
   * @returns {Object} Updated match
   */
  async rejectMatch(matchId, userId, reason, feedback = {}) {
    const match = await prisma.transactionMatch.findUnique({
      where: { id: matchId },
      include: { transaction: true, expense: true }
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // Update match status
    const updatedMatch = await prisma.transactionMatch.update({
      where: { id: matchId },
      data: {
        status: 'REJECTED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        userFeedback: feedback
      }
    });

    // Reset transaction status
    await prisma.bankTransaction.update({
      where: { id: match.transactionId },
      data: {
        matchStatus: 'UNMATCHED',
        matchedExpenseId: null,
        matchConfidence: null
      }
    });

    // Create audit log
    await this.createAuditLog(matchId, match.companyId, userId, 'REJECTED', match.status, 'REJECTED');

    // Store learning data
    await this.storeLearningData(match, false, userId, { reason, ...feedback });

    return updatedMatch;
  }

  /**
   * Store learning data for ML improvement
   * @param {Object} match - Match object
   * @param {boolean} outcome - Whether the match was correct
   * @param {string} userId - User ID
   * @param {Object} feedback - User feedback
   */
  async storeLearningData(match, outcome, userId, feedback = {}) {
    try {
      // Extract features from the match
      const featureVector = match.featureVector || this.extractFeaturesFromMatch(match);
      
      await prisma.matchingLearningData.create({
        data: {
          companyId: match.companyId,
          transactionData: this.anonymizeTransactionData(match.transaction),
          expenseData: this.anonymizeExpenseData(match.expense),
          matchOutcome: outcome,
          userAction: outcome ? 'APPROVED' : 'REJECTED',
          featureVector,
          confidence: match.confidenceScore,
          userConfidence: feedback.userConfidence || null,
          matchStrategy: match.matchStrategy,
          ruleId: feedback.ruleId || null,
          isTrainingData: true,
          modelVersion: match.modelVersion
        }
      });

      console.log(`Stored learning data for match ${match.id}: ${outcome ? 'positive' : 'negative'}`);
    } catch (error) {
      console.error('Error storing learning data:', error);
    }
  }

  /**
   * Extract features from match for learning
   * @param {Object} match - Match object
   * @returns {Array} Feature vector
   */
  extractFeaturesFromMatch(match) {
    return [
      match.amountScore || 0,
      match.dateScore || 0,
      match.vendorScore || 0,
      match.confidenceScore || 0,
      match.aggregateScore || 0,
      match.isPartialMatch ? 1 : 0,
    ];
  }

  /**
   * Anonymize transaction data for learning
   * @param {Object} transaction - Transaction object
   * @returns {Object} Anonymized transaction data
   */
  anonymizeTransactionData(transaction) {
    if (!transaction) return {};

    return {
      amount: Math.abs(parseFloat(transaction.amount)),
      amountRange: this.categorizeAmount(Math.abs(parseFloat(transaction.amount))),
      type: transaction.type,
      currency: transaction.currency,
      descriptionLength: (transaction.description || '').length,
      hasLocation: !!transaction.location,
    };
  }

  /**
   * Anonymize expense data for learning
   * @param {Object} expense - Expense object
   * @returns {Object} Anonymized expense data
   */
  anonymizeExpenseData(expense) {
    if (!expense) return {};

    return {
      amount: Math.abs(parseFloat(expense.amount)),
      amountRange: this.categorizeAmount(Math.abs(parseFloat(expense.amount))),
      currency: expense.currency,
      hasVat: !!expense.vatAmount,
      descriptionLength: (expense.description || '').length,
      merchantLength: (expense.merchantName || '').length,
      categoryId: expense.categoryId,
    };
  }

  /**
   * Categorize amount into ranges for learning
   * @param {number} amount - Amount value
   * @returns {string} Amount category
   */
  categorizeAmount(amount) {
    if (amount < 10) return 'very-small';
    if (amount < 50) return 'small';
    if (amount < 200) return 'medium';
    if (amount < 1000) return 'large';
    return 'very-large';
  }

  /**
   * Create audit log entry
   * @param {string} matchId - Match ID
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {string} previousStatus - Previous status
   * @param {string} newStatus - New status
   * @param {Object} metadata - Additional metadata
   */
  async createAuditLog(matchId, companyId, userId, action, previousStatus, newStatus, metadata = {}) {
    await prisma.matchingAuditLog.create({
      data: {
        matchId,
        companyId,
        userId,
        action,
        previousStatus,
        newStatus,
        changes: metadata,
        reason: metadata.reason || null,
        confidence: metadata.confidence || null,
        userCorrection: metadata.corrections || null,
        feedback: metadata.feedback || null
      }
    });
  }
}

module.exports = MatchingReviewService;" 
