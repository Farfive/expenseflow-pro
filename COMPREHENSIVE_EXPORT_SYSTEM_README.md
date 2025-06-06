# Comprehensive Data Export System

## Overview

The ExpenseFlow Pro export system provides comprehensive data export capabilities for accounting software integration. The system supports multiple formats, custom templates, scheduled exports, and automated processing with full audit trails.

## 🎯 Key Features

### Export Formats Supported
- **CSV**: Customizable field mapping with csv-writer
- **Excel**: XLSX files with formatting using xlsx library
- **JSON**: Structured data with metadata and grouping options
- **XML**: XML format using xml2js for structured data
- **PDF**: Professional reports using Puppeteer
- **Custom**: Handlebars templates for any text-based format

### Accounting Software Integration
- **QuickBooks**: CSV format with proper field mapping
- **Xero**: Bank statement import format
- **Sage**: XML format for transaction import
- **Generic API**: JSON format for custom integrations

### Advanced Features
- **Scheduled Exports**: Automated exports using node-cron
- **Batch Processing**: Multiple period exports with ZIP packaging
- **Data Validation**: joi/yup validation before export
- **Audit Logging**: Complete export history and version control
- **Progress Tracking**: Real-time export progress monitoring
- **Custom Templates**: Handlebars template engine for custom formats

## 📦 Dependencies

```json
{
  "xml2js": "^0.6.2",
  "handlebars": "^4.7.8",
  "csv-writer": "^1.6.0",
  "node-cron": "^3.0.3",
  "joi": "^17.11.0",
  "yup": "^1.3.3",
  "xlsx": "^0.18.5",
  "puppeteer": "^21.5.2",
  "jspdf": "^2.5.1",
  "moment": "^2.29.4",
  "archiver": "^6.0.1"
}
```

## 🚀 API Endpoints

### Standard Export Operations

#### Create Export
```http
POST /api/v1/exports/create
Content-Type: application/json

{
  "format": "csv|excel|json|xml|pdf|custom",
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "dataType": "expenses|transactions|all",
  "template": "quickbooks_csv",
  "filters": {
    "category": "travel",
    "project": "project-id"
  },
  "options": {
    "csvOptions": {
      "delimiter": ",",
      "includeHeaders": true,
      "fieldMapping": {
        "Date": "transactionDate",
        "Amount": "amount",
        "Description": "description"
      }
    },
    "excelOptions": {
      "sheetName": "Expenses",
      "formatting": {
        "columnWidths": [15, 30, 10, 20]
      }
    },
    "pdfOptions": {
      "template": "default",
      "orientation": "portrait",
      "format": "A4"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "exportId": "exp_1234567890_abc123",
  "format": "csv",
  "fileName": "export_1234567890_20241205_143022.csv",
  "recordCount": 150,
  "fileSize": 25600
}
```

#### Download Export
```http
GET /api/v1/exports/download/{exportId}
```

#### Export Status
```http
GET /api/v1/exports/status/{exportId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "PROCESSING|COMPLETED|FAILED|CANCELLED",
    "progress": 75,
    "startTime": "2024-12-05T14:30:22Z",
    "options": {...}
  }
}
```

### Accounting Software Integration

#### QuickBooks Export
```http
POST /api/v1/exports/quickbooks
Content-Type: application/json

{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "includeExpenses": true,
  "includeTransactions": false
}
```

#### Xero Export
```http
POST /api/v1/exports/xero
Content-Type: application/json

{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "accountCode": "200"
}
```

#### Sage Export
```http
POST /api/v1/exports/sage
Content-Type: application/json

{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "nominalCodes": ["7500", "7600"]
}
```

### Batch and Scheduled Exports

#### Batch Export
```http
POST /api/v1/exports/batch
Content-Type: application/json

{
  "periods": [
    {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    {
      "start": "2024-02-01T00:00:00Z",
      "end": "2024-02-29T23:59:59Z"
    }
  ],
  "format": "csv",
  "zipOutput": true,
  "options": {
    "csvOptions": {
      "includeHeaders": true
    }
  }
}
```

#### Schedule Export
```http
POST /api/v1/exports/schedule
Content-Type: application/json

{
  "name": "Monthly Expense Report",
  "schedule": "0 0 1 * *",
  "exportConfig": {
    "format": "pdf",
    "period": {
      "start": "{{previousMonth.start}}",
      "end": "{{previousMonth.end}}"
    }
  },
  "enabled": true,
  "timezone": "Europe/Warsaw"
}
```

#### Get Scheduled Exports
```http
GET /api/v1/exports/scheduled
```

#### Cancel Scheduled Export
```http
DELETE /api/v1/exports/scheduled/{taskId}
```

### Templates and Configuration

