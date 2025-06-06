# AI-Powered Document Processing System

## Overview

ExpenseFlow Pro features a comprehensive AI-powered document processing system that can extract key data from expense documents (receipts, invoices, bank statements) with high accuracy using OCR technology and machine learning algorithms.

## Features

### 🎯 Core Capabilities
- **Multi-format Support**: PDF, JPG, PNG file uploads with local storage
- **Dual OCR Processing**: Client-side (Tesseract.js) and server-side (node-tesseract) processing
- **Alternative Processing**: PDF text extraction (pdf-parse) and image preprocessing (Jimp)
- **High Accuracy**: Targets 95% accuracy for key fields extraction
- **Confidence Scoring**: Custom algorithms for reliability assessment
- **Fallback System**: Low-confidence extractions routed for human review

### 📊 Data Extraction
- **Amount**: Currency values with proper formatting
- **Date**: Multiple date formats support
- **Vendor Name**: Company/merchant identification
- **Tax ID**: Various tax identification formats
- **VAT Amount**: Tax calculations
- **Account Numbers**: Banking information extraction

### 🌐 Language & Currency Support
- **Languages**: English (primary), with extensibility for other languages
- **Currencies**: USD, EUR, GBP with proper formatting and conversion

### 🔄 Processing Pipeline
- **Real-time Processing**: Client-side OCR for immediate feedback
- **Queue System**: Server-side batch processing with Redis/Bull
- **Progress Tracking**: Real-time status updates and progress indicators
- **Error Handling**: Comprehensive error recovery and retry mechanisms

## Architecture

### Backend Components

#### 1. Document Processor (`src/services/documentProcessor.js`)
- **Image Preprocessing**: Jimp-based image enhancement for better OCR
- **PDF Processing**: pdf2pic conversion and pdf-parse text extraction
- **OCR Engine**: node-tesseract integration with confidence scoring
- **Data Extraction**: Regex-based pattern matching and NLP processing
- **File Organization**: Structured storage with preview generation

#### 2. Queue Service (`src/services/documentQueue.js`)
- **Batch Processing**: Bull queue management for multiple documents
- **Priority Handling**: Configurable processing priorities
- **Status Tracking**: Real-time job progress and completion status
- **Auto-categorization**: Intelligent expense category assignment
- **Error Recovery**: Automatic retry mechanisms with exponential backoff

#### 3. API Routes (`src/routes/documents.js`)
- **Upload Endpoints**: Single and batch document upload
- **Processing Status**: Real-time status checking and updates
- **Document Management**: CRUD operations with access control
- **Queue Statistics**: Processing metrics and performance monitoring

### Frontend Components

#### 1. OCR Service (`frontend/src/services/ocrService.ts`)
- **Tesseract.js Integration**: Client-side OCR processing
- **Image Preprocessing**: Canvas-based image enhancement
- **Confidence Calculation**: Multi-factor confidence scoring
- **Progress Callbacks**: Real-time processing updates

#### 2. Document Service (`frontend/src/services/documentService.ts`)
- **API Communication**: Comprehensive backend integration
- **File Validation**: Client-side validation and error handling
- **Status Polling**: Automatic status updates for processing documents
- **Utility Functions**: Formatting, validation, and helper methods

#### 3. Upload Component (`frontend/src/components/documents/DocumentUpload.tsx`)
- **Drag & Drop**: Intuitive file upload interface
- **Camera Integration**: Mobile-friendly camera capture
- **Real-time OCR**: Client-side processing with progress tracking
- **Batch Support**: Multiple file handling with individual status

#### 4. Management Interface (`frontend/src/app/dashboard/documents/page.tsx`)
- **Document List**: Comprehensive document management
- **Processing Status**: Real-time status updates and queue statistics
- **Review Interface**: Human-in-the-loop verification system
- **Filtering & Search**: Advanced document filtering and search

## Installation & Setup

### Backend Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Install System Dependencies**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tesseract-ocr libtesseract-dev

# macOS
brew install tesseract

# Docker (recommended)
docker pull tesseractshadow/tesseract4re
```

3. **Configure Environment**
```bash
cp env.example .env
```

4. **Update Environment Variables**
```env
# Document Processing
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANG=eng
PDF_TO_IMAGE_DENSITY=300
IMAGE_PREPROCESSING=true
PROCESSING_TIMEOUT=300000

# Queue Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
BULL_QUEUE_PREFIX=expense_flow
QUEUE_CONCURRENCY=3
```

5. **Start Services**
```bash
# Start Redis (required for queue)
docker run -d -p 6379:6379 redis:alpine

