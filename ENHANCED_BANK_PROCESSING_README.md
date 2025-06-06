# Enhanced Bank Statement Processing System

## Overview

A comprehensive bank statement processing system that supports multiple formats including PDF table extraction, OCR for scanned documents, QIF/OFX financial formats, credit card statements, and foreign currency transactions with automatic conversion.

## 🌟 Enhanced Features

### Multi-Format Support
- **PDF Statements** - Table extraction using tabula-js, pdf2table, and pdf-table-extractor
- **Image-Based Statements** - OCR processing with Tesseract.js for scanned/photographed statements
- **QIF/OFX Formats** - Direct parsing of financial interchange formats
- **Credit Card Statements** - Support for major international providers (Visa, Mastercard, Amex)
- **HTML Statements** - Parsing of web-based bank statements using Cheerio
- **Custom Formats** - Configurable parsing rules for enterprise clients

### Advanced Processing Capabilities
- **Multi-Page PDF Handling** - Automatic splitting and processing using pdf-lib
- **OCR with Multiple Languages** - English and Polish language support
- **Currency Conversion** - Automatic exchange rate lookup and conversion using currency.js
- **Table Detection** - Advanced algorithms for identifying transaction tables
- **Format Auto-Detection** - Intelligent format identification based on content analysis
- **Integrity Validation** - Checksum verification and file validation

### Enterprise Features
- **Custom Format Configuration** - JSON-based templates for specific bank formats
- **Bulk Processing** - Handle multiple statements simultaneously
- **Exchange Rate Management** - Manual rate input and automatic lookup
- **Processing Analytics** - Detailed metrics and confidence scores
- **Error Recovery** - Fallback processing methods when primary methods fail

## 🏗️ Architecture

### Enhanced Processing Pipeline
```
File Upload → Format Detection → Processor Selection → Data Extraction → Validation → Storage
     ↓              ↓                     ↓               ↓             ↓          ↓
File Types:    Auto-detect or     Tabula, pdf2table,  OCR, Parser,  Checksums,  Database
PDF, Image,    Manual config      OCR, QIF parser     Table extract Currency    + Analytics
QIF, OFX                                                            validation
```

### Service Architecture
```
src/services/
├── bankStatementProcessor.js      # Enhanced processor with multi-format support
├── formatConfigurationService.js  # Custom format management
└── currencyService.js             # Exchange rate management (future)

src/routes/
└── bankStatements.js              # Enhanced API endpoints
```

## 📋 Supported Formats

### Built-in Format Support

| Format Type | File Extensions | Processor | Features |
|-------------|----------------|-----------|----------|
| PDF Tables | .pdf | tabula-js, pdf2table | Multi-page, table detection |
| Scanned PDFs | .pdf | Tesseract OCR | Polish/English, image enhancement |
| Images | .jpg, .png, .tiff | Tesseract OCR | Quality validation, auto-enhancement |
| QIF | .qif | qif2json | Full QIF specification support |
| OFX | .ofx | ofx-js | OFX 1.0-2.0 compatibility |
| HTML | .html, .htm | Cheerio | Table extraction, DOM parsing |
| CSV/Excel | .csv, .xlsx | Legacy parser | Enhanced field mapping |

### Pre-configured Bank Templates

#### Polish Banks
- **PKO Bank Polski** - PDF statements with standard layout
- **mBank** - CSV export format with semicolon delimiter
- **ING Bank Śląski** - HTML online statements
- **Bank Millennium** - Excel exports
- **Santander Bank Polska** - PDF statements

#### International Credit Cards
- **Visa International** - PDF statements, multi-currency support
- **Mastercard Global** - PDF statements with foreign transaction detection
- **American Express** - PDF statements with detailed merchant information

## 🚀 API Documentation

### Enhanced Upload Endpoints

