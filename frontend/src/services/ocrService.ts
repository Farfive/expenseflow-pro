import Tesseract, { createWorker, createScheduler } from 'tesseract.js';
import Jimp from 'jimp';
import { PDFDocument } from 'pdf-lib';
import stringSimilarity from 'string-similarity';
import currency from 'currency.js';
import { format, parse, isValid } from 'date-fns';
import compromise from 'compromise';

export interface OCRResult {
  text: string;
  confidence: number;
  extractedData: ExtractedData;
  confidenceScores: ConfidenceScores;
  overallConfidence: number;
  requiresReview: boolean;
  processingTime: number;
}

export interface ExtractedData {
  amount: number | null;
  currency: string | null;
  date: string | null;
  vendor: string | null;
  taxId: string | null;
  vatAmount: number | null;
  accountNumber: string | null;
}

export interface ConfidenceScores {
  amount: number;
  date: number;
  vendor: number;
  taxId: number;
  vatAmount: number;
  accountNumber: number;
}

export interface ProcessingProgress {
  stage: 'initializing' | 'preprocessing' | 'ocr' | 'extraction' | 'completed';
  progress: number;
  message: string;
}

export class OCRService {
  private worker: Tesseract.Worker | null = null;
  private scheduler: Tesseract.Scheduler | null = null;
  private isInitialized = false;
  private readonly patterns: Record<string, RegExp[]>;
  private readonly confidenceThresholds: Record<string, number>;

  constructor() {
    this.patterns = this.initializePatterns();
    this.confidenceThresholds = {
      amount: 0.8,
      date: 0.7,
      vendor: 0.6,
      taxId: 0.8,
      vatAmount: 0.7,
      accountNumber: 0.8,
    };
  }