# Start API server
npm run dev
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env.local
```

3. **Update Environment Variables**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_CLIENT_OCR=true
NEXT_PUBLIC_MAX_FILE_SIZE=52428800
```

4. **Start Development Server**
```bash
npm run dev
```

## Usage Guide

### Document Upload

#### Single Document Upload
```typescript
import { documentService } from '../services/documentService';

const result = await documentService.uploadDocument(file, {
  documentType: 'receipt',
  description: 'Lunch receipt',
  processingPriority: 5
});

console.log('Job ID:', result.data.processing.jobId);
```

#### Batch Upload
```typescript
const result = await documentService.uploadBatch(files, {
  documentType: 'invoice',
  batchDescription: 'Monthly invoices'
});

console.log('Batch ID:', result.data.batch.batchId);
```

### Client-side OCR Processing
```typescript
import { ocrService } from '../services/ocrService';

await ocrService.initialize();

const result = await ocrService.processFile(file, (progress) => {
  console.log(`${progress.stage}: ${progress.progress}%`);
});

console.log('Extracted data:', result.extractedData);
console.log('Confidence:', result.overallConfidence);
```

### Server-side Processing
```javascript
const DocumentProcessor = require('./src/services/documentProcessor');
const processor = new DocumentProcessor();

const result = await processor.processDocument(
  filePath,
  originalName,
  'receipt'
);

console.log('OCR Results:', result.extractedData);
console.log('Requires Review:', result.requiresReview);
```

### Queue Management
```javascript
const DocumentQueueService = require('./src/services/documentQueue');
const queue = new DocumentQueueService();

// Add to queue
const job = await queue.addDocumentToQueue({
  documentId: 'doc-123',
  filePath: '/uploads/receipt.jpg',
  userId: 'user-456',
  companyId: 'company-789'
});

// Check status
const status = await queue.getJobStatus(job.jobId);
console.log('Status:', status.status);
```

## Configuration

### OCR Configuration
```javascript
// Client-side (Tesseract.js)
const ocrConfig = {
  lang: 'eng',
  oem: 1,
  psm: 3,
  tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:-/$ €£'
};

// Server-side (node-tesseract)
const serverConfig = {
  binary: '/usr/bin/tesseract',
  options: {
    l: 'eng',
    psm: 6,
    oem: 3
  }
};
```

### Confidence Thresholds
```javascript
const confidenceThresholds = {
  amount: 0.8,      // High confidence required for amounts
  date: 0.7,        // Medium confidence for dates
  vendor: 0.6,      // Lower confidence for vendor names
  taxId: 0.8,       // High confidence for tax IDs
  vatAmount: 0.7,   // Medium confidence for VAT
  accountNumber: 0.8 // High confidence for account numbers
};
```

### File Processing Limits
```javascript
const processingLimits = {
  maxFileSize: 50 * 1024 * 1024,  // 50MB
  maxBatchSize: 10,               // 10 files per batch
  allowedTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ],
  processingTimeout: 300000        // 5 minutes
};
```

## API Reference

### Upload Endpoints

#### POST `/api/v1/documents/upload`
Upload single document for processing.

**Request:**
```javascript
FormData {
  document: File,
  documentType?: 'receipt' | 'invoice' | 'statement' | 'bank_statement' | 'other',
  description?: string,
  processingPriority?: number (0-10)
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    document: {
      id: string,
      filename: string,
      originalName: string,
      status: 'queued'
    },
    processing: {
      jobId: string,
      estimatedProcessingTime: number
    }
  }
}
```

#### POST `/api/v1/documents/upload/batch`
Upload multiple documents for batch processing.

**Request:**
```javascript
FormData {
  documents: File[],
  documentType?: string,
  batchDescription?: string
}
```

### Status Endpoints

#### GET `/api/v1/documents/:id/status`
Get processing status for a document.

**Response:**
```javascript
{
  success: true,
  data: {
    document: {
      id: string,
      status: 'queued' | 'processing' | 'completed' | 'failed',
      ocrConfidence?: number,
      requiresReview: boolean
    },
    processing?: {
      jobId: string,
      status: string,
      progress: number
    }
  }
}
```

#### GET `/api/v1/documents/queue/stats`
Get queue processing statistics.

**Response:**
```javascript
{
  success: true,
  data: {
    stats: {
      waiting: number,
      active: number,
      completed: number,
      failed: number,
      total: number
    }
  }
}
```

## Performance Optimization

### Client-side Optimization
1. **Image Preprocessing**: Automatic image enhancement before OCR
2. **Progressive Processing**: Show results as they become available
3. **Caching**: Cache OCR workers for better performance
4. **Batch Processing**: Process multiple files efficiently