#### Multi-Format Upload
```http
POST /api/bank-statements/enhanced-upload
Content-Type: multipart/form-data

FormData:
- statements: File[] (up to 10 files)
- accountNumber: string (optional)
- accountName: string (optional)  
- currency: string (default: PLN)
- convertCurrency: boolean (default: false)
- baseCurrency: string (default: PLN)
- extractFromImages: boolean (default: true)
- formatId: string (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 3 files successfully, 0 failed",
  "results": [
    {
      "fileName": "statement.pdf",
      "success": true,
      "data": {
        "transactions": [...],
        "metadata": {
          "totalTransactions": 45,
          "dateRange": {
            "start": "2024-01-01",
            "end": "2024-01-31"
          },
          "currencies": ["PLN"],
          "processingMethod": "tabula"
        }
      },
      "detectedFormat": "PKO BP PDF Statement",
      "formatConfidence": 95.5
    }
  ],
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

#### Format Detection
```http
POST /api/bank-statements/detect-format
Content-Type: multipart/form-data

FormData:
- statement: File
```

**Response:**
```json
{
  "success": true,
  "data": {
    "formatId": "pkobp_pdf",
    "format": {
      "name": "PKO BP PDF Statement",
      "type": "pdf",
      "bank": "PKO Bank Polski",
      "country": "Poland"
    },
    "confidence": 95.5
  }
}
```

### Format Management

#### Get Available Formats
```http
GET /api/bank-statements/enhanced-formats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "default": [
      {
        "id": "pkobp_pdf",
        "name": "PKO BP PDF Statement",
        "type": "pdf",
        "bank": "PKO Bank Polski",
        "country": "Poland",
        "isDefault": true
      }
    ],
    "custom": [
      {
        "id": "custom_123",
        "name": "Enterprise Bank Custom",
        "type": "csv",
        "bank": "Enterprise Bank",
        "country": "Poland",
        "isDefault": false
      }
    ]
  }
}
```

#### Create Custom Format
```http
POST /api/bank-statements/custom-format
Content-Type: application/json

{
  "name": "Custom Bank CSV",
  "description": "Custom CSV format for Enterprise Bank",
  "bankName": "Enterprise Bank",
  "country": "Poland",
  "fileTypes": ["csv"],
  "rules": {
    "delimiter": ";",
    "encoding": "utf8",
    "dateColumn": 0,
    "dateFormat": "DD.MM.YYYY",
    "descriptionColumn": 2,
    "amountColumn": 6,
    "headerRows": 1,
    "currency": "PLN",
    "columnMapping": {
      "Data operacji": "date",
      "Opis operacji": "description",
      "Kwota": "amount",
      "Saldo": "balance"
    }
  }
}
```

### OCR and Image Processing

#### OCR Reprocessing
```http
POST /api/bank-statements/{id}/ocr-reprocess
Content-Type: application/json

{
  "ocrLanguage": "eng+pol",
  "enhanceImage": true
}
```

### Currency Conversion

#### Get Exchange Rates
```http
GET /api/bank-statements/currency-rates?from=USD&to=PLN&date=2024-01-15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "from": "USD",
    "to": "PLN",
    "rate": 4.25,
    "date": "2024-01-15",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## ⚙️ Configuration Examples

### Custom Format Configuration

#### Polish Bank CSV Format
```json
{
  "name": "mBank CSV Export",
  "type": "csv",
  "bank": "mBank",
  "country": "Poland",
  "rules": {
    "delimiter": ";",
    "encoding": "utf8",
    "dateColumn": 0,
    "dateFormat": "YYYY-MM-DD",
    "descriptionColumn": 2,
    "amountColumn": 6,
    "headerRows": 1,
    "currency": "PLN",
    "columnMapping": {
      "Data operacji": "date",
      "Opis operacji": "description", 
      "Kwota": "amount",
      "Saldo po operacji": "balance"
    }
  }
}
```

#### International Credit Card PDF
```json
{
  "name": "Visa International Statement",
  "type": "pdf",
  "bank": "Visa",
  "country": "International",
  "rules": {
    "tableDetection": {
      "keywords": ["Date", "Description", "Amount", "Transaction Date"],
      "minColumns": 3,
      "maxColumns": 8
    },
    "dateFormats": ["MM/DD/YYYY", "DD/MM/YYYY"],
    "currencyDetection": {
      "symbols": ["$", "€", "£", "PLN"],
      "multiCurrency": true
    },
    "amountPatterns": [
      "\\$\\s?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?)",
      "(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?)\\s?(USD|EUR|GBP|PLN)"
    ]
  }
}
```

## 🔧 Processing Methods

### PDF Processing Priority
1. **tabula-js** - Primary table extraction for well-structured PDFs
2. **pdf2table** - Advanced table detection for complex layouts
3. **pdf-table-extractor** - Fallback table extraction method
4. **Tesseract OCR** - Final fallback for scanned/image-based PDFs