#### Get Available Templates
```http
GET /api/v1/exports/templates
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "quickbooks_csv",
      "name": "QuickBooks CSV Import",
      "software": "QuickBooks",
      "format": "csv",
      "description": "Standard QuickBooks CSV import format"
    }
  ]
}
```

#### Create Custom Template
```http
POST /api/v1/exports/custom-template
Content-Type: application/json

{
  "name": "Custom Invoice Export",
  "description": "Custom invoice format for external system",
  "templateSource": "{{#each data}}{{formatDate transactionDate \"YYYY-MM-DD\"}},{{amount}},{{description}}\n{{/each}}",
  "outputFormat": "csv",
  "category": "invoicing"
}
```

### Export Management

#### Get Active Exports
```http
GET /api/v1/exports/active
```

#### Cancel Export
```http
DELETE /api/v1/exports/cancel/{exportId}
```

#### Export History
```http
GET /api/v1/exports/history?page=1&limit=20&format=csv&from=2024-01-01&to=2024-12-31
```

## 🔧 Configuration

### Environment Variables

```env
# Export Configuration
EXPORT_MAX_RECORDS=10000
EXPORT_BATCH_SIZE=1000
EXPORT_CLEANUP_DAYS=30
EXPORT_MAX_FILE_SIZE=100MB

# Puppeteer Configuration (for PDF exports)
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000

# Cron Configuration
EXPORT_TIMEZONE=Europe/Warsaw
```

### Handlebars Helpers

The system includes several built-in Handlebars helpers:

```handlebars
{{!-- Date formatting --}}
{{formatDate transactionDate "YYYY-MM-DD"}}
{{formatDate transactionDate "DD/MM/YYYY"}}

{{!-- Currency formatting --}}
{{formatCurrency amount "PLN"}}
{{formatCurrency amount "USD"}}

{{!-- Mathematical operations --}}
{{sum data "amount"}}
{{#math amount "+" vatAmount}}{{/math}}

{{!-- Conditional logic --}}
{{#ifEquals status "approved"}}Approved{{/ifEquals}}

{{!-- Indexed loops --}}
{{#eachWithIndex data}}
  {{index}}. {{description}}
{{/eachWithIndex}}
```

## 📝 Template Examples

### QuickBooks CSV Template
```handlebars
Date,Description,Amount,Account,Memo,Name,Class{{#each data}}
{{formatDate transactionDate "MM/DD/YYYY"}},"{{description}}",{{amount}},"{{category.name}}","{{#if receiptNumber}}Receipt: {{receiptNumber}}{{/if}}","{{merchantName}}","{{#if project.name}}{{project.name}}{{/if}}"{{/each}}
```

### Sage XML Template
```handlebars
<?xml version="1.0" encoding="UTF-8"?>
<ImportData>
  <Header>
    <ExportDate>{{formatDate metadata.timestamp "YYYY-MM-DD"}}</ExportDate>
    <RecordCount>{{metadata.recordCount}}</RecordCount>
  </Header>
  <Transactions>
    {{#each data}}
    <Transaction>
      <TransactionDate>{{formatDate transactionDate "YYYY-MM-DD"}}</TransactionDate>
      <Reference>{{#if receiptNumber}}{{receiptNumber}}{{else}}{{id}}{{/if}}</Reference>
      <Description>{{description}}</Description>
      <NetAmount>{{amount}}</NetAmount>
      <NominalCode>{{#if category.code}}{{category.code}}{{else}}7500{{/if}}</NominalCode>
    </Transaction>
    {{/each}}
  </Transactions>
</ImportData>
```

## 🔍 Usage Examples

### Basic CSV Export

```javascript
const exportService = new ComprehensiveExportService();

const result = await exportService.exportData({
  format: 'csv',
  period: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  csvOptions: {
    delimiter: ',',
    includeHeaders: true
  }
});

console.log(`Export created: ${result.fileName}`);
```

### QuickBooks Integration

```javascript
const result = await exportService.exportData({
  format: 'csv',
  template: 'quickbooks_csv',
  period: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  }
});
```

### Scheduled Monthly Report

```javascript
const taskId = exportService.scheduleExport({
  name: 'Monthly Financial Report',
  schedule: '0 0 1 * *', // First day of each month
  exportConfig: {
    format: 'pdf',
    template: 'financial_summary',
    period: {
      start: '{{previousMonth.start}}',
      end: '{{previousMonth.end}}'
    }
  },
  enabled: true
});
```

### Batch Export for Multiple Periods

```javascript
const result = await exportService.batchExport({
  periods: [
    { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
    { start: new Date('2024-02-01'), end: new Date('2024-02-29') },
    { start: new Date('2024-03-01'), end: new Date('2024-03-31') }
  ],
  format: 'excel',
  zipOutput: true
});
```

## 🔒 Security Features

