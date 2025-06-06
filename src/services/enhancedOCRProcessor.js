const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const cv = require('opencv4nodejs');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const { getOCRLanguage } = require('../utils/i18n');
const DocumentProcessor = require('./documentProcessor');

/**
 * Enhanced OCR Processor with improved accuracy and robustness
 * Handles diverse document layouts, low-quality scans, and international formats
 */
class EnhancedOCRProcessor extends DocumentProcessor {
  constructor() {
    super();
    this.enhancementTechniques = {
      deskew: true,
      denoise: true,
      upscale: true,
      contrastEnhancement: true,
      shadowRemoval: true,
      perspectiveCorrection: true
    };
    this.qualityThresholds = {
      minConfidence: 0.6,
      minDPI: 150,
      maxSkewAngle: 5,
      minContrast: 0.3
    };
  }

  /**
   * Enhanced document processing with multiple quality improvement stages
   */
  async processDocumentEnhanced(documentId, filePath, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting enhanced document processing for ID: ${documentId}`);
      
      // Initial quality assessment
      const qualityAssessment = await this.assessDocumentQuality(filePath);
      logger.debug(`Document quality assessment:`, qualityAssessment);

      // Apply quality improvements based on assessment
      const enhancedImages = await this.enhanceDocumentQuality(filePath, qualityAssessment, options);
      
      // Process with multiple OCR strategies
      const ocrResults = await this.processWithMultipleStrategies(enhancedImages, options);
      
      // Combine and validate results
      const finalResult = await this.combineAndValidateResults(ocrResults, qualityAssessment);
      
      // Generate confidence metrics
      const confidenceMetrics = this.calculateDetailedConfidence(finalResult, qualityAssessment);
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`Enhanced document processing completed for ID: ${documentId}, confidence: ${confidenceMetrics.overall}, time: ${processingTime}ms`);

      return {
        success: true,
        extractedData: finalResult.data,
        confidenceScore: confidenceMetrics.overall,
        confidenceBreakdown: confidenceMetrics.breakdown,
        qualityMetrics: qualityAssessment,
        processingTime,
        enhancementSteps: finalResult.enhancementSteps,
        metadata: {
          ...finalResult.metadata,
          processedAt: new Date().toISOString(),
          processingMode: 'enhanced'
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Enhanced document processing failed for ID: ${documentId}:`, error);
      