  /**
   * Initialize OCR worker
   */
  async initialize(progressCallback?: (progress: ProcessingProgress) => void): Promise<void> {
    if (this.isInitialized) return;

    try {
      progressCallback?.({
        stage: 'initializing',
        progress: 0,
        message: 'Initializing OCR engine...',
      });

      // Create worker with improved configuration
      this.worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            progressCallback?.({
              stage: 'ocr',
              progress: Math.round(m.progress * 100),
              message: `Processing text recognition: ${Math.round(m.progress * 100)}%`,
            });
          }
        },
      });

      // Configure worker for better accuracy
      await this.worker.setParameters({
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:-/$ €£@#',
        preserve_interword_spaces: '1',
      });

      this.isInitialized = true;

      progressCallback?.({
        stage: 'initializing',
        progress: 100,
        message: 'OCR engine initialized successfully',
      });
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw new Error('Failed to initialize OCR engine');
    }
  }

  /**
   * Process file for OCR
   */
  async processFile(
    file: File,
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      if (!this.isInitialized) {
        await this.initialize(progressCallback);
      }

      progressCallback?.({
        stage: 'preprocessing',
        progress: 0,
        message: 'Preprocessing file...',
      });

      let imageData: string | Buffer;

      // Handle different file types
      if (file.type === 'application/pdf') {
        imageData = await this.processPDF(file, progressCallback);
      } else if (file.type.startsWith('image/')) {
        imageData = await this.preprocessImage(file, progressCallback);
      } else {
        throw new Error('Unsupported file type');
      }

      progressCallback?.({
        stage: 'preprocessing',
        progress: 100,
        message: 'Preprocessing completed',
      });

      // Perform OCR
      progressCallback?.({
        stage: 'ocr',
        progress: 0,
        message: 'Starting text recognition...',
      });

      const ocrResult = await this.worker!.recognize(imageData);

      progressCallback?.({
        stage: 'extraction',
        progress: 0,
        message: 'Extracting data fields...',
      });

      // Extract structured data
      const extractedData = this.extractStructuredData(ocrResult.data.text);
      const confidenceScores = this.calculateConfidenceScores(extractedData, ocrResult.data.text);
      const overallConfidence = this.calculateOverallConfidence(confidenceScores);
      const requiresReview = this.requiresHumanReview(confidenceScores);

      progressCallback?.({
        stage: 'completed',
        progress: 100,
        message: 'Processing completed successfully',
      });

      return {
        text: ocrResult.data.text,
        confidence: ocrResult.data.confidence,
        extractedData,
        confidenceScores,
        overallConfidence,
        requiresReview,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Process PDF file
   */
  private async processPDF(
    file: File,
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      if (pages.length === 0) {
        throw new Error('PDF has no pages');
      }

      // For now, we'll use the canvas rendering approach
      // In a production environment, you might want to use pdf2pic or similar
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }

        // This is a simplified approach - in production you'd want to use
        // a proper PDF to canvas library like pdf.js
        canvas.width = 800;
        canvas.height = 1000;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.fillText('PDF processing requires server-side conversion', 50, 50);
        
        resolve(canvas.toDataURL());
      });
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw error;
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  private async preprocessImage(
    file: File,
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            
            // Use Jimp for image preprocessing
            const image = await Jimp.read(Buffer.from(arrayBuffer));
            
            // Image preprocessing pipeline
            await image
              .greyscale()
              .normalize()
              .contrast(0.5)
              .brightness(0.1);

            // Convert back to base64
            const base64 = await image.getBase64Async(Jimp.MIME_PNG);
            resolve(base64);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      throw error;
    }
  }

  /**
   * Initialize regex patterns for data extraction
   */
  private initializePatterns(): Record<string, RegExp[]> {
    return {
      amount: [
        /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*\$/g,
        /€\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*€/g,
        /£\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*£/g,
        /(?:total|amount|sum|grand total|subtotal)[\s:]*\$?€?£?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      ],
      
      date: [
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
        /(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{2,4}/gi,
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{2,4}/gi,
        /(?:date|issued|created)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
      ],
      
      vendor: [
        /(?:invoice from|bill from|paid to|vendor|company|business)[\s:]+([A-Za-z0-9\s,.-]+?)(?:\n|$|tel|phone|address)/gi,
        /^([A-Z][A-Za-z0-9\s&,.-]{2,50})(?:\n|address|tel|phone|fax)/gm,
        /([A-Z][A-Za-z0-9\s&,.-]{5,})\s*(?:inc|corp|ltd|llc|co|company|corporation|limited)/gi,
      ],
      
      taxId: [
        /(?:tax id|ein|ssn|vat|gst)[\s:]*([A-Z0-9\-]{6,15})/gi,
        /(?:federal id|employer id)[\s:]*([0-9\-]{9,12})/gi,
        /\b([0-9]{2}-[0-9]{7})\b/g,
        /\b([0-9]{3}-[0-9]{2}-[0-9]{4})\b/g,
      ],
      
      vatAmount: [
        /(?:vat|tax|sales tax)[\s:]*\$?€?£?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:vat|tax)/gi,
      ],
      
      accountNumber: [
        /(?:account|acct|acc)[\s#:]*([0-9\-]{8,20})/gi,
        /(?:routing|sort code)[\s:]*([0-9\-]{6,12})/gi,
        /\b([0-9]{4}\s*[0-9]{4}\s*[0-9]{4}\s*[0-9]{4})\b/g,
      ],
    };
  }

  /**
   * Extract structured data from OCR text
   */
  private extractStructuredData(text: string): ExtractedData {
    return {
      amount: this.extractAmount(text),
      currency: this.extractCurrency(text),
      date: this.extractDate(text),
      vendor: this.extractVendor(text),
      taxId: this.extractTaxId(text),
      vatAmount: this.extractVatAmount(text),
      accountNumber: this.extractAccountNumber(text),
    };
  }

  /**
   * Extract amount from text
   */
  private extractAmount(text: string): number | null {
    const amounts: number[] = [];
    
    for (const pattern of this.patterns.amount) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        try {
          const amountStr = match[1] || match[0];
          const cleanAmount = amountStr.replace(/[^0-9.,]/g, '');
          const value = parseFloat(cleanAmount.replace(/,/g, ''));
          
          if (!isNaN(value) && value > 0) {
            amounts.push(value);
          }
        } catch (error) {
          // Continue with next match
        }
      }
    }
    
    // Return the largest amount found
    return amounts.length > 0 ? Math.max(...amounts) : null;
  }

  /**
   * Extract currency from text
   */
  private extractCurrency(text: string): string | null {
    if (text.includes('€')) return 'EUR';
    if (text.includes('£')) return 'GBP';
    if (text.includes('$')) return 'USD';
    return null;
  }

  /**
   * Extract date from text
   */
  private extractDate(text: string): string | null {
    for (const pattern of this.patterns.date) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        try {
          const dateStr = match[1] || match[0];
          const parsedDate = this.parseDate(dateStr);
          if (parsedDate && isValid(parsedDate)) {
            return format(parsedDate, 'yyyy-MM-dd');
          }
        } catch (error) {
          // Continue with next match
        }
      }
    }
    return null;
  }

  /**
   * Parse various date formats
   */
  private parseDate(dateStr: string): Date | null {
    const formats = [
      'MM/dd/yyyy',
      'dd/MM/yyyy',
      'yyyy-MM-dd',
      'yyyy/MM/dd',
      'dd-MM-yyyy',
      'MM-dd-yyyy',
      'MMMM d, yyyy',
      'MMM d, yyyy',
      'd MMMM yyyy',
    ];

    for (const formatStr of formats) {
      try {
        const parsed = parse(dateStr, formatStr, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (error) {
        // Continue with next format
      }
    }

    return null;
  }

  /**
   * Extract vendor name from text
   */
  private extractVendor(text: string): string | null {
    for (const pattern of this.patterns.vendor) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const vendor = (match[1] || match[0]).trim();
        if (vendor.length > 2 && vendor.length < 100) {
          return this.cleanVendorName(vendor);
        }
      }
    }
    
    // Fallback: try to find company-like text at beginning of document
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 5 && line.length < 80 && /[A-Z]/.test(line)) {
        return this.cleanVendorName(line);
      }
    }
    
    return null;
  }

  /**
   * Clean vendor name
   */
  private cleanVendorName(vendor: string): string {
    return vendor
      .replace(/[^\w\s&,.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract tax ID from text
   */
  private extractTaxId(text: string): string | null {
    for (const pattern of this.patterns.taxId) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const taxId = (match[1] || match[0]).trim();
        if (taxId.length >= 6) {
          return taxId;
        }
      }
    }
    return null;
  }

  /**
   * Extract VAT amount from text
   */
  private extractVatAmount(text: string): number | null {
    for (const pattern of this.patterns.vatAmount) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        try {
          const amountStr = match[1] || match[0];
          const cleanAmount = amountStr.replace(/[^0-9.,]/g, '');
          const value = parseFloat(cleanAmount.replace(/,/g, ''));
          
          if (!isNaN(value) && value > 0) {
            return value;
          }
        } catch (error) {
          // Continue with next match
        }
      }
    }
    return null;
  }

  /**
   * Extract account number from text
   */
  private extractAccountNumber(text: string): string | null {
    for (const pattern of this.patterns.accountNumber) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const accountNumber = (match[1] || match[0]).trim();
        if (accountNumber.length >= 8) {
          return accountNumber;
        }
      }
    }
    return null;
  }

  /**
   * Calculate confidence scores for extracted data
   */
  private calculateConfidenceScores(extractedData: ExtractedData, originalText: string): ConfidenceScores {
    return {
      amount: this.calculateAmountConfidence(extractedData.amount, originalText),
      date: this.calculateDateConfidence(extractedData.date, originalText),
      vendor: this.calculateVendorConfidence(extractedData.vendor, originalText),
      taxId: this.calculateTaxIdConfidence(extractedData.taxId, originalText),
      vatAmount: this.calculateVatAmountConfidence(extractedData.vatAmount, originalText),
      accountNumber: this.calculateAccountNumberConfidence(extractedData.accountNumber, originalText),
    };
  }

  /**
   * Calculate amount confidence
   */
  private calculateAmountConfidence(amount: number | null, text: string): number {
    if (!amount) return 0;
    
    let confidence = 0.5;
    
    const currencyRegex = /[\$€£]\s*\d+[.,]\d{2}|\d+[.,]\d{2}\s*[\$€£]/g;
    if (currencyRegex.test(text)) confidence += 0.3;
    
    const totalRegex = /(?:total|amount|sum|grand total|subtotal)/gi;
    if (totalRegex.test(text)) confidence += 0.2;
    
    if (amount.toString().includes('.')) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate date confidence
   */
  private calculateDateConfidence(date: string | null, text: string): number {
    if (!date) return 0;
    
    let confidence = 0.4;
    
    const dateKeywords = /(?:date|issued|created|invoice date)/gi;
    if (dateKeywords.test(text)) confidence += 0.3;
    
    const parsedDate = new Date(date);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    if (parsedDate >= twoYearsAgo && parsedDate <= new Date()) {
      confidence += 0.3;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate vendor confidence
   */
  private calculateVendorConfidence(vendor: string | null, text: string): number {
    if (!vendor) return 0;
    
    let confidence = 0.3;
    
    if (vendor.length >= 5 && vendor.length <= 50) confidence += 0.2;
    
    const companyIndicators = /(?:inc|corp|ltd|llc|co|company|corporation|limited)/gi;
    if (companyIndicators.test(vendor)) confidence += 0.3;
    
    const lines = text.split('\n');
    const firstFiveLines = lines.slice(0, 5).join('\n');
    if (firstFiveLines.toLowerCase().includes(vendor.toLowerCase())) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate tax ID confidence
   */
  private calculateTaxIdConfidence(taxId: string | null, text: string): number {
    if (!taxId) return 0;
    
    let confidence = 0.4;
    
    if (/^\d{2}-\d{7}$/.test(taxId)) confidence += 0.4;
    if (/^\d{3}-\d{2}-\d{4}$/.test(taxId)) confidence += 0.4;
    
    const taxKeywords = /(?:tax id|ein|federal id|employer id)/gi;
    if (taxKeywords.test(text)) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate VAT amount confidence
   */
  private calculateVatAmountConfidence(vatAmount: number | null, text: string): number {
    if (!vatAmount) return 0;
    
    let confidence = 0.4;
    
    const vatKeywords = /(?:vat|tax|sales tax)/gi;
    if (vatKeywords.test(text)) confidence += 0.4;
    
    confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate account number confidence
   */
  private calculateAccountNumberConfidence(accountNumber: string | null, text: string): number {
    if (!accountNumber) return 0;
    
    let confidence = 0.3;
    
    if (accountNumber.length >= 8 && accountNumber.length <= 20) confidence += 0.3;
    
    const accountKeywords = /(?:account|acct|routing|sort code)/gi;
    if (accountKeywords.test(text)) confidence += 0.4;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(confidenceScores: ConfidenceScores): number {
    const scores = Object.values(confidenceScores).filter(score => score > 0);
    if (scores.length === 0) return 0;
    
    const weights = {
      amount: 0.3,
      date: 0.2,
      vendor: 0.2,
      taxId: 0.1,
      vatAmount: 0.1,
      accountNumber: 0.1,
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [field, score] of Object.entries(confidenceScores)) {
      if (score > 0) {
        totalScore += score * (weights[field as keyof typeof weights] || 0.1);
        totalWeight += weights[field as keyof typeof weights] || 0.1;
      }
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Determine if human review is required
   */
  private requiresHumanReview(confidenceScores: ConfidenceScores): boolean {
    for (const [field, score] of Object.entries(confidenceScores)) {
      const threshold = this.confidenceThresholds[field] || 0.6;
      if (score > 0 && score < threshold) {
        return true;
      }
    }
    
    if (confidenceScores.amount === 0 || confidenceScores.vendor === 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }
      
      if (this.scheduler) {
        await this.scheduler.terminate();
        this.scheduler = null;
      }
      
      this.isInitialized = false;
    } catch (error) {
      console.error('Error during OCR cleanup:', error);
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService(); 