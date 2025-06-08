const OllamaLLaVAOCRService = require('./ollama-llava-ocr-service');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class EnhancedOCRService {
  constructor() {
    this.ollamaService = new OllamaLLaVAOCRService();
    this.uploadsDir = path.join(__dirname, 'uploads');
    this.enableFallback = true;
    this.confidenceThreshold = 0.7;
    
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async processDocument(filePath, originalName) {
    try {
      console.log('🔄 Starting enhanced OCR processing for:', originalName);
      
      const ollamaStatus = await this.ollamaService.testConnection();
      
      if (ollamaStatus.connected && ollamaStatus.hasLLaVA) {
        console.log('🤖 Using Ollama LLaVA for primary OCR processing');
        
        const llavaResult = await this.ollamaService.processDocument(filePath, originalName);
        
        if (llavaResult.success && llavaResult.confidence >= this.confidenceThreshold) {
          console.log(`✅ LLaVA processing successful (confidence: ${llavaResult.confidence})`);
          return {
            ...llavaResult,
            processingMethod: 'ollama-llava',
            fallbackUsed: false
          };
        } else {
          console.log(`⚠️ LLaVA confidence too low (${llavaResult.confidence}), using fallback`);
          return await this.processWithFallback(filePath, originalName, llavaResult);
        }
      } else {
        console.log('❌ Ollama LLaVA not available, using Tesseract fallback');
        return await this.processWithTesseract(filePath, originalName);
      }
    } catch (error) {
      console.error('Enhanced OCR processing error:', error);
      
      if (this.enableFallback) {
        console.log('🔄 Falling back to Tesseract OCR');
        return await this.processWithTesseract(filePath, originalName);
      } else {
        return {
          success: false,
          error: error.message,
          extractedData: null,
          confidence: 0,
          processingMethod: 'error',
          originalName
        };
      }
    }
  }

  async processWithFallback(filePath, originalName, llavaResult) {
    try {
      console.log('🔄 Processing with fallback method (Tesseract + LLaVA merge)');
      
      const tesseractResult = await this.processWithTesseract(filePath, originalName);
      
      if (llavaResult.success && tesseractResult.success) {
        const mergedResult = this.mergeOCRResults(llavaResult, tesseractResult);
        return {
          ...mergedResult,
          processingMethod: 'hybrid-llava-tesseract',
          fallbackUsed: true
        };
      } else if (tesseractResult.success) {
        return {
          ...tesseractResult,
          processingMethod: 'tesseract-fallback',
          fallbackUsed: true
        };
      } else {
        return llavaResult;
      }
    } catch (error) {
      console.error('Fallback processing error:', error);
      return {
        success: false,
        error: error.message,
        extractedData: null,
        confidence: 0,
        processingMethod: 'fallback-error',
        originalName
      };
    }
  }

  async processWithTesseract(filePath, originalName) {
    try {
      console.log('🔤 Processing with Tesseract OCR');
      
      const processedPath = await this.preprocessImageForTesseract(filePath);
      
      const { data: { text } } = await Tesseract.recognize(
        processedPath,
        'eng+pol',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`Tesseract Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      const extractedData = this.parseReceiptData(text);
      
      if (processedPath !== filePath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }

      return {
        success: true,
        extractedData,
        confidence: extractedData.confidence,
        processingMethod: 'tesseract',
        originalName,
        processedAt: new Date().toISOString(),
        rawText: text
      };
    } catch (error) {
      console.error('Tesseract processing error:', error);
      return {
        success: false,
        error: error.message,
        extractedData: null,
        confidence: 0,
        processingMethod: 'tesseract',
        originalName
      };
    }
  }

  async preprocessImageForTesseract(imagePath) {
    try {
      const processedPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '_tesseract_processed.png');
      
      await sharp(imagePath)
        .resize(2000, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .normalize()
        .sharpen()
        .greyscale()
        .png()
        .toFile(processedPath);

      return processedPath;
    } catch (error) {
      console.error('Tesseract preprocessing error:', error);
      return imagePath;
    }
  }

  parseReceiptData(text) {
    try {
      const result = {
        document_type: 'receipt',
        total_amount: null,
        currency: 'PLN',
        transaction_date: null,
        merchant_name: null,
        nip_number: null,
        vat_amount: null,
        items: [],
        payment_method: null,
        category_suggestion: null,
        confidence: 0.7
      };

      // Extract amount
      const amountPatterns = [
        /(?:total|suma|razem|do zapłaty)[:\s]*([0-9]+[.,][0-9]{2})/i,
        /([0-9]+[.,][0-9]{2})\s*(?:zł|pln|eur|usd)/i
      ];

      for (const pattern of amountPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          const amount = matches[matches.length - 1].replace(',', '.');
          const parsed = parseFloat(amount);
          if (parsed > 0 && parsed < 100000) {
            result.total_amount = parsed;
            break;
          }
        }
      }

      // Extract date
      const datePatterns = [
        /(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/,
        /(\d{2,4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          const dateStr = match[1];
          const date = this.parseDate(dateStr);
          if (date) {
            result.transaction_date = date.toISOString().split('T')[0];
            break;
          }
        }
      }

      // Extract merchant name
      const excludeWords = ['paragon', 'receipt', 'faktura', 'invoice', 'data', 'date', 'czas', 'time'];
      for (const line of text.split('\n').map(line => line.trim()).filter(line => line.length > 0).slice(0, 5)) {
        if (line.length > 3 && 
            !excludeWords.some(word => line.toLowerCase().includes(word)) &&
            !/^\d+[.\-\/]\d+/.test(line) &&
            !/^\d+[.,]\d+/.test(line)) {
          result.merchant_name = line;
          break;
        }
      }

      // Extract VAT number
      const vatPattern = /(?:nip|vat)[:\s]*([0-9\-\s]{10,15})/i;
      const vatMatch = text.match(vatPattern);
      if (vatMatch) {
        result.nip_number = vatMatch[1].replace(/[\s\-]/g, '');
      }

      result.confidence = this.calculateTesseractConfidence(result);
      return result;
    } catch (error) {
      console.error('Receipt parsing error:', error);
      return {
        document_type: 'receipt',
        total_amount: null,
        currency: 'PLN',
        confidence: 0.1
      };
    }
  }

  parseDate(dateStr) {
    try {
      const formats = [
        /(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/,
        /(\d{2,4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          let [, part1, part2, part3] = match;
          
          if (part3.length === 2) {
            part3 = '20' + part3;
          }

          let date;
          if (part1.length === 4) {
            date = new Date(part1, part2 - 1, part3);
          } else {
            date = new Date(part3, part2 - 1, part1);
          }

          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  calculateTesseractConfidence(data) {
    let score = 0.3;
    if (data.total_amount !== null) score += 0.3;
    if (data.transaction_date !== null) score += 0.2;
    if (data.merchant_name) score += 0.1;
    return Math.min(1.0, score);
  }

  mergeOCRResults(llavaResult, tesseractResult) {
    try {
      console.log('🔀 Merging LLaVA and Tesseract results');
      
      const merged = { ...llavaResult.extractedData };
      const tesseractData = tesseractResult.extractedData;
      
      if (!merged.total_amount && tesseractData.total_amount) {
        merged.total_amount = tesseractData.total_amount;
        console.log('📊 Enhanced amount from Tesseract');
      }
      
      if (!merged.transaction_date && tesseractData.transaction_date) {
        merged.transaction_date = tesseractData.transaction_date;
        console.log('📅 Enhanced date from Tesseract');
      }
      
      if (!merged.merchant_name && tesseractData.merchant_name) {
        merged.merchant_name = tesseractData.merchant_name;
        console.log('🏪 Enhanced merchant from Tesseract');
      }
      
      if (merged.total_amount && tesseractData.total_amount) {
        const diff = Math.abs(merged.total_amount - tesseractData.total_amount);
        const percentDiff = diff / merged.total_amount;
        
        if (percentDiff > 0.1) {
          merged.validation_warning = 'Amount mismatch between OCR methods';
          merged.confidence_score = Math.min(merged.confidence_score, 0.6);
          console.log('⚠️ Amount validation warning - significant difference detected');
        }
      }
      
      const enhancedConfidence = this.calculateEnhancedConfidence(merged, llavaResult.confidence, tesseractResult.confidence);
      
      return {
        success: true,
        extractedData: merged,
        confidence: enhancedConfidence,
        originalName: llavaResult.originalName,
        processedAt: new Date().toISOString(),
        llavaConfidence: llavaResult.confidence,
        tesseractConfidence: tesseractResult.confidence
      };
    } catch (error) {
      console.error('Merge error:', error);
      return llavaResult;
    }
  }

  calculateEnhancedConfidence(mergedData, llavaConfidence, tesseractConfidence) {
    const weightedConfidence = (llavaConfidence * 0.7) + (tesseractConfidence * 0.3);
    
    let bonus = 0;
    if (mergedData.total_amount !== null) bonus += 0.05;
    if (mergedData.transaction_date !== null) bonus += 0.05;
    if (mergedData.merchant_name) bonus += 0.05;
    
    let penalty = 0;
    if (mergedData.validation_warning) penalty = 0.1;
    
    return Math.max(0.1, Math.min(1.0, weightedConfidence + bonus - penalty));
  }

  async validateExtractedData(data) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      confidence: data.confidence || 0
    };

    if (!data.total_amount || data.total_amount <= 0) {
      validation.errors.push('Missing or invalid total amount');
      validation.isValid = false;
    }

    if (!data.transaction_date) {
      validation.warnings.push('Missing transaction date');
      validation.confidence = Math.max(0, validation.confidence - 0.1);
    }

    if (!data.merchant_name || data.merchant_name.length < 2) {
      validation.warnings.push('Missing or very short merchant name');
      validation.confidence = Math.max(0, validation.confidence - 0.05);
    }

    if (data.nip_number && !/^\d{10}$/.test(data.nip_number)) {
      validation.warnings.push('Invalid NIP format (should be 10 digits)');
    }

    if (data.currency && !['PLN', 'EUR', 'USD'].includes(data.currency)) {
      validation.warnings.push('Unsupported currency detected');
    }

    if (data.transaction_date) {
      const date = new Date(data.transaction_date);
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneWeekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (date > oneWeekAhead) {
        validation.warnings.push('Transaction date is in the future');
      }
      if (date < oneYearAgo) {
        validation.warnings.push('Transaction date is more than one year old');
      }
    }

    if (validation.errors.length > 0) {
      validation.confidence = Math.max(0, validation.confidence - 0.3);
    }
    if (validation.warnings.length > 2) {
      validation.confidence = Math.max(0, validation.confidence - 0.1);
    }

    return validation;
  }

  async getStatus() {
    const ollamaStatus = await this.ollamaService.testConnection();
    
    return {
      ollama: ollamaStatus,
      tesseract: {
        available: true,
        version: 'v4'
      },
      fallbackEnabled: this.enableFallback,
      confidenceThreshold: this.confidenceThreshold
    };
  }
}

module.exports = EnhancedOCRService; 