      // Fallback to standard processing
      try {
        logger.info(`Attempting fallback to standard processing for ID: ${documentId}`);
        return await this.processDocument(documentId, filePath, options);
      } catch (fallbackError) {
        return {
          success: false,
          error: error.message,
          fallbackError: fallbackError.message,
          processingTime,
          extractedData: {},
          confidenceScore: 0
        };
      }
    }
  }

  /**
   * Assess document quality to determine enhancement strategy
   */
  async assessDocumentQuality(filePath) {
    try {
      const image = await sharp(filePath);
      const metadata = await image.metadata();
      
      // Convert to OpenCV format for analysis
      const buffer = await image.raw().toBuffer();
      const mat = new cv.Mat(buffer, metadata.height, metadata.width, cv.CV_8UC3);
      
      const assessment = {
        dpi: metadata.density || 72,
        dimensions: { width: metadata.width, height: metadata.height },
        aspectRatio: metadata.width / metadata.height,
        format: metadata.format,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
        colorSpace: metadata.space,
        
        // Quality metrics
        sharpness: this.calculateSharpness(mat),
        contrast: this.calculateContrast(mat),
        brightness: this.calculateBrightness(mat),
        skewAngle: this.detectSkewAngle(mat),
        noiseLevel: this.estimateNoiseLevel(mat),
        shadowPresence: this.detectShadows(mat),
        
        // Document type hints
        hasTable: await this.detectTableStructure(mat),
        hasHandwriting: await this.detectHandwriting(mat),
        layout: await this.analyzeLayout(mat),
        
        // Quality scores
        overallQuality: 0 // Will be calculated
      };
      
      // Calculate overall quality score (0-1)
      assessment.overallQuality = this.calculateOverallQuality(assessment);
      
      return assessment;
      
    } catch (error) {
      logger.error('Quality assessment failed:', error);
      return {
        overallQuality: 0.5,
        error: error.message,
        dpi: 72,
        dimensions: { width: 0, height: 0 }
      };
    }
  }

  /**
   * Enhance document quality based on assessment
   */
  async enhanceDocumentQuality(filePath, assessment, options = {}) {
    const enhancedImages = [];
    const enhancementSteps = [];
    
    try {
      let currentImage = sharp(filePath);
      let stepCount = 0;
      
      // Step 1: Upscale if low DPI
      if (assessment.dpi < this.qualityThresholds.minDPI) {
        const scaleFactor = Math.min(3, this.qualityThresholds.minDPI / assessment.dpi);
        currentImage = currentImage.resize(
          Math.round(assessment.dimensions.width * scaleFactor),
          Math.round(assessment.dimensions.height * scaleFactor),
          { kernel: sharp.kernel.lanczos3 }
        );
        enhancementSteps.push(`upscale_${scaleFactor.toFixed(1)}x`);
        stepCount++;
      }
      
      // Step 2: Deskew if needed
      if (Math.abs(assessment.skewAngle) > this.qualityThresholds.maxSkewAngle) {
        currentImage = currentImage.rotate(-assessment.skewAngle, { background: '#ffffff' });
        enhancementSteps.push(`deskew_${assessment.skewAngle.toFixed(1)}deg`);
        stepCount++;
      }
      
      // Step 3: Contrast enhancement if needed
      if (assessment.contrast < this.qualityThresholds.minContrast) {
        const gamma = 1.2;
        const contrast = 1.3;
        currentImage = currentImage.gamma(gamma).linear(contrast, 0);
        enhancementSteps.push(`contrast_enhance`);
        stepCount++;
      }
      
      // Step 4: Noise reduction if needed
      if (assessment.noiseLevel > 0.3) {
        currentImage = currentImage.blur(0.5);
        enhancementSteps.push(`denoise`);
        stepCount++;
      }
      
      // Step 5: Shadow removal if detected
      if (assessment.shadowPresence > 0.4) {
        currentImage = await this.removeShadows(currentImage);
        enhancementSteps.push(`shadow_removal`);
        stepCount++;
      }
      
      // Save enhanced version
      const enhancedPath = path.join(this.tempDir, `enhanced_${crypto.randomUUID()}.png`);
      await currentImage.png({ quality: 100 }).toFile(enhancedPath);
      
      enhancedImages.push({
        path: enhancedPath,
        type: 'enhanced',
        steps: enhancementSteps
      });
      
      // Create additional variants for challenging documents
      if (assessment.overallQuality < 0.6) {
        const variants = await this.createProcessingVariants(filePath, assessment);
        enhancedImages.push(...variants);
      }
      
      return enhancedImages;
      
    } catch (error) {
      logger.error('Image enhancement failed:', error);
      // Return original image as fallback
      return [{
        path: filePath,
        type: 'original',
        steps: ['no_enhancement']
      }];
    }
  }

  /**
   * Create multiple processing variants for challenging documents
   */
  async createProcessingVariants(filePath, assessment) {
    const variants = [];
    
    try {
      const baseImage = sharp(filePath);
      
      // High contrast variant
      const highContrastPath = path.join(this.tempDir, `high_contrast_${crypto.randomUUID()}.png`);
      await baseImage
        .linear(2.0, -50)
        .gamma(0.8)
        .png({ quality: 100 })
        .toFile(highContrastPath);
      
      variants.push({
        path: highContrastPath,
        type: 'high_contrast',
        steps: ['high_contrast_gamma']
      });
      
      // Adaptive threshold variant
      const adaptivePath = path.join(this.tempDir, `adaptive_${crypto.randomUUID()}.png`);
      await this.applyAdaptiveThreshold(filePath, adaptivePath);
      
      variants.push({
        path: adaptivePath,
        type: 'adaptive_threshold',
        steps: ['adaptive_threshold']
      });
      
      // Edge enhancement variant
      const edgeEnhancedPath = path.join(this.tempDir, `edge_enhanced_${crypto.randomUUID()}.png`);
      await baseImage
        .sharpen({ sigma: 1.5, flat: 1, jagged: 2 })
        .png({ quality: 100 })
        .toFile(edgeEnhancedPath);
      
      variants.push({
        path: edgeEnhancedPath,
        type: 'edge_enhanced',
        steps: ['edge_enhancement']
      });
      
    } catch (error) {
      logger.warn('Failed to create processing variants:', error);
    }
    
    return variants;
  }

  /**
   * Process document with multiple OCR strategies
   */
  async processWithMultipleStrategies(enhancedImages, options = {}) {
    const results = [];
    
    for (const imageInfo of enhancedImages) {
      try {
        // Strategy 1: Standard LLaVA processing
        const standardResult = await this.processImageWithLLaVA(
          imageInfo.path, 
          getOCRLanguage(options.locale),
          options.locale
        );
        
        results.push({
          ...standardResult,
          strategy: 'standard_llava',
          imageType: imageInfo.type,
          enhancementSteps: imageInfo.steps
        });
        
        // Strategy 2: Layout-aware processing for structured documents
        if (options.documentType === 'invoice' || options.documentType === 'receipt') {
          const layoutResult = await this.processWithLayoutAwareness(
            imageInfo.path,
            options
          );
          
          results.push({
            ...layoutResult,
            strategy: 'layout_aware',
            imageType: imageInfo.type,
            enhancementSteps: imageInfo.steps
          });
        }
        
        // Strategy 3: Table-specific processing for bank statements
        if (options.documentType === 'bank_statement') {
          const tableResult = await this.processTableStructure(
            imageInfo.path,
            options
          );
          
          results.push({
            ...tableResult,
            strategy: 'table_extraction',
            imageType: imageInfo.type,
            enhancementSteps: imageInfo.steps
          });
        }
        
      } catch (error) {
        logger.warn(`OCR strategy failed for ${imageInfo.type}:`, error);
        results.push({
          data: this.createEmptyExtraction(),
          confidence: 0,
          error: error.message,
          strategy: 'failed',
          imageType: imageInfo.type
        });
      }
    }
    
    return results;
  }

  /**
   * Layout-aware processing for structured documents
   */
  async processWithLayoutAwareness(imagePath, options = {}) {
    try {
      const layoutPrompt = this.createLayoutAwarePrompt(options.locale, options.documentType);
      
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      const response = await axios.post(`${this.ollamaHost}/api/generate`, {
        model: this.ollamaModel,
        prompt: layoutPrompt,
        images: [base64Image],
        stream: false,
        options: {
          temperature: 0.05, // Very low temperature for structured extraction
          top_p: 0.8,
          top_k: 20,
          num_predict: 1000
        }
      }, {
        timeout: this.processingTimeout,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const extractedData = this.parseLayoutAwareResponse(response.data.response, options.locale);
      const confidence = this.calculateConfidence(extractedData);
      
      return {
        data: extractedData,
        confidence: confidence * 1.1, // Boost confidence for layout-aware processing
        rawResponse: response.data.response
      };
      
    } catch (error) {
      logger.error('Layout-aware processing failed:', error);
      return {
        data: this.createEmptyExtraction(),
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Specialized table structure processing for bank statements
   */
  async processTableStructure(imagePath, options = {}) {
    try {
      const tablePrompt = this.createTableExtractionPrompt(options.locale);
      
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      const response = await axios.post(`${this.ollamaHost}/api/generate`, {
        model: this.ollamaModel,
        prompt: tablePrompt,
        images: [base64Image],
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          top_k: 30,
          num_predict: 2000
        }
      }, {
        timeout: this.processingTimeout * 1.5, // Longer timeout for table processing
        headers: { 'Content-Type': 'application/json' }
      });
      
      const extractedData = this.parseTableResponse(response.data.response, options.locale);
      const confidence = this.calculateTableConfidence(extractedData);
      
      return {
        data: extractedData,
        confidence,
        rawResponse: response.data.response
      };
      
    } catch (error) {
      logger.error('Table structure processing failed:', error);
      return {
        data: this.createEmptyExtraction(),
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Combine and validate results from multiple strategies
   */
  async combineAndValidateResults(results, qualityAssessment) {
    if (results.length === 0) {
      return {
        data: this.createEmptyExtraction(),
        confidence: 0,
        enhancementSteps: [],
        metadata: { validationErrors: ['no_results'] }
      };
    }
    
    // Sort results by confidence
    const sortedResults = results
      .filter(r => r.confidence > 0.1)
      .sort((a, b) => b.confidence - a.confidence);
    
    if (sortedResults.length === 0) {
      return {
        data: this.createEmptyExtraction(),
        confidence: 0,
        enhancementSteps: [],
        metadata: { validationErrors: ['all_low_confidence'] }
      };
    }
    
    // Use the highest confidence result as base
    const bestResult = sortedResults[0];
    
    // Cross-validate with other results
    const validatedData = this.crossValidateResults(sortedResults);
    
    // Apply business logic validation
    const businessValidated = this.applyBusinessValidation(validatedData, qualityAssessment);
    
    return {
      data: businessValidated.data,
      confidence: businessValidated.confidence,
      enhancementSteps: bestResult.enhancementSteps || [],
      metadata: {
        strategiesUsed: results.map(r => r.strategy),
        bestStrategy: bestResult.strategy,
        imageType: bestResult.imageType,
        crossValidationScore: businessValidated.crossValidationScore,
        validationErrors: businessValidated.validationErrors || []
      }
    };
  }

  /**
   * Cross-validate results from multiple strategies
   */
  crossValidateResults(results) {
    const validation = {
      total_amount: this.validateNumericField(results, 'total_amount'),
      transaction_date: this.validateDateField(results, 'transaction_date'),
      merchant_name: this.validateTextField(results, 'merchant_name'),
      currency: this.validateTextField(results, 'currency'),
      tax_id: this.validateTextField(results, 'tax_id'),
      vat_amount: this.validateNumericField(results, 'vat_amount'),
      invoice_number: this.validateTextField(results, 'invoice_number'),
      bank_account_number: this.validateTextField(results, 'bank_account_number'),
      document_type: this.validateDocumentType(results)
    };
    
    // Calculate cross-validation confidence
    const validationScore = Object.values(validation)
      .reduce((sum, field) => sum + (field.confidence || 0), 0) / 9;
    
    return {
      data: Object.fromEntries(
        Object.entries(validation).map(([key, field]) => [key, field.value])
      ),
      crossValidationScore: validationScore,
      fieldConfidences: Object.fromEntries(
        Object.entries(validation).map(([key, field]) => [key, field.confidence])
      )
    };
  }

  /**
   * Validate numeric fields across results
   */
  validateNumericField(results, fieldName) {
    const values = results
      .map(r => r.data[fieldName])
      .filter(v => v !== null && v !== undefined && !isNaN(v))
      .map(v => parseFloat(v));
    
    if (values.length === 0) return { value: null, confidence: 0 };
    
    if (values.length === 1) return { value: values[0], confidence: 0.7 };
    
    // Check for consensus
    const sorted = values.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const tolerance = median * 0.05; // 5% tolerance
    
    const consensus = values.filter(v => Math.abs(v - median) <= tolerance);
    const confidenceScore = consensus.length / values.length;
    
    return {
      value: median,
      confidence: confidenceScore,
      alternatives: values.filter(v => Math.abs(v - median) > tolerance)
    };
  }

  /**
   * Validate date fields across results
   */
  validateDateField(results, fieldName) {
    const dates = results
      .map(r => r.data[fieldName])
      .filter(d => d !== null && d !== undefined)
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()));
    
    if (dates.length === 0) return { value: null, confidence: 0 };
    
    if (dates.length === 1) return { 
      value: dates[0].toISOString().split('T')[0], 
      confidence: 0.7 
    };
    
    // Check for date consensus (within 1 day)
    const timestamps = dates.map(d => d.getTime());
    const sortedTimestamps = timestamps.sort((a, b) => a - b);
    const medianTime = sortedTimestamps[Math.floor(sortedTimestamps.length / 2)];
    
    const dayTolerance = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    const consensus = timestamps.filter(t => Math.abs(t - medianTime) <= dayTolerance);
    
    return {
      value: new Date(medianTime).toISOString().split('T')[0],
      confidence: consensus.length / timestamps.length
    };
  }

  /**
   * Validate text fields across results
   */
  validateTextField(results, fieldName) {
    const texts = results
      .map(r => r.data[fieldName])
      .filter(t => t !== null && t !== undefined && typeof t === 'string' && t.trim().length > 0)
      .map(t => t.trim());
    
    if (texts.length === 0) return { value: null, confidence: 0 };
    
    if (texts.length === 1) return { value: texts[0], confidence: 0.7 };
    
    // Find most common text or use similarity matching
    const frequency = {};
    texts.forEach(text => {
      frequency[text] = (frequency[text] || 0) + 1;
    });
    
    const mostCommon = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)[0];
    
    // Use fuzzy matching for similar texts
    const similarTexts = texts.filter(text => 
      this.calculateTextSimilarity(text, mostCommon[0]) > 0.8
    );
    
    return {
      value: mostCommon[0],
      confidence: similarTexts.length / texts.length,
      alternatives: texts.filter(t => !similarTexts.includes(t))
    };
  }

  /**
   * Calculate text similarity using Levenshtein distance
   */
  calculateTextSimilarity(text1, text2) {
    if (text1 === text2) return 1;
    
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Apply business logic validation
   */
  applyBusinessValidation(validatedData, qualityAssessment) {
    const validationErrors = [];
    let adjustedConfidence = validatedData.crossValidationScore;
    
    // Validate amount ranges
    if (validatedData.data.total_amount !== null) {
      if (validatedData.data.total_amount < 0) {
        validationErrors.push('negative_amount');
        adjustedConfidence *= 0.5;
      }
      if (validatedData.data.total_amount > 100000) {
        validationErrors.push('unusually_high_amount');
        adjustedConfidence *= 0.8;
      }
    }
    
    // Validate VAT consistency
    if (validatedData.data.total_amount && validatedData.data.vat_amount) {
      const vatPercentage = (validatedData.data.vat_amount / validatedData.data.total_amount) * 100;
      const commonVATRates = [0, 5, 8, 23]; // Common EU VAT rates
      
      const closestRate = commonVATRates.reduce((prev, curr) => 
        Math.abs(curr - vatPercentage) < Math.abs(prev - vatPercentage) ? curr : prev
      );
      
      if (Math.abs(vatPercentage - closestRate) > 2) {
        validationErrors.push('inconsistent_vat');
        adjustedConfidence *= 0.9;
      }
    }
    
    // Validate date reasonableness
    if (validatedData.data.transaction_date) {
      const transactionDate = new Date(validatedData.data.transaction_date);
      const now = new Date();
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      if (transactionDate > tomorrow) {
        validationErrors.push('future_date');
        adjustedConfidence *= 0.7;
      }
      if (transactionDate < yearAgo) {
        validationErrors.push('very_old_date');
        adjustedConfidence *= 0.9;
      }
    }
    
    // Validate currency consistency
    if (validatedData.data.currency) {
      const validCurrencies = ['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'HUF'];
      if (!validCurrencies.includes(validatedData.data.currency)) {
        validationErrors.push('invalid_currency');
        adjustedConfidence *= 0.8;
      }
    }
    
    // Boost confidence for high-quality documents
    if (qualityAssessment.overallQuality > 0.8) {
      adjustedConfidence *= 1.1;
    }
    
    return {
      data: validatedData.data,
      confidence: Math.min(1, Math.max(0, adjustedConfidence)),
      crossValidationScore: validatedData.crossValidationScore,
      validationErrors,
      fieldConfidences: validatedData.fieldConfidences
    };
  }

  /**
   * Calculate detailed confidence metrics
   */
  calculateDetailedConfidence(result, qualityAssessment) {
    const baseConfidence = result.confidence || 0;
    
    const breakdown = {
      extractionQuality: baseConfidence,
      documentQuality: qualityAssessment.overallQuality,
      crossValidation: result.crossValidationScore || 0.5,
      businessLogic: result.validationErrors ? 
        Math.max(0, 1 - (result.validationErrors.length * 0.1)) : 1,
      fieldCompleteness: this.calculateFieldCompleteness(result.data)
    };
    
    // Weighted average
    const weights = {
      extractionQuality: 0.3,
      documentQuality: 0.2,
      crossValidation: 0.2,
      businessLogic: 0.2,
      fieldCompleteness: 0.1
    };
    
    const overall = Object.entries(breakdown)
      .reduce((sum, [key, value]) => sum + (value * weights[key]), 0);
    
    return {
      overall: Math.min(1, Math.max(0, overall)),
      breakdown
    };
  }

  /**
   * Calculate field completeness score
   */
  calculateFieldCompleteness(data) {
    const importantFields = [
      'total_amount', 'transaction_date', 'merchant_name', 
      'currency', 'document_type'
    ];
    
    const completedFields = importantFields.filter(field => 
      data[field] !== null && data[field] !== undefined && data[field] !== ''
    );
    
    return completedFields.length / importantFields.length;
  }

  /**
   * Quality metric calculation methods
   */
  calculateSharpness(mat) {
    try {
      const gray = mat.channels === 1 ? mat : mat.cvtColor(cv.COLOR_BGR2GRAY);
      const laplacian = gray.laplacian(cv.CV_64F);
      const variance = laplacian.variance();
      return Math.min(1, variance.sigma / 1000);
    } catch (error) {
      return 0.5;
    }
  }

  calculateContrast(mat) {
    try {
      const gray = mat.channels === 1 ? mat : mat.cvtColor(cv.COLOR_BGR2GRAY);
      const mean = gray.mean();
      const stdDev = gray.stdDev();
      return Math.min(1, stdDev / 128);
    } catch (error) {
      return 0.5;
    }
  }

  calculateBrightness(mat) {
    try {
      const gray = mat.channels === 1 ? mat : mat.cvtColor(cv.COLOR_BGR2GRAY);
      const mean = gray.mean();
      return mean / 255;
    } catch (error) {
      return 0.5;
    }
  }

  detectSkewAngle(mat) {
    try {
      // Simplified skew detection
      const gray = mat.channels === 1 ? mat : mat.cvtColor(cv.COLOR_BGR2GRAY);
      const edges = gray.canny(50, 150);
      const lines = edges.houghLinesP(1, Math.PI / 180, 100, 100, 10);
      
      if (lines.length === 0) return 0;
      
      const angles = lines.map(line => {
        const dx = line.w - line.x;
        const dy = line.z - line.y;
        return Math.atan2(dy, dx) * 180 / Math.PI;
      });
      
      // Find most common angle
      angles.sort((a, b) => a - b);
      const median = angles[Math.floor(angles.length / 2)];
      
      return Math.abs(median) > 45 ? 0 : median;
    } catch (error) {
      return 0;
    }
  }

  estimateNoiseLevel(mat) {
    try {
      const gray = mat.channels === 1 ? mat : mat.cvtColor(cv.COLOR_BGR2GRAY);
      const blurred = gray.blur(new cv.Size(5, 5));
      const diff = gray.sub(blurred);
      const variance = diff.variance();
      return Math.min(1, variance.sigma / 50);
    } catch (error) {
      return 0.3;
    }
  }

  detectShadows(mat) {
    try {
      const hsv = mat.cvtColor(cv.COLOR_BGR2HSV);
      const vChannel = hsv.split()[2];
      const mean = vChannel.mean();
      const stdDev = vChannel.stdDev();
      
      // Shadow areas have low value and high variation
      return (mean < 100 && stdDev > 30) ? 0.7 : 0.2;
    } catch (error) {
      return 0.2;
    }
  }

  async detectTableStructure(mat) {
    // Simplified table detection
    try {
      const gray = mat.channels === 1 ? mat : mat.cvtColor(cv.COLOR_BGR2GRAY);
      const edges = gray.canny(50, 150);
      const horizontalLines = edges.houghLinesP(1, Math.PI / 180, 100, mat.cols / 4, 10);
      const verticalLines = edges.houghLinesP(1, Math.PI / 180, 100, mat.rows / 4, 10);
      
      return horizontalLines.length > 3 && verticalLines.length > 2;
    } catch (error) {
      return false;
    }
  }

  async detectHandwriting(mat) {
    // Simplified handwriting detection
    try {
      const gray = mat.channels === 1 ? mat : mat.cvtColor(cv.COLOR_BGR2GRAY);
      const contours = gray.threshold(127, 255, cv.THRESH_BINARY_INV).findContours(
        cv.RETR_EXTERNAL, 
        cv.CHAIN_APPROX_SIMPLE
      );
      
      // Handwriting typically has irregular, varied-size contours
      const areas = contours.map(c => c.area);
      const avgArea = areas.reduce((a, b) => a + b, 0) / areas.length;
      const variance = areas.reduce((sum, area) => sum + Math.pow(area - avgArea, 2), 0) / areas.length;
      
      return variance > avgArea * 2; // High variance suggests handwriting
    } catch (error) {
      return false;
    }
  }

  async analyzeLayout(mat) {
    try {
      // Basic layout analysis
      const gray = mat.channels === 1 ? mat : mat.cvtColor(cv.COLOR_BGR2GRAY);
      const contours = gray.threshold(127, 255, cv.THRESH_BINARY_INV).findContours(
        cv.RETR_EXTERNAL, 
        cv.CHAIN_APPROX_SIMPLE
      );
      
      if (contours.length < 10) return 'simple';
      if (contours.length > 100) return 'complex';
      return 'standard';
    } catch (error) {
      return 'unknown';
    }
  }

  calculateOverallQuality(assessment) {
    const weights = {
      sharpness: 0.2,
      contrast: 0.2,
      brightness: 0.1,
      skewAngle: 0.15,
      noiseLevel: 0.15,
      shadowPresence: 0.1,
      dpi: 0.1
    };
    
    const scores = {
      sharpness: assessment.sharpness,
      contrast: assessment.contrast,
      brightness: Math.min(1, 1 - Math.abs(assessment.brightness - 0.5) * 2),
      skewAngle: Math.max(0, 1 - Math.abs(assessment.skewAngle) / 10),
      noiseLevel: Math.max(0, 1 - assessment.noiseLevel),
      shadowPresence: Math.max(0, 1 - assessment.shadowPresence),
      dpi: Math.min(1, assessment.dpi / 300)
    };
    
    return Object.entries(scores)
      .reduce((sum, [key, score]) => sum + (score * weights[key]), 0);
  }

  // Additional helper methods for specialized processing...
  
  createLayoutAwarePrompt(locale, documentType) {
    const prompts = {
      'en-US': `Analyze this ${documentType} document image with layout awareness. Extract structured data in JSON format, paying special attention to the document's layout and organization. Focus on:
1. Header information (company name, address, contact)
2. Document identification (invoice number, date)
3. Line items (if applicable)
4. Total amounts and tax information
5. Footer information (payment terms, bank details)

Return a comprehensive JSON structure with high precision.`,
      'pl-PL': `Przeanalizuj ten obraz dokumentu ${documentType} z uwzględnieniem układu. Wyodrębnij ustrukturyzowane dane w formacie JSON, zwracając szczególną uwagę na układ i organizację dokumentu.`,
      'de-DE': `Analysieren Sie dieses ${documentType}-Dokumentbild mit Layout-Bewusstsein. Extrahieren Sie strukturierte Daten im JSON-Format unter besonderer Berücksichtigung des Layouts und der Organisation des Dokuments.`
    };
    
    return prompts[locale] || prompts['en-US'];
  }

  createTableExtractionPrompt(locale) {
    const prompts = {
      'en-US': `Extract tabular data from this bank statement or table document. Focus on:
1. Column headers and their meaning
2. Row data with proper alignment
3. Numerical values with correct formatting
4. Date information
5. Transaction descriptions

Return structured JSON with table data preserving relationships between columns and rows.`,
      'pl-PL': `Wyodrębnij dane tabelaryczne z tego wyciągu bankowego lub dokumentu tabeli. Skoncentruj się na nagłówkach kolumn, danych wierszy i wartościach liczbowych.`,
      'de-DE': `Extrahieren Sie Tabellendaten aus diesem Kontoauszug oder Tabellendokument. Konzentrieren Sie sich auf Spaltenüberschriften, Zeilendaten und numerische Werte.`
    };
    
    return prompts[locale] || prompts['en-US'];
  }

  parseLayoutAwareResponse(response, locale) {
    // Enhanced parsing for layout-aware responses
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.createEmptyExtraction();
      
      const parsed = JSON.parse(jsonMatch[0]);
      return this.validateAndNormalizeData(parsed, locale);
    } catch (error) {
      logger.error('Failed to parse layout-aware response:', error);
      return this.createEmptyExtraction();
    }
  }

  parseTableResponse(response, locale) {
    // Enhanced parsing for table responses
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.createEmptyExtraction();
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Special handling for table data
      if (parsed.table_data && Array.isArray(parsed.table_data)) {
        parsed.transactions = parsed.table_data;
      }
      
      return this.validateAndNormalizeData(parsed, locale);
    } catch (error) {
      logger.error('Failed to parse table response:', error);
      return this.createEmptyExtraction();
    }
  }

  calculateTableConfidence(data) {
    let confidence = 0.5;
    
    // Check for table-specific data
    if (data.transactions && Array.isArray(data.transactions)) {
      confidence += 0.3;
      
      // Check transaction data quality
      const validTransactions = data.transactions.filter(t => 
        t.date && t.amount && (t.description || t.merchant)
      );
      
      if (validTransactions.length > 0) {
        confidence += 0.2 * (validTransactions.length / data.transactions.length);
      }
    }
    
    // Standard field validation
    if (data.total_amount) confidence += 0.1;
    if (data.transaction_date) confidence += 0.1;
    if (data.bank_account_number) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  async removeShadows(sharpImage) {
    // Simplified shadow removal using sharp
    try {
      return sharpImage
        .normalise()
        .gamma(1.2)
        .linear(1.1, -10);
    } catch (error) {
      logger.warn('Shadow removal failed:', error);
      return sharpImage;
    }
  }

  async applyAdaptiveThreshold(inputPath, outputPath) {
    try {
      // Simplified adaptive threshold using sharp
      await sharp(inputPath)
        .grayscale()
        .normalize()
        .threshold(128)
        .png({ quality: 100 })
        .toFile(outputPath);
    } catch (error) {
      logger.error('Adaptive threshold failed:', error);
    }
  }

  validateDocumentType(results) {
    const types = results
      .map(r => r.data.document_type)
      .filter(t => t && t !== 'other');
    
    if (types.length === 0) return { value: 'other', confidence: 0.3 };
    
    const frequency = {};
    types.forEach(type => {
      frequency[type] = (frequency[type] || 0) + 1;
    });
    
    const mostCommon = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      value: mostCommon[0],
      confidence: mostCommon[1] / types.length
    };
  }
}

module.exports = EnhancedOCRProcessor; 