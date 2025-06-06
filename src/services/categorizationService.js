const fs = require('fs-extra');
const path = require('path');
const natural = require('natural');
const compromise = require('compromise');
const stopword = require('stopword');
const stemmer = require('stemmer');
const keywordExtractor = require('keyword-extractor');
const Fuse = require('fuse.js');
const _ = require('lodash');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class CategorizationService {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.isInitialized = false;
    this.vendorDatabase = new Map();
    this.categoryKeywords = new Map();
    this.trainingData = [];
    this.confidence = {};
    
    // Default categories with keywords and patterns
    this.defaultCategories = {
      'travel': {
        keywords: ['flight', 'hotel', 'taxi', 'uber', 'lyft', 'rental', 'mileage', 'parking', 'toll', 'airport', 'airline', 'train', 'bus', 'accommodation', 'lodging'],
        vendors: ['united airlines', 'delta', 'american airlines', 'hilton', 'marriott', 'booking.com', 'expedia', 'uber', 'lyft', 'hertz', 'avis', 'enterprise'],
        patterns: [/\b(flight|hotel|taxi|rental)\b/gi, /\b(airline|airport)\b/gi],
        taxCategory: 'travel_expense',
        accountingCode: '6200'
      },
      'meals': {
        keywords: ['restaurant', 'food', 'lunch', 'dinner', 'breakfast', 'coffee', 'meal', 'catering', 'delivery', 'takeout', 'dining', 'cafe', 'bistro'],
        vendors: ['starbucks', 'mcdonalds', 'subway', 'dominos', 'pizza hut', 'grubhub', 'doordash', 'uber eats'],
        patterns: [/\b(restaurant|food|meal|lunch|dinner)\b/gi, /\b(cafe|coffee|dining)\b/gi],
        taxCategory: 'meals_entertainment',
        accountingCode: '6300'
      },
      'office_supplies': {
        keywords: ['office', 'supplies', 'paper', 'pen', 'pencil', 'stapler', 'folder', 'notebook', 'printer', 'ink', 'toner', 'desk', 'chair', 'computer'],
        vendors: ['staples', 'office depot', 'amazon', 'best buy', 'costco', 'walmart'],
        patterns: [/\b(office|supplies|paper|printer)\b/gi, /\b(stationery|equipment)\b/gi],
        taxCategory: 'office_expense',
        accountingCode: '6400'
      },
      'technology': {
        keywords: ['computer', 'laptop', 'software', 'hardware', 'phone', 'tablet', 'monitor', 'keyboard', 'mouse', 'headset', 'camera', 'subscription', 'license'],
        vendors: ['apple', 'microsoft', 'google', 'adobe', 'amazon web services', 'dropbox', 'zoom', 'slack'],
        patterns: [/\b(software|hardware|computer|laptop)\b/gi, /\b(tech|digital|online)\b/gi],
        taxCategory: 'equipment_expense',
        accountingCode: '6500'
      },
      'utilities': {
        keywords: ['electricity', 'gas', 'water', 'internet', 'phone', 'mobile', 'utility', 'bill', 'service', 'maintenance'],
        vendors: ['comcast', 'verizon', 'at&t', 'sprint', 't-mobile'],
        patterns: [/\b(utility|electricity|gas|water)\b/gi, /\b(internet|phone|mobile)\b/gi],
        taxCategory: 'utility_expense',
        accountingCode: '6600'
      },
      'marketing': {
        keywords: ['advertising', 'marketing', 'promotion', 'branding', 'website', 'social media', 'campaign', 'design', 'printing'],
        vendors: ['google ads', 'facebook', 'instagram', 'linkedin', 'mailchimp', 'canva'],
        patterns: [/\b(advertising|marketing|promotion)\b/gi, /\b(website|social|campaign)\b/gi],
        taxCategory: 'marketing_expense',
        accountingCode: '6700'
      },
      'professional_services': {
        keywords: ['legal', 'accounting', 'consulting', 'professional', 'service', 'attorney', 'lawyer', 'accountant', 'consultant'],
        vendors: ['quickbooks', 'turbotax', 'legalzoom'],
        patterns: [/\b(legal|accounting|consulting)\b/gi, /\b(professional|attorney|lawyer)\b/gi],
        taxCategory: 'professional_expense',
        accountingCode: '6800'
      },
      'other': {
        keywords: ['miscellaneous', 'other', 'general', 'expense'],
        vendors: [],
        patterns: [],
        taxCategory: 'other_expense',
        accountingCode: '6900'
      }
    };

    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };

    this.dataPath = path.join(process.cwd(), 'data', 'categorization');
    this.ensureDataDirectory();
  }

  /**
   * Initialize the categorization service
   */
  async initialize() {
    try {
      await this.ensureDataDirectory();
      await this.loadVendorDatabase();
      await this.loadTrainingData();
      await this.trainClassifier();
      this.isInitialized = true;
      logger.info('Categorization service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize categorization service:', error);
      throw error;
    }
  }

  /**
   * Ensure data directory exists
   */
  async ensureDataDirectory() {
    await fs.ensureDir(this.dataPath);
    await fs.ensureDir(path.join(this.dataPath, 'vendors'));
    await fs.ensureDir(path.join(this.dataPath, 'training'));
    await fs.ensureDir(path.join(this.dataPath, 'models'));
  }

  /**
   * Load vendor database from file and database
   */
  async loadVendorDatabase() {
    try {
      // Load from file
      const vendorFilePath = path.join(this.dataPath, 'vendors.json');
      if (await fs.pathExists(vendorFilePath)) {
        const vendorData = await fs.readJson(vendorFilePath);
        Object.entries(vendorData).forEach(([vendor, category]) => {
          this.vendorDatabase.set(vendor.toLowerCase(), category);
        });
      }

      // Load from database
      const categories = await prisma.expenseCategory.findMany({
        include: {
          _count: {
            select: {
              expenses: true
            }
          }
        }
      });

      // Build category keywords map
      categories.forEach(category => {
        if (!this.categoryKeywords.has(category.name)) {
          this.categoryKeywords.set(category.name, {
            keywords: [],
            count: category._count.expenses
          });
        }
      });

      // Initialize with default categories
      Object.entries(this.defaultCategories).forEach(([categoryName, categoryData]) => {
        categoryData.vendors.forEach(vendor => {
          this.vendorDatabase.set(vendor.toLowerCase(), categoryName);
        });
      });

      logger.info(`Loaded ${this.vendorDatabase.size} vendor mappings`);
    } catch (error) {
      logger.error('Failed to load vendor database:', error);
    }
  }

  /**
   * Load training data from database
   */
  async loadTrainingData() {
    try {
      // Load existing expenses with categories for training
      const expenses = await prisma.expense.findMany({
        where: {
          categoryId: { not: null },
          vendor: { not: null }
        },
        include: {
          category: true,
          document: true
        },
        take: 1000 // Limit for performance
      });

      this.trainingData = expenses.map(expense => ({
        text: this.extractFeatures({
          vendor: expense.vendor,
          description: expense.description,
          extractedText: expense.document?.extractedText || ''
        }),
        category: expense.category.name
      }));

      logger.info(`Loaded ${this.trainingData.length} training samples`);
    } catch (error) {
      logger.error('Failed to load training data:', error);
    }
  }

  /**
   * Train the classifier with available data
   */
  async trainClassifier() {
    try {
      // Add default training data
      Object.entries(this.defaultCategories).forEach(([categoryName, categoryData]) => {
        categoryData.keywords.forEach(keyword => {
          this.classifier.addDocument(keyword, categoryName);
        });
        
        categoryData.vendors.forEach(vendor => {
          this.classifier.addDocument(vendor, categoryName);
        });
      });

      // Add real training data
      this.trainingData.forEach(sample => {
        this.classifier.addDocument(sample.text, sample.category);
      });

      // Train the classifier
      this.classifier.train();
      
      // Save the trained model
      const modelPath = path.join(this.dataPath, 'models', 'classifier.json');
      await fs.writeJson(modelPath, this.classifier);

      logger.info('Classifier trained successfully');
    } catch (error) {
      logger.error('Failed to train classifier:', error);
    }
  }

  /**
   * Categorize a document/expense
   */
  async categorizeDocument(data) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const features = this.extractFeatures(data);
      const predictions = this.getPredictions(features, data);
      
      // Calculate confidence scores
      const confidenceScores = this.calculateConfidenceScores(predictions, data);
      
      // Select best category
      const bestCategory = this.selectBestCategory(predictions, confidenceScores);
      
      return {
        category: bestCategory.name,
        confidence: bestCategory.confidence,
        confidenceLevel: this.getConfidenceLevel(bestCategory.confidence),
        predictions: predictions.slice(0, 3), // Top 3 predictions
        reasoning: bestCategory.reasoning,
        suggested: bestCategory.confidence < this.confidenceThresholds.high
      };
    } catch (error) {
      logger.error('Failed to categorize document:', error);
      return {
        category: 'other',
        confidence: 0.1,
        confidenceLevel: 'low',
        predictions: [],
        reasoning: 'Categorization failed',
        suggested: true
      };
    }
  }

  /**
   * Extract features from document data
   */
  extractFeatures(data) {
    const { vendor, description, extractedText = '', amount } = data;
    
    let features = [];
    
    // Add vendor name
    if (vendor) {
      features.push(vendor.toLowerCase());
      // Add vendor keywords
      const vendorWords = vendor.toLowerCase().split(/\s+/);
      features.push(...vendorWords);
    }
    
    // Add description
    if (description) {
      const descWords = this.preprocessText(description);
      features.push(...descWords);
    }
    
    // Add extracted text keywords
    if (extractedText) {
      const keywords = keywordExtractor.extract(extractedText, {
        language: 'english',
        remove_digits: false,
        return_changed_case: true,
        remove_duplicates: true
      });
      features.push(...keywords.slice(0, 10)); // Top 10 keywords
    }
    
    // Add amount-based features
    if (amount) {
      if (amount < 25) features.push('small_amount');
      else if (amount < 100) features.push('medium_amount');
      else features.push('large_amount');
    }
    
    return features.join(' ');
  }

  /**
   * Preprocess text for better classification
   */
  preprocessText(text) {
    if (!text) return [];
    
    // Convert to lowercase and tokenize
    const tokens = natural.WordTokenizer().tokenize(text.toLowerCase());
    
    // Remove stop words
    const withoutStopWords = stopword.removeStopwords(tokens);
    
    // Stem words
    const stemmed = withoutStopWords.map(word => stemmer(word));
    
    // Remove short words
    return stemmed.filter(word => word.length > 2);
  }

  /**
   * Get predictions from multiple sources
   */
  getPredictions(features, data) {
    const predictions = [];
    
    // 1. Naive Bayes classifier prediction
    if (this.classifier) {
      const classifierResults = this.classifier.getClassifications(features);
      classifierResults.forEach(result => {
        predictions.push({
          category: result.label,
          confidence: result.value,
          source: 'classifier'
        });
      });
    }
    
    // 2. Vendor-based prediction
    if (data.vendor) {
      const vendorCategory = this.getVendorCategory(data.vendor);
      if (vendorCategory) {
        predictions.push({
          category: vendorCategory.category,
          confidence: vendorCategory.confidence,
          source: 'vendor_db'
        });
      }
    }
    
    // 3. Keyword-based prediction
    const keywordPredictions = this.getKeywordPredictions(features);
    predictions.push(...keywordPredictions);
    
    // 4. Pattern-based prediction
    const patternPredictions = this.getPatternPredictions(data);
    predictions.push(...patternPredictions);
    
    // Aggregate and sort predictions
    const aggregated = this.aggregatePredictions(predictions);
    return aggregated.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get vendor category from database
   */
  getVendorCategory(vendor) {
    const normalizedVendor = vendor.toLowerCase();
    
    // Exact match
    if (this.vendorDatabase.has(normalizedVendor)) {
      return {
        category: this.vendorDatabase.get(normalizedVendor),
        confidence: 0.9
      };
    }
    
    // Fuzzy match
    const vendorOptions = Array.from(this.vendorDatabase.keys());
    const fuse = new Fuse(vendorOptions, {
      threshold: 0.3,
      includeScore: true
    });
    
    const results = fuse.search(normalizedVendor);
    if (results.length > 0 && results[0].score < 0.3) {
      return {
        category: this.vendorDatabase.get(results[0].item),
        confidence: 1 - results[0].score
      };
    }
    
    return null;
  }

  /**
   * Get keyword-based predictions
   */
  getKeywordPredictions(features) {
    const predictions = [];
    const words = features.toLowerCase().split(/\s+/);
    
    Object.entries(this.defaultCategories).forEach(([categoryName, categoryData]) => {
      let matches = 0;
      let totalKeywords = categoryData.keywords.length;
      
      categoryData.keywords.forEach(keyword => {
        if (words.some(word => word.includes(keyword) || keyword.includes(word))) {
          matches++;
        }
      });
      
      if (matches > 0) {
        const confidence = (matches / totalKeywords) * 0.7; // Max 0.7 for keyword matching
        predictions.push({
          category: categoryName,
          confidence,
          source: 'keywords'
        });
      }
    });
    
    return predictions;
  }

  /**
   * Get pattern-based predictions
   */
  getPatternPredictions(data) {
    const predictions = [];
    const text = `${data.vendor || ''} ${data.description || ''} ${data.extractedText || ''}`.toLowerCase();
    
    Object.entries(this.defaultCategories).forEach(([categoryName, categoryData]) => {
      let matches = 0;
      
      categoryData.patterns.forEach(pattern => {
        const match = text.match(pattern);
        if (match) {
          matches += match.length;
        }
      });
      
      if (matches > 0) {
        const confidence = Math.min(matches * 0.2, 0.8); // Max 0.8 for pattern matching
        predictions.push({
          category: categoryName,
          confidence,
          source: 'patterns'
        });
      }
    });
    
    return predictions;
  }

  /**
   * Aggregate predictions from multiple sources
   */
  aggregatePredictions(predictions) {
    const grouped = _.groupBy(predictions, 'category');
    
    return Object.entries(grouped).map(([category, preds]) => {
      // Weighted average of confidences
      const weights = {
        classifier: 0.4,
        vendor_db: 0.3,
        keywords: 0.2,
        patterns: 0.1
      };
      
      let totalConfidence = 0;
      let totalWeight = 0;
      
      preds.forEach(pred => {
        const weight = weights[pred.source] || 0.1;
        totalConfidence += pred.confidence * weight;
        totalWeight += weight;
      });
      
      return {
        category,
        confidence: totalWeight > 0 ? totalConfidence / totalWeight : 0,
        sources: preds.map(p => p.source)
      };
    });
  }

  /**
   * Calculate confidence scores for predictions
   */
  calculateConfidenceScores(predictions, data) {
    const scores = {};
    
    predictions.forEach(pred => {
      let adjustedConfidence = pred.confidence;
      
      // Boost confidence if multiple sources agree
      if (pred.sources && pred.sources.length > 1) {
        adjustedConfidence *= 1.2;
      }
      
      // Boost confidence for common vendors
      if (data.vendor && this.vendorDatabase.has(data.vendor.toLowerCase())) {
        adjustedConfidence *= 1.1;
      }
      
      // Reduce confidence for ambiguous amounts
      if (data.amount && data.amount < 10) {
        adjustedConfidence *= 0.9;
      }
      
      scores[pred.category] = Math.min(adjustedConfidence, 1.0);
    });
    
    return scores;
  }

  /**
   * Select best category from predictions
   */
  selectBestCategory(predictions, confidenceScores) {
    if (predictions.length === 0) {
      return {
        name: 'other',
        confidence: 0.1,
        reasoning: 'No predictions available'
      };
    }
    
    const best = predictions[0];
    const adjustedConfidence = confidenceScores[best.category] || best.confidence;
    
    return {
      name: best.category,
      confidence: adjustedConfidence,
      reasoning: this.generateReasoning(best, predictions)
    };
  }

  /**
   * Generate reasoning for categorization
   */
  generateReasoning(best, allPredictions) {
    const reasons = [];
    
    if (best.sources.includes('vendor_db')) {
      reasons.push('Vendor is known in database');
    }
    
    if (best.sources.includes('classifier')) {
      reasons.push('Machine learning classification');
    }
    
    if (best.sources.includes('keywords')) {
      reasons.push('Keyword matching');
    }
    
    if (best.sources.includes('patterns')) {
      reasons.push('Pattern recognition');
    }
    
    if (allPredictions.length > 1) {
      reasons.push(`${allPredictions.length} prediction sources considered`);
    }
    
    return reasons.join(', ');
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(confidence) {
    if (confidence >= this.confidenceThresholds.high) return 'high';
    if (confidence >= this.confidenceThresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Learn from user correction
   */
  async learnFromCorrection(data, userCategory, companyId) {
    try {
      const { vendor, description, extractedText, amount } = data;
      
      // Add to training data
      const features = this.extractFeatures(data);
      this.trainingData.push({
        text: features,
        category: userCategory
      });
      
      // Update vendor database
      if (vendor) {
        this.vendorDatabase.set(vendor.toLowerCase(), userCategory);
        await this.saveVendorDatabase();
      }
      
      // Store correction in database for future training
      await this.storeCorrectionData(data, userCategory, companyId);
      
      // Retrain classifier with new data
      await this.trainClassifier();
      
      logger.info(`Learned from correction: ${vendor} -> ${userCategory}`);
      
      return {
        success: true,
        message: 'Learning applied successfully'
      };
    } catch (error) {
      logger.error('Failed to learn from correction:', error);
      throw error;
    }
  }

  /**
   * Store correction data in database
   */
  async storeCorrectionData(data, userCategory, companyId) {
    try {
      await prisma.categorizationLearning.create({
        data: {
          vendor: data.vendor,
          description: data.description,
          extractedText: data.extractedText,
          amount: data.amount,
          userCategory,
          companyId,
          features: this.extractFeatures(data),
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to store correction data:', error);
    }
  }

  /**
   * Save vendor database to file
   */
  async saveVendorDatabase() {
    try {
      const vendorData = Object.fromEntries(this.vendorDatabase);
      const vendorFilePath = path.join(this.dataPath, 'vendors.json');
      await fs.writeJson(vendorFilePath, vendorData, { spaces: 2 });
    } catch (error) {
      logger.error('Failed to save vendor database:', error);
    }
  }

  /**
   * Get category suggestions for company
   */
  async getCategorySuggestions(companyId) {
    try {
      // Get existing company categories
      const existingCategories = await prisma.expenseCategory.findMany({
        where: { companyId },
        include: {
          _count: {
            select: { expenses: true }
          }
        }
      });
      
      // Get default categories not yet created
      const existingNames = existingCategories.map(cat => cat.name.toLowerCase());
      const suggestions = Object.entries(this.defaultCategories)
        .filter(([name]) => !existingNames.includes(name))
        .map(([name, data]) => ({
          name,
          description: `${name.replace('_', ' ')} expenses`,
          keywords: data.keywords.slice(0, 5),
          taxCategory: data.taxCategory,
          accountingCode: data.accountingCode
        }));
      
      return {
        existing: existingCategories,
        suggestions
      };
    } catch (error) {
      logger.error('Failed to get category suggestions:', error);
      throw error;
    }
  }

  /**
   * Create default categories for company
   */
  async createDefaultCategories(companyId) {
    try {
      const categories = [];
      
      for (const [name, data] of Object.entries(this.defaultCategories)) {
        const category = await prisma.expenseCategory.create({
          data: {
            name,
            description: `${name.replace('_', ' ')} expenses`,
            companyId,
            isActive: true,
            metadata: {
              keywords: data.keywords,
              taxCategory: data.taxCategory,
              accountingCode: data.accountingCode,
              isDefault: true
            }
          }
        });
        categories.push(category);
      }
      
      logger.info(`Created ${categories.length} default categories for company ${companyId}`);
      return categories;
    } catch (error) {
      logger.error('Failed to create default categories:', error);
      throw error;
    }
  }

  /**
   * Get categorization statistics
   */
  async getCategorizationStats(companyId, days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const stats = await prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
          companyId,
          createdAt: { gte: since }
        },
        _count: true,
        _avg: {
          amount: true
        },
        _sum: {
          amount: true
        }
      });
      
      // Get category details
      const categoryIds = stats.map(stat => stat.categoryId).filter(Boolean);
      const categories = await prisma.expenseCategory.findMany({
        where: { id: { in: categoryIds } }
      });
      
      const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
      
      return stats.map(stat => ({
        category: categoryMap.get(stat.categoryId),
        count: stat._count,
        averageAmount: stat._avg.amount,
        totalAmount: stat._sum.amount
      }));
    } catch (error) {
      logger.error('Failed to get categorization stats:', error);
      throw error;
    }
  }

  /**
   * Batch categorize multiple documents
   */
  async batchCategorize(documents) {
    const results = [];
    
    for (const doc of documents) {
      try {
        const result = await this.categorizeDocument(doc);
        results.push({
          documentId: doc.id,
          ...result
        });
      } catch (error) {
        logger.error(`Failed to categorize document ${doc.id}:`, error);
        results.push({
          documentId: doc.id,
          category: 'other',
          confidence: 0.1,
          confidenceLevel: 'low',
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = CategorizationService; 