### OCR Configuration
```javascript
const ocrConfig = {
  language: 'eng+pol',
  psm: Tesseract.PSM.AUTO,
  whitelist: '0123456789.,+-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzĄąĆćĘęŁłŃńÓóŚśŹźŻż /()',
  imageEnhancement: true,
  deskew: true,
  removeNoise: true
};
```

### Currency Conversion
```javascript
const conversionOptions = {
  baseCurrency: 'PLN',
  exchangeDate: '2024-01-15',
  rateSource: 'ECB', // European Central Bank
  manualRates: {
    'USD_PLN': 4.25,
    'EUR_PLN': 4.65
  }
};
```

## 🛠️ Installation & Setup

### Install Enhanced Dependencies
```bash
npm install tabula-js pdf-table-extractor qif2json ofx-js currency.js pdf2table pdf-lib cheerio tesseract.js
```

### Database Migration
```bash
# Add CustomFormat model and enhanced BankStatement fields
npx prisma migrate dev --name enhanced-bank-processing
```

### Configuration
```bash
# Environment variables for external services
EXCHANGE_RATE_API_KEY=your_api_key
TESSERACT_DATA_PATH=/usr/share/tesseract-ocr/tessdata
OCR_LANGUAGES=eng,pol
```

## 📊 Processing Analytics

### Confidence Scores
- **Format Detection**: 0-100% confidence in detected format
- **OCR Accuracy**: Character-level confidence from Tesseract
- **Table Extraction**: Success rate of table detection algorithms
- **Currency Recognition**: Accuracy of currency symbol detection

### Performance Metrics
- **Processing Time**: Time taken per statement type
- **Success Rates**: Percentage of successfully processed statements
- **Error Types**: Categorized processing failures
- **Format Distribution**: Usage statistics of different formats

### Quality Indicators
```json
{
  "processingQuality": {
    "ocrConfidence": 94.5,
    "tableDetectionSuccess": true,
    "currencyDetectionAccuracy": 98.2,
    "dateParsingSuccess": 100.0,
    "amountExtractionAccuracy": 96.7
  }
}
```

## 🔒 Security & Validation

### File Integrity
- **SHA-256 Checksums** - Verify file integrity during upload
- **Size Limits** - Maximum 100MB per file
- **Type Validation** - Whitelist of allowed MIME types
- **Virus Scanning** - Integration ready for AV services

### Data Privacy
- **Local Processing** - OCR and parsing happen on-premises
- **Temporary Files** - Automatic cleanup of processed files
- **Encrypted Storage** - File encryption at rest
- **GDPR Compliance** - Data retention and deletion policies

## 🚨 Error Handling

### Fallback Processing Chain
1. Primary method fails → Try secondary method
2. All table extraction fails → Use OCR
3. OCR fails → Manual review queue
4. Partial success → Flag for human verification

### Common Error Scenarios
- **Corrupted Files** - Integrity check failures
- **Unsupported Formats** - Format not in whitelist
- **OCR Failures** - Poor image quality or unsupported language
- **Parsing Errors** - Invalid data structure or missing fields
- **Currency Issues** - Unknown currency codes or conversion failures

### Error Response Format
```json
{
  "success": false,
  "error": "OCR processing failed",
  "details": {
    "errorCode": "OCR_LOW_CONFIDENCE",
    "confidence": 32.1,
    "suggestedAction": "manual_review",
    "fallbackMethods": ["table_extraction", "manual_parsing"]
  }
}
```

## 🔮 Future Enhancements

### Planned Features
- **Machine Learning** - Improve format detection with ML models
- **Real-time Processing** - WebSocket-based progress updates
- **Batch API** - Process hundreds of statements efficiently
- **Mobile SDK** - Native mobile app integration
- **Blockchain Verification** - Tamper-proof statement integrity

### Integration Roadmap
- **Accounting Software** - Direct integration with popular accounting systems
- **Banking APIs** - Real-time statement fetching via Open Banking
- **Document Management** - Integration with DMS systems
- **Audit Trails** - Comprehensive processing logs for compliance

---

**Enhanced Bank Statement Processing** - Making financial data extraction effortless across all formats and languages. 