const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class OCRService {
  constructor() {
    this.uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // Preprocess image for better OCR results
  async preprocessImage(imagePath) {
    try {
      const processedPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '_processed.png');
      
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
      console.error('Image preprocessing error:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  // Extract text from image using Tesseract
  async extractText(imagePath) {
    try {
      console.log('Starting OCR processing for:', imagePath);
      
      // Preprocess image
      const processedPath = await this.preprocessImage(imagePath);
      
      // Perform OCR
      const { data: { text } } = await Tesseract.recognize(
        processedPath,
        'eng+pol', // English and Polish
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      // Clean up processed image if different from original
      if (processedPath !== imagePath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }

      return {
        success: true,
        text: text.trim(),
        confidence: 0.85 // Tesseract doesn't provide overall confidence, using estimate
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      return {
        success: false,
        error: error.message,
        text: ''
      };
    }
  }

  // Parse receipt data from extracted text
  parseReceiptData(text) {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      const result = {
        amount: null,
        currency: 'PLN',
        date: null,
        merchant: null,
        items: [],
        vatNumber: null,
        confidence: 0.7
      };

      // Extract amount (look for patterns like "123.45", "123,45", "TOTAL: 123.45")
      const amountPatterns = [
        /(?:total|suma|razem|do zapłaty)[:\s]*([0-9]+[.,][0-9]{2})/i,
        /([0-9]+[.,][0-9]{2})\s*(?:zł|pln|eur|usd)/i,
        /\b([0-9]+[.,][0-9]{2})\b/g
      ];

      for (const pattern of amountPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          const amount = matches[matches.length - 1].replace(',', '.');
          const parsed = parseFloat(amount);
          if (parsed > 0 && parsed < 100000) { // Reasonable amount range
            result.amount = parsed;
            break;
          }
        }
      }

      // Extract date (various formats)
      const datePatterns = [
        /(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/,
        /(\d{2,4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
        /(\d{1,2}\s+\w+\s+\d{2,4})/
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          const dateStr = match[1];
          const date = this.parseDate(dateStr);
          if (date) {
            result.date = date.toISOString().split('T')[0];
            break;
          }
        }
      }

      // Extract merchant name (usually first few lines, excluding common receipt words)
      const excludeWords = ['paragon', 'receipt', 'faktura', 'invoice', 'data', 'date', 'czas', 'time'];
      for (const line of lines.slice(0, 5)) {
        if (line.length > 3 && 
            !excludeWords.some(word => line.toLowerCase().includes(word)) &&
            !/^\d+[.\-\/]\d+/.test(line) && // Not a date
            !/^\d+[.,]\d+/.test(line)) {    // Not an amount
          result.merchant = line;
          break;
        }
      }

      // Extract VAT number (NIP in Poland)
      const vatPattern = /(?:nip|vat)[:\s]*([0-9\-\s]{10,15})/i;
      const vatMatch = text.match(vatPattern);
      if (vatMatch) {
        result.vatNumber = vatMatch[1].replace(/[\s\-]/g, '');
      }

      // Extract line items (basic attempt)
      const itemPattern = /(.+?)\s+([0-9]+[.,][0-9]{2})/g;
      let itemMatch;
      while ((itemMatch = itemPattern.exec(text)) !== null && result.items.length < 10) {
        const description = itemMatch[1].trim();
        const price = parseFloat(itemMatch[2].replace(',', '.'));
        
        if (description.length > 2 && price > 0 && price < (result.amount || 1000)) {
          result.items.push({
            description,
            price,
            quantity: 1
          });
        }
      }

      // Determine category based on merchant name and items
      result.category = this.categorizeReceipt(result.merchant, result.items);

      return result;
    } catch (error) {
      console.error('Receipt parsing error:', error);
      return {
        amount: null,
        currency: 'PLN',
        date: null,
        merchant: null,
        items: [],
        vatNumber: null,
        category: 'Other',
        confidence: 0.1
      };
    }
  }

  // Parse date string to Date object
  parseDate(dateStr) {
    try {
      // Try different date formats
      const formats = [
        /(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/, // DD.MM.YYYY or DD/MM/YYYY
        /(\d{2,4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/, // YYYY.MM.DD or YYYY/MM/DD
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          let [, part1, part2, part3] = match;
          
          // Convert 2-digit years to 4-digit
          if (part3.length === 2) {
            part3 = '20' + part3;
          }
          if (part1.length === 2 && parseInt(part1) > 31) {
            part1 = '20' + part1;
          }

          // Try DD.MM.YYYY format first
          let date = new Date(part3, part2 - 1, part1);
          if (date.getFullYear() == part3 && date.getMonth() == part2 - 1 && date.getDate() == part1) {
            return date;
          }

          // Try YYYY.MM.DD format
          date = new Date(part1, part2 - 1, part3);
          if (date.getFullYear() == part1 && date.getMonth() == part2 - 1 && date.getDate() == part3) {
            return date;
          }
        }
      }

      // Fallback to Date.parse
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Categorize receipt based on merchant and items
  categorizeReceipt(merchant, items) {
    if (!merchant) return 'Other';

    const merchantLower = merchant.toLowerCase();
    
    // Restaurant/Food keywords
    if (merchantLower.includes('restaurant') || 
        merchantLower.includes('cafe') || 
        merchantLower.includes('bar') ||
        merchantLower.includes('pizza') ||
        merchantLower.includes('food') ||
        merchantLower.includes('bistro')) {
      return 'Meals & Entertainment';
    }

    // Gas station keywords
    if (merchantLower.includes('shell') || 
        merchantLower.includes('bp') || 
        merchantLower.includes('orlen') ||
        merchantLower.includes('lotos') ||
        merchantLower.includes('gas') ||
        merchantLower.includes('fuel')) {
      return 'Travel & Transportation';
    }

    // Office supplies
    if (merchantLower.includes('office') || 
        merchantLower.includes('staples') || 
        merchantLower.includes('depot') ||
        merchantLower.includes('supplies')) {
      return 'Office Supplies';
    }

    // Hotel/Accommodation
    if (merchantLower.includes('hotel') || 
        merchantLower.includes('inn') || 
        merchantLower.includes('resort') ||
        merchantLower.includes('accommodation')) {
      return 'Travel & Transportation';
    }

    // Check items for additional clues
    const itemDescriptions = items.map(item => item.description.toLowerCase()).join(' ');
    if (itemDescriptions.includes('fuel') || itemDescriptions.includes('gas')) {
      return 'Travel & Transportation';
    }
    if (itemDescriptions.includes('food') || itemDescriptions.includes('drink')) {
      return 'Meals & Entertainment';
    }

    return 'Other';
  }

  // Process uploaded document
  async processDocument(filePath, originalName) {
    try {
      console.log('Processing document:', originalName);
      
      // Extract text using OCR
      const ocrResult = await this.extractText(filePath);
      
      if (!ocrResult.success) {
        return {
          success: false,
          error: 'OCR processing failed',
          extractedData: null
        };
      }

      // Parse receipt data
      const receiptData = this.parseReceiptData(ocrResult.text);
      
      return {
        success: true,
        extractedText: ocrResult.text,
        extractedData: receiptData,
        confidence: receiptData.confidence,
        processingTime: Date.now()
      };
    } catch (error) {
      console.error('Document processing error:', error);
      return {
        success: false,
        error: error.message,
        extractedData: null
      };
    }
  }

  // Validate extracted data
  validateExtractedData(data) {
    const issues = [];
    
    if (!data.amount || data.amount <= 0) {
      issues.push('Amount not found or invalid');
    }
    
    if (!data.date) {
      issues.push('Date not found');
    } else {
      const date = new Date(data.date);
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      if (date > now) {
        issues.push('Date is in the future');
      } else if (date < oneYearAgo) {
        issues.push('Date is more than one year old');
      }
    }
    
    if (!data.merchant || data.merchant.length < 3) {
      issues.push('Merchant name not found or too short');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      confidence: data.confidence
    };
  }
}

module.exports = new OCRService(); 