### Server-side Optimization
1. **Queue Management**: Prioritized processing with concurrency control
2. **File Organization**: Structured storage with preview generation
3. **Cleanup**: Automatic cleanup of temporary files
4. **Monitoring**: Performance metrics and error tracking

### Performance Targets
- **Processing Time**: < 30 seconds per document
- **Accuracy**: 95% for key fields (amount, date, vendor)
- **Throughput**: 100+ documents per hour
- **Availability**: 99.9% uptime

## Error Handling

### Common Error Types
1. **File Validation Errors**: Invalid format, size limits
2. **OCR Processing Errors**: Poor image quality, unsupported content
3. **Queue Errors**: Redis connection, job failures
4. **Network Errors**: Upload failures, timeout issues

### Error Recovery
1. **Automatic Retry**: Exponential backoff for transient failures
2. **Fallback Processing**: Alternative OCR methods
3. **Human Review**: Low-confidence results flagged for manual review
4. **Error Reporting**: Comprehensive logging and monitoring

### Monitoring & Alerts
```javascript
// Queue monitoring
const stats = await queue.getQueueStats();
if (stats.failed > stats.completed * 0.1) {
  // Alert: High failure rate
}

// Processing time monitoring
if (processingTime > 60000) {
  // Alert: Slow processing
}

// Confidence monitoring
if (averageConfidence < 0.7) {
  // Alert: Low accuracy
}
```

## Security Considerations

### File Security
1. **Validation**: Strict file type and size validation
2. **Scanning**: Malware scanning for uploaded files
3. **Isolation**: Sandboxed processing environment
4. **Access Control**: Company-based file isolation

### Data Protection
1. **Encryption**: Encrypted file storage
2. **GDPR Compliance**: Data retention and deletion policies
3. **Audit Logging**: Complete processing audit trail
4. **Privacy**: No external API calls for sensitive data

### Authentication & Authorization
1. **JWT Tokens**: Secure API authentication
2. **Role-based Access**: Admin, manager, employee permissions
3. **Company Isolation**: Multi-tenant data separation
4. **Rate Limiting**: API abuse prevention

## Troubleshooting

### Common Issues

#### OCR Not Working
```bash
# Check Tesseract installation
tesseract --version

# Test OCR manually
tesseract input.jpg output.txt

# Check permissions
ls -la /usr/bin/tesseract
```

#### Queue Not Processing
```bash
# Check Redis connection
redis-cli ping

# Check queue status
curl http://localhost:3000/api/v1/documents/queue/stats

# Restart queue workers
pm2 restart queue-worker
```

#### Low Accuracy
1. **Image Quality**: Ensure high-resolution, clear images
2. **Preprocessing**: Enable image enhancement
3. **Language**: Configure correct OCR language
4. **Patterns**: Update extraction patterns for your document types

#### Performance Issues
1. **Concurrency**: Adjust queue concurrency settings
2. **Memory**: Monitor memory usage during processing
3. **Storage**: Ensure sufficient disk space
4. **Network**: Check upload/download speeds

### Debug Mode
```bash
# Enable debug logging
export DEBUG=expense-flow:*
export LOG_LEVEL=debug

# Start with debug
npm run dev
```

### Log Analysis
```bash
# Check processing logs
tail -f logs/app.log | grep "OCR"

# Check error logs
grep "ERROR" logs/app.log | tail -20

# Monitor queue
redis-cli monitor | grep "expense_flow"
```

## Future Enhancements

### Planned Features
1. **Advanced OCR**: Integration with cloud OCR services (AWS Textract, Google Vision)
2. **Machine Learning**: Custom ML models for better accuracy
3. **Multi-language**: Support for additional languages
4. **Real-time Processing**: WebSocket-based real-time updates
5. **Smart Categorization**: AI-powered expense categorization

### Integration Possibilities
1. **Cloud Storage**: AWS S3, Google Cloud Storage integration
2. **External OCR**: Azure Cognitive Services, AWS Textract
3. **Accounting Software**: QuickBooks, Xero integration
4. **Mobile Apps**: React Native OCR capabilities

## Support

### Documentation
- [API Documentation](./API_DOCS.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time community support
- **Email**: support@expenseflow-pro.com

### Professional Support
- **Priority Support**: 24/7 support for enterprise customers
- **Custom Development**: Tailored OCR solutions
- **Training**: Team training and onboarding
- **Consulting**: Implementation and optimization consulting

---

**ExpenseFlow Pro** - Making expense management intelligent and effortless with AI-powered document processing. 