### Data Validation
- **Input Validation**: All export requests validated with Joi schemas
- **Data Validation**: Export data validated with Yup schemas
- **File Size Limits**: Configurable maximum file sizes
- **Rate Limiting**: API rate limiting to prevent abuse

### Access Control
- **Authentication**: All endpoints require valid JWT tokens
- **Authorization**: Role-based access for scheduling and management
- **Company Isolation**: Data isolated by company ID
- **Audit Logging**: Complete audit trail of all export activities

### File Security
- **Local Processing**: All processing done locally (GDPR compliant)
- **Automatic Cleanup**: Old export files automatically cleaned up
- **Secure Downloads**: Verified file access and download links
- **Integrity Checks**: File integrity validation with checksums

## 📊 Monitoring and Analytics

### Export Metrics
- **Success Rate**: Percentage of successful exports
- **Processing Time**: Average export processing time
- **File Sizes**: Distribution of export file sizes
- **Popular Formats**: Most commonly used export formats
- **Error Analysis**: Common failure reasons and patterns

### Audit Logging
- **Export Creation**: Log all export requests
- **Processing Status**: Track export lifecycle
- **Download Activity**: Monitor file downloads
- **Schedule Changes**: Log scheduling modifications
- **Error Events**: Detailed error logging

## 🚦 Error Handling

### Common Error Scenarios

#### Export Validation Errors
```json
{
  "success": false,
  "errors": [
    "Invalid export format: xyz",
    "Start date must be before end date",
    "Maximum record limit exceeded"
  ]
}
```

#### Processing Errors
```json
{
  "success": false,
  "error": "OCR processing failed for document ID: doc_123",
  "exportId": "exp_1234567890_abc123"
}
```

#### Template Errors
```json
{
  "success": false,
  "error": "Template compilation failed: Unknown helper 'invalidHelper'",
  "template": "custom_template_name"
}
```

### Error Recovery
- **Automatic Retry**: Failed exports automatically retried
- **Partial Results**: Return partial data on non-critical errors
- **Graceful Degradation**: Fall back to simpler formats when needed
- **User Notification**: Clear error messages for user action

## 🧪 Testing

### Unit Tests
```bash
# Run all export service tests
npm test src/services/exportService.test.js

# Run specific format tests
npm test src/services/exportService.test.js -- --grep "CSV export"
```

### Integration Tests
```bash
# Test full export workflow
npm test tests/integration/export.test.js

# Test accounting software integrations
npm test tests/integration/accounting.test.js
```

### Load Testing
```bash
# Test concurrent exports
npm run test:load exports

# Test batch processing
npm run test:batch exports
```

## 📈 Performance Optimization

### Processing Performance
- **Streaming**: Large datasets processed in streams
- **Parallel Processing**: Multiple exports processed concurrently
- **Memory Management**: Efficient memory usage for large exports
- **Database Optimization**: Optimized queries with proper indexing

### File Generation
- **Incremental Building**: Large files built incrementally
- **Compression**: Optional file compression for large exports
- **Caching**: Template compilation caching
- **Lazy Loading**: Data loaded on demand

## 🔧 Maintenance

### Regular Tasks
- **File Cleanup**: Remove old export files
- **Log Rotation**: Archive old export logs
- **Template Updates**: Update accounting software templates
- **Performance Monitoring**: Track export performance metrics

### Database Maintenance
```sql
-- Clean up old export logs (older than 90 days)
DELETE FROM export_logs WHERE timestamp < NOW() - INTERVAL '90 days';

-- Clean up old export audits (older than 1 year)
DELETE FROM export_audits WHERE created_at < NOW() - INTERVAL '1 year';

-- Update export statistics
REFRESH MATERIALIZED VIEW export_statistics;
```

## 🔮 Future Enhancements

### Planned Features
- **Cloud Storage Integration**: Export directly to S3, Google Drive, etc.
- **Email Delivery**: Automatic email delivery of exports
- **API Webhooks**: Notify external systems of completed exports
- **Advanced Filtering**: More sophisticated data filtering options
- **Template Marketplace**: Shared template library
- **Data Encryption**: Optional export file encryption

### Technology Roadmap
- **GraphQL Support**: GraphQL export API
- **Real-time Exports**: WebSocket-based real-time export status
- **Machine Learning**: Intelligent export scheduling and optimization
- **Blockchain Integration**: Immutable export audit trails

## 📞 Support

### Documentation
- **API Reference**: Complete API documentation
- **Template Guide**: Handlebars template creation guide
- **Integration Examples**: Sample integrations for popular accounting software
- **Troubleshooting**: Common issues and solutions

### Contact
- **Technical Support**: support@expenseflow.pro
- **Feature Requests**: features@expenseflow.pro
- **Documentation**: docs@expenseflow.pro

---

*ExpenseFlow Pro Export System - Version 1.0.0*
*Last Updated: December 2024* 