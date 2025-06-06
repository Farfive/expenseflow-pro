const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const pdf2pic = require('pdf2pic');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const { getOCRLanguage } = require('../utils/i18n');

class DocumentProcessor {
  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llava:latest';
    this.confidenceThreshold = parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD) || 0.8;
    this.processingTimeout = parseInt(process.env.PROCESSING_TIMEOUT) || 300000; // 5 minutes
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.tempDir = path.join(this.uploadDir, 'temp');
    this.previewsDir = path.join(this.uploadDir, 'previews');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    try {
      await fs.ensureDir(this.tempDir);
      await fs.ensureDir(this.previewsDir);
      logger.info('Document processor directories initialized');
    } catch (error) {
      logger.error('Failed to create document processor directories:', error);
    }
  }

  /**
   * Process uploaded document
   */
  async processDocument(documentId, filePath, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting document processing for ID: ${documentId}`);
      
      // Validate file exists
      if (!await fs.pathExists(filePath)) {
        throw new AppError('Document file not found', 404);
      }

      // Get file info
      const fileStats = await fs.stat(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);

      // Process based on file type
      let extractedData = {};
      let confidenceScore = 0;
      let images = [];

      switch (fileExtension) {
        case '.pdf':
          images = await this.convertPdfToImages(filePath);
          break;
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.webp':
          images = [await this.preprocessImage(filePath)];
          break;
        default:
          throw new AppError(`Unsupported file type: ${fileExtension}`, 400);
      }

      // Extract data using Ollama LLaVA
      const results = await this.extractDataWithLLaVA(images, options);
      extractedData = results.data;
      confidenceScore = results.confidence;

      // Generate preview image
      const previewPath = await this.generatePreview(images[0], documentId);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      logger.info(`Document processing completed for ID: ${documentId}, confidence: ${confidenceScore}, time: ${processingTime}ms`);

      return {
        success: true,
        extractedData,
        confidenceScore,
        processingTime,
        previewPath,
        metadata: {
          fileSize: fileStats.size,
          fileType: fileExtension,
          pageCount: images.length,
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Document processing failed for ID: ${documentId}:`, error);
      
      return {
        success: false,
        error: error.message,
        processingTime,
        extractedData: {},
        confidenceScore: 0
      };
    }
  }

  /**
   * Convert PDF to images
   */
  async convertPdfToImages(pdfPath) {
    try {
      const density = parseInt(process.env.PDF_TO_IMAGE_DENSITY) || 300;
      const outputDir = path.join(this.tempDir, crypto.randomUUID());
      await fs.ensureDir(outputDir);

      const convert = pdf2pic.fromPath(pdfPath, {
        density: density,
        saveFilename: 'page',
        savePath: outputDir,
        format: 'png',
        width: 2480,
        height: 3508
      });

      const results = await convert.bulk(-1);
      const imagePaths = results.map(result => result.path);

      logger.info(`Converted PDF to ${imagePaths.length} images`);
      return imagePaths;

    } catch (error) {
      logger.error('PDF conversion failed:', error);
      throw new AppError('Failed to convert PDF to images', 500);
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  async preprocessImage(imagePath) {
    try {
      if (!process.env.IMAGE_PREPROCESSING || process.env.IMAGE_PREPROCESSING !== 'true') {
        return imagePath;
      }

      const outputPath = path.join(this.tempDir, `preprocessed_${crypto.randomUUID()}.png`);
      
      await sharp(imagePath)
        .resize(2480, 3508, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .normalize()
        .sharpen()
        .png({ quality: 100 })
        .toFile(outputPath);

      logger.debug(`Image preprocessed: ${outputPath}`);
      return outputPath;

    } catch (error) {
      logger.warn('Image preprocessing failed, using original:', error);
      return imagePath;
    }
  }

  /**
   * Extract data using Ollama LLaVA
   */
  async extractDataWithLLaVA(imagePaths, options = {}) {
    try {
      const locale = options.locale || 'en-US';
      const language = getOCRLanguage(locale);
      
      // Process each image
      const results = await Promise.all(
        imagePaths.map(imagePath => this.processImageWithLLaVA(imagePath, language, locale))
      );

      // Combine results from multiple pages
      const combinedData = this.combineExtractionResults(results);
      const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

      return {
        data: combinedData,
        confidence: averageConfidence,
        pageResults: results
      };

    } catch (error) {
      logger.error('LLaVA extraction failed:', error);
      throw new AppError('Failed to extract data with AI', 500);
    }
  }

  /**
   * Process single image with LLaVA
   */
  async processImageWithLLaVA(imagePath, language = 'eng', locale = 'en-US') {
    try {
      // Convert image to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Create language-specific prompt
      const prompt = this.createExtractionPrompt(locale);

      // Call Ollama LLaVA API
      const response = await axios.post(`${this.ollamaHost}/api/generate`, {
        model: this.ollamaModel,
        prompt: prompt,
        images: [base64Image],
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent results
          top_p: 0.9,
          top_k: 40
        }
      }, {
        timeout: this.processingTimeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data || !response.data.response) {
        throw new Error('Invalid response from Ollama');
      }

      // Parse the response
      const extractedData = this.parseExtractionResponse(response.data.response, locale);
      const confidence = this.calculateConfidence(extractedData);

      logger.debug(`LLaVA extraction completed with confidence: ${confidence}`);

      return {
        data: extractedData,
        confidence: confidence,
        rawResponse: response.data.response
      };

    } catch (error) {
      logger.error('LLaVA processing error:', error);
      return {
        data: {},
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Create extraction prompt based on locale
   */
  createExtractionPrompt(locale = 'en-US') {
    const prompts = {
      'en-US': `
Please analyze this document image and extract the following information in JSON format:

{
  "document_type": "receipt|invoice|bank_statement|other",
  "total_amount": number,
  "currency": "ISO currency code",
  "transaction_date": "YYYY-MM-DD",
  "merchant_name": "string",
  "tax_id": "string",
  "vat_amount": number,
  "bank_account_number": "string",
  "invoice_number": "string",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "price": number
    }
  ],
  "confidence": number between 0 and 1
}

Focus on extracting accurate numerical values, dates, and text. If a field is not present or unclear, set it to null. Provide a confidence score based on the clarity of the document.
`,
      'pl-PL': `
Przeanalizuj ten obraz dokumentu i wyodrębnij następujące informacje w formacie JSON:

{
  "document_type": "receipt|invoice|bank_statement|other",
  "total_amount": liczba,
  "currency": "kod waluty ISO",
  "transaction_date": "YYYY-MM-DD",
  "merchant_name": "string",
  "tax_id": "string (NIP)",
  "vat_amount": liczba,
  "bank_account_number": "string",
  "invoice_number": "string",
  "items": [
    {
      "description": "string",
      "quantity": liczba,
      "price": liczba
    }
  ],
  "confidence": liczba między 0 a 1
}

Skoncentruj się na dokładnym wyodrębnieniu wartości liczbowych, dat i tekstu. Jeśli pole nie jest obecne lub niejasne, ustaw je na null. Podaj wskaźnik pewności na podstawie czytelności dokumentu.
`,
      'de-DE': `
Analysieren Sie dieses Dokumentbild und extrahieren Sie die folgenden Informationen im JSON-Format:

{
  "document_type": "receipt|invoice|bank_statement|other",
  "total_amount": Zahl,
  "currency": "ISO-Währungscode",
  "transaction_date": "YYYY-MM-DD",
  "merchant_name": "string",
  "tax_id": "string (USt-IdNr)",
  "vat_amount": Zahl,
  "bank_account_number": "string",
  "invoice_number": "string",
  "items": [
    {
      "description": "string",
      "quantity": Zahl,
      "price": Zahl
    }
  ],
  "confidence": Zahl zwischen 0 und 1
}

Konzentrieren Sie sich auf die genaue Extraktion von Zahlenwerten, Daten und Text. Wenn ein Feld nicht vorhanden oder unklar ist, setzen Sie es auf null. Geben Sie einen Vertrauenswert basierend auf der Klarheit des Dokuments an.
`
    };

    return prompts[locale] || prompts['en-US'];
  }

  /**
   * Parse extraction response from LLaVA
   */
  parseExtractionResponse(response, locale = 'en-US') {
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        logger.warn('No JSON found in LLaVA response');
        return this.createEmptyExtraction();
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate and normalize the extracted data
      return this.validateAndNormalizeData(parsed, locale);

    } catch (error) {
      logger.error('Failed to parse LLaVA response:', error);
      return this.createEmptyExtraction();
    }
  }

  /**
   * Validate and normalize extracted data
   */
  validateAndNormalizeData(data, locale = 'en-US') {
    const normalized = {
      document_type: this.normalizeDocumentType(data.document_type),
      total_amount: this.normalizeAmount(data.total_amount),
      currency: this.normalizeCurrency(data.currency, locale),
      transaction_date: this.normalizeDate(data.transaction_date),
      merchant_name: this.normalizeText(data.merchant_name),
      tax_id: this.normalizeText(data.tax_id),
      vat_amount: this.normalizeAmount(data.vat_amount),
      bank_account_number: this.normalizeText(data.bank_account_number),
      invoice_number: this.normalizeText(data.invoice_number),
      items: this.normalizeItems(data.items),
      confidence: this.normalizeConfidence(data.confidence)
    };

    return normalized;
  }

  /**
   * Normalize document type
   */
  normalizeDocumentType(type) {
    if (!type || typeof type !== 'string') return 'other';
    
    const normalized = type.toLowerCase().trim();
    const validTypes = ['receipt', 'invoice', 'bank_statement', 'other'];
    
    return validTypes.includes(normalized) ? normalized : 'other';
  }

  /**
   * Normalize amount values
   */
  normalizeAmount(amount) {
    if (amount === null || amount === undefined) return null;
    
    const num = parseFloat(amount);
    return isNaN(num) ? null : Math.round(num * 100) / 100;
  }

  /**
   * Normalize currency code
   */
  normalizeCurrency(currency, locale = 'en-US') {
    if (!currency || typeof currency !== 'string') {
      // Default currency based on locale
      const defaultCurrencies = {
        'en-US': 'USD',
        'pl-PL': 'PLN',
        'de-DE': 'EUR'
      };
      return defaultCurrencies[locale] || 'PLN';
    }
    
    return currency.toUpperCase().trim();
  }

  /**
   * Normalize date
   */
  normalizeDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Normalize text fields
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') return null;
    
    return text.trim() || null;
  }

  /**
   * Normalize items array
   */
  normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    
    return items.map(item => ({
      description: this.normalizeText(item.description),
      quantity: this.normalizeAmount(item.quantity),
      price: this.normalizeAmount(item.price)
    })).filter(item => item.description || item.price);
  }

  /**
   * Normalize confidence score
   */
  normalizeConfidence(confidence) {
    const num = parseFloat(confidence);
    if (isNaN(num)) return 0.5;
    return Math.max(0, Math.min(1, num));
  }

  /**
   * Create empty extraction result
   */
  createEmptyExtraction() {
    return {
      document_type: 'other',
      total_amount: null,
      currency: 'PLN',
      transaction_date: null,
      merchant_name: null,
      tax_id: null,
      vat_amount: null,
      bank_account_number: null,
      invoice_number: null,
      items: [],
      confidence: 0
    };
  }

  /**
   * Calculate confidence score based on extracted data quality
   */
  calculateConfidence(data) {
    let score = 0;
    let factors = 0;

    // Check for presence of key fields
    if (data.total_amount !== null) { score += 0.3; factors++; }
    if (data.transaction_date !== null) { score += 0.2; factors++; }
    if (data.merchant_name !== null) { score += 0.2; factors++; }
    if (data.currency !== null) { score += 0.1; factors++; }
    if (data.document_type !== 'other') { score += 0.1; factors++; }
    if (data.tax_id !== null) { score += 0.05; factors++; }
    if (data.invoice_number !== null) { score += 0.05; factors++; }

    // Use provided confidence if available
    if (data.confidence !== undefined) {
      score = (score + data.confidence) / 2;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Combine results from multiple pages
   */
  combineExtractionResults(results) {
    if (results.length === 0) return this.createEmptyExtraction();
    if (results.length === 1) return results[0].data;

    // Find the result with highest confidence
    const bestResult = results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    // Combine items from all pages
    const allItems = results.reduce((items, result) => {
      if (result.data.items && Array.isArray(result.data.items)) {
        return items.concat(result.data.items);
      }
      return items;
    }, []);

    return {
      ...bestResult.data,
      items: allItems
    };
  }

  /**
   * Generate preview image
   */
  async generatePreview(imagePath, documentId) {
    try {
      const previewPath = path.join(this.previewsDir, `${documentId}_preview.jpg`);
      
      await sharp(imagePath)
        .resize(800, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 80,
          progressive: true 
        })
        .toFile(previewPath);

      return previewPath;

    } catch (error) {
      logger.error('Preview generation failed:', error);
      return null;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(tempFiles = []) {
    try {
      await Promise.all(
        tempFiles.map(async (filePath) => {
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
          }
        })
      );
      
      logger.debug(`Cleaned up ${tempFiles.length} temporary files`);
    } catch (error) {
      logger.warn('Cleanup failed:', error);
    }
  }

  /**
   * Get processing status
   */
  async getProcessingStatus() {
    try {
      // Check if Ollama is available
      const response = await axios.get(`${this.ollamaHost}/api/tags`, {
        timeout: 5000
      });

      const models = response.data.models || [];
      const modelAvailable = models.some(model => model.name === this.ollamaModel);

      return {
        available: true,
        ollamaHost: this.ollamaHost,
        model: this.ollamaModel,
        modelAvailable,
        confidenceThreshold: this.confidenceThreshold
      };

    } catch (error) {
      return {
        available: false,
        error: error.message,
        ollamaHost: this.ollamaHost,
        model: this.ollamaModel
      };
    }
  }

  /**
   * Validate file before processing
   */
  validateFile(filePath, fileSize, mimeType) {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,application/pdf').split(',');

    if (fileSize > maxSize) {
      throw new AppError(`File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`, 400);
    }

    if (!allowedTypes.includes(mimeType)) {
      throw new AppError(`File type ${mimeType} not allowed`, 400);
    }

    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    
    if (!allowedExtensions.includes(ext)) {
      throw new AppError(`File extension ${ext} not allowed`, 400);
    }

    return true;
  }
}

module.exports = DocumentProcessor; 