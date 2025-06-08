const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class OllamaLLaVAOCRService {
  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'llava:latest';
    this.uploadsDir = path.join(__dirname, 'uploads');
    this.confidenceThreshold = 0.8;
    
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    
    this.setupPrompts();
  }

  setupPrompts() {
    this.receiptPrompt = `
Analyze this Polish receipt/invoice image and extract data in JSON format. Focus on accuracy for business expense management.

REQUIRED JSON STRUCTURE:
{
  "document_type": "receipt" or "invoice" or "bank_statement",
  "total_amount": number,
  "currency": "PLN" or "EUR" or "USD",
  "transaction_date": "YYYY-MM-DD",
  "merchant_name": "string",
  "nip_number": "string",
  "vat_amount": number,
  "confidence_score": 0.0-1.0,
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "total_price": number
    }
  ],
  "payment_method": "cash" or "card" or "transfer",
  "category_suggestion": "string"
}

IMPORTANT GUIDELINES:
- Extract amounts using Polish format (comma as decimal separator)
- Look for keywords: "PARAGON FISKALNY", "FAKTURA VAT", "SUMA", "RAZEM", "DO ZAPŁATY"
- NIP format: 10 digits, may have hyphens
- Date formats: DD.MM.YYYY, DD/MM/YY, DD-MM-YYYY
- Be conservative with confidence scores

Return ONLY valid JSON, no additional text.`;

    this.invoicePrompt = `
Analyze this Polish business invoice and extract structured data for accounting purposes.

REQUIRED JSON STRUCTURE:
{
  "document_type": "invoice",
  "invoice_number": "string",
  "issue_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "total_amount": number,
  "net_amount": number,
  "vat_amount": number,
  "currency": "PLN" or "EUR" or "USD",
  "seller": {
    "name": "string",
    "nip": "string",
    "address": "string",
    "bank_account": "string"
  },
  "buyer": {
    "name": "string", 
    "nip": "string",
    "address": "string"
  },
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "net_amount": number,
      "vat_rate": number,
      "vat_amount": number,
      "gross_amount": number
    }
  ],
  "payment_method": "string",
  "payment_deadline": "YYYY-MM-DD",
  "confidence_score": 0.0-1.0
}

Polish invoice keywords: "FAKTURA VAT", "SPRZEDAWCA", "NABYWCA", "STAWKA VAT", "KWOTA NETTO", "KWOTA BRUTTO"
Return ONLY valid JSON.`;

    this.bankStatementPrompt = `
Analyze this Polish bank statement and extract transaction data.

REQUIRED JSON STRUCTURE:
{
  "document_type": "bank_statement",
  "account_number": "string",
  "statement_period": {
    "from": "YYYY-MM-DD",
    "to": "YYYY-MM-DD"
  },
  "opening_balance": number,
  "closing_balance": number,
  "currency": "PLN" or "EUR" or "USD",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "type": "debit" or "credit",
      "balance": number,
      "counterparty": "string",
      "reference": "string"
    }
  ],
  "confidence_score": 0.0-1.0
}

Polish bank keywords: "WYCIĄG", "SALDO", "WPŁATA", "WYPŁATA", "PRZELEW", "RACHUNEK"
Return ONLY valid JSON.`;
  }

  async preprocessImage(imagePath) {
    try {
      const processedPath = imagePath.replace(/\.(jpg|jpeg|png|pdf)$/i, '_processed.png');
      
      await sharp(imagePath)
        .resize(2048, 2048, { 
          fit: 'inside',
          withoutEnlargement: true
        })
        .normalize()
        .sharpen({ sigma: 1, flat: 1, jagged: 2 })
        .modulate({ brightness: 1.1, contrast: 1.2 })
        .png({ quality: 95 })
        .toFile(processedPath);

      return processedPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return imagePath;
    }
  }

  async imageToBase64(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  }

  async callOllamaLLaVA(imageBase64, prompt) {
    try {
      const response = await axios.post(`${this.ollamaHost}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        images: [imageBase64],
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_ctx: 4096
        }
      }, {
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data.response;
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Ollama API call failed: ${error.message}`);
    }
  }

  parseJSON(jsonString) {
    try {
      let cleanJson = jsonString
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const jsonStart = cleanJson.indexOf('{');
      const jsonEnd = cleanJson.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanJson = cleanJson.substring(jsonStart, jsonEnd);
      }

      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error('Failed to parse JSON response from LLaVA');
    }
  }

  determineDocumentType(imagePath) {
    const filename = path.basename(imagePath).toLowerCase();
    
    if (filename.includes('wyciag') || filename.includes('statement')) {
      return 'bank_statement';
    }
    if (filename.includes('faktura') || filename.includes('invoice')) {
      return 'invoice';
    }
    return 'receipt'; // default
  }

  getPromptForDocumentType(documentType) {
    switch (documentType) {
      case 'invoice':
        return this.invoicePrompt;
      case 'bank_statement':
        return this.bankStatementPrompt;
      default:
        return this.receiptPrompt;
    }
  }

  async extractData(imagePath) {
    try {
      console.log('🤖 Starting Ollama LLaVA processing for:', imagePath);
      
      const processedPath = await this.preprocessImage(imagePath);
      const imageBase64 = await this.imageToBase64(processedPath);
      
      const response = await this.callOllamaLLaVA(imageBase64, this.receiptPrompt);
      const extractedData = this.parseJSON(response);
      const validatedData = this.validateAndEnhanceData(extractedData);
      
      if (processedPath !== imagePath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }
      
      console.log('✅ LLaVA processing completed successfully');
      return {
        success: true,
        data: validatedData,
        confidence: validatedData.confidence_score || 0.8
      };
      
    } catch (error) {
      console.error('❌ LLaVA processing error:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        confidence: 0
      };
    }
  }

  validateAndEnhanceData(data) {
    try {
      const validated = {
        document_type: data.document_type || 'receipt',
        total_amount: this.validateAmount(data.total_amount),
        currency: data.currency || 'PLN',
        transaction_date: this.validateDate(data.transaction_date),
        merchant_name: data.merchant_name || null,
        nip_number: this.validateNIP(data.nip_number),
        vat_amount: this.validateAmount(data.vat_amount),
        items: data.items || [],
        payment_method: data.payment_method,
        category_suggestion: data.category_suggestion,
        confidence_score: Math.max(0, Math.min(1, data.confidence_score || 0.8))
      };

      validated.confidence_score = this.calculateConfidenceScore(validated);
      return validated;
    } catch (error) {
      console.error('Data validation error:', error);
      return data;
    }
  }

  validateAmount(amount) {
    if (typeof amount === 'string') {
      amount = amount.replace(',', '.');
    }
    const parsed = parseFloat(amount);
    return (!isNaN(parsed) && parsed >= 0) ? parsed : null;
  }

  validateDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        const polishFormat = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (polishFormat) {
          const [, day, month, year] = polishFormat;
          const newDate = new Date(year, month - 1, day);
          return newDate.toISOString().split('T')[0];
        }
        return null;
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }

  validateNIP(nip) {
    if (!nip) return null;
    const cleanNIP = nip.replace(/[\s\-]/g, '');
    if (/^\d{10}$/.test(cleanNIP)) {
      return cleanNIP;
    }
    return null;
  }

  calculateConfidenceScore(data) {
    let score = 0.5;
    if (data.total_amount !== null) score += 0.2;
    if (data.transaction_date !== null) score += 0.1;
    if (data.merchant_name) score += 0.1;
    if (data.nip_number) score += 0.05;
    if (data.vat_amount !== null) score += 0.05;
    if (data.items?.length > 0) score += 0.1;
    return Math.min(1.0, score);
  }

  async processDocument(filePath, originalName) {
    try {
      console.log('📄 Processing document with Ollama LLaVA:', originalName);
      
      const result = await this.extractData(filePath);
      
      if (result.success) {
        return {
          success: true,
          extractedData: result.data,
          confidence: result.confidence,
          processingMethod: 'ollama-llava',
          originalName,
          processedAt: new Date().toISOString()
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Document processing error:', error);
      return {
        success: false,
        error: error.message,
        extractedData: null,
        confidence: 0,
        processingMethod: 'ollama-llava',
        originalName
      };
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.ollamaHost}/api/tags`, {
        timeout: 5000
      });
      
      const hasLLaVA = response.data.models?.some(model => 
        model.name.includes('llava')
      );
      
      return {
        connected: true,
        host: this.ollamaHost,
        models: response.data.models?.map(m => m.name) || [],
        hasLLaVA
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        host: this.ollamaHost
      };
    }
  }
}

module.exports = OllamaLLaVAOCRService; 