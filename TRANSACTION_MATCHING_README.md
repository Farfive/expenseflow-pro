# Intelligent Transaction Matching System

## Overview

The Intelligent Transaction Matching System automatically reconciles bank transactions with expense records using advanced fuzzy matching algorithms, machine learning, and confidence scoring. The system targets >85% auto-reconciliation rate with comprehensive audit trails and learning capabilities.

## Features

### 🤖 Intelligent Matching Algorithms
- **Exact Matching**: Perfect matches on amount, date, and merchant
- **Fuzzy Matching**: Uses fuse.js for flexible text matching and string-similarity for vendor names
- **Pattern Matching**: Detects recurring transactions and common patterns
- **ML-Assisted Matching**: Learns from user confirmations using k-nearest neighbors

### 📊 Confidence Scoring
- **Weighted Criteria**: Configurable weights for amount (40%), date (30%), vendor (30%)
- **Individual Scores**: Separate scoring for amount, date, and vendor similarity
- **Confidence Thresholds**: Auto-approval (90%+), manual review (60-90%), minimum match (40%+)
- **Date Tolerance**: ±3 days flexibility for transaction dates

### 🔧 Advanced Features
- **Split Transactions**: Handle single transactions split across multiple expenses
- **Partial Matching**: Support for partial amount matches
- **Audit Trail**: Complete history of all matching decisions
- **Machine Learning**: Continuous improvement from user feedback
- **Multiple Strategies**: Fallback between different matching approaches

### 📈 Reporting & Analytics
- **Reconciliation Reports**: Excel, CSV, PDF format support
- **Performance Metrics**: Auto-reconciliation rates, confidence scores, strategy effectiveness
- **Unmatched Items**: Detailed tracking of unreconciled transactions and expenses
- **Statistical Analysis**: Comprehensive matching statistics and trends

## Database Schema

### Core Models

#### TransactionMatch
```prisma
model TransactionMatch {
  id                 String                @id @default(cuid())
  companyId          String
  transactionId      String
  expenseId          String?
  documentId         String?
  
  // Matching Details
  matchType          MatchType             @default(FUZZY)
  matchStrategy      String                // exact, fuzzy, pattern-based, ml-assisted
  confidenceScore    Float                 // 0.0 to 1.0
  matchedFields      Json                  // Which fields matched and their scores
  
  // Matching Criteria Scores
  amountScore        Float?                // Amount similarity score
  dateScore          Float?                // Date proximity score
  vendorScore        Float?                // Vendor name similarity score
  aggregateScore     Float                 // Weighted overall score
  
  // Status and Review
  status             MatchingStatus        @default(PENDING)
  reviewedBy         String?
  reviewedAt         DateTime?
  rejectionReason    String?
  userFeedback       Json?                 // User corrections and confirmations
  
  // Split Transaction Support
  isPartialMatch     Boolean               @default(false)
  splitAmount        Decimal?              @db.Decimal(15, 2)
  relatedMatchIds    String[]              // Related split matches
  
  // Machine Learning Features
  featureVector      Json?                 // ML features used for matching
  modelVersion       String?               // Version of ML model used
  trainingData       Boolean               @default(false) // Is this used for training
  
  // Timestamps
  createdAt          DateTime              @default(now())
  updatedAt          DateTime              @updatedAt
}
```

#### MatchingRule
```prisma
model MatchingRule {
  id                 String               @id @default(cuid())
  companyId          String
  name               String
  description        String?
  
  // Rule Configuration
  isActive           Boolean              @default(true)
  priority           Int                  @default(0)
  matchStrategy      String               // exact, fuzzy, pattern-based
  
  // Matching Criteria
  amountTolerance    Float?               // Percentage tolerance for amount
  dateTolerance      Int?                 // Days tolerance for date
  vendorThreshold    Float?               // Vendor name similarity threshold
  
  // Weight Configuration
  amountWeight       Float                @default(0.4)
  dateWeight         Float                @default(0.3)
  vendorWeight       Float                @default(0.3)
  
  // Conditions
  conditions         Json                 // Complex matching conditions
  autoApprovalLimit  Float?               // Auto-approve above this confidence
  reviewThreshold    Float?               // Require review below this confidence
}
```

#### ReconciliationReport
```prisma
model ReconciliationReport {
  id                    String               @id @default(cuid())
  companyId             String
  generatedBy           String
  
  // Report Period
  periodStart           DateTime
  periodEnd             DateTime
  reportType            ReportType           @default(MONTHLY)
  
  // Statistics
  totalTransactions     Int
  totalExpenses         Int
  matchedCount          Int
  unmatchedTransactions Int
  unmatchedExpenses     Int
  partialMatches        Int
  
  // Performance Metrics
  autoReconciliationRate Float              // Percentage auto-reconciled
  averageConfidenceScore Float              // Average confidence of matches
  processingTime         Int?                // Time to generate report (ms)
  
  // Report Data
  reportData            Json                 // Detailed report data
  unmatchedItems        Json?                // List of unmatched items
  
  // File Information
  reportPath            String?              // Path to generated report file
  reportFormat          String?              // PDF, Excel, CSV
}
```

## API Endpoints

### Core Matching Endpoints

#### POST /api/transaction-matching/run
Run transaction matching for a company
```json
{
  "companyId": "company123",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "strategy": "all" // exact, fuzzy, pattern-based, ml-assisted, all
}
```

#### GET /api/transaction-matching/pending-reviews
Get pending matches requiring manual review
```
?companyId=company123&limit=50&offset=0&sortBy=confidenceScore&sortOrder=desc
```

#### POST /api/transaction-matching/approve
Approve a transaction match
```json
{
  "matchId": "match123",
  "userConfidence": 0.9,
  "feedback": {
    "comments": "Looks correct"
  }
}
```

#### POST /api/transaction-matching/reject
Reject a transaction match
```json
{
  "matchId": "match123",
  "reason": "Wrong merchant",
  "feedback": {
    "suggestedCorrections": "Should match different expense"
  }
}
```

#### POST /api/transaction-matching/split
Create split transaction match
```json
{
  "transactionId": "trans123",
  "expenses": ["exp1", "exp2", "exp3"],
  "splitAmounts": [100.00, 150.00, 50.00]
}
```

### Reporting Endpoints

#### POST /api/transaction-matching/reconciliation-report
Generate reconciliation report
```json
{
  "companyId": "company123",
  "reportType": "MONTHLY",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "format": "EXCEL"
}
```

#### GET /api/transaction-matching/statistics
Get matching statistics
```
?companyId=company123&dateFrom=2024-01-01&dateTo=2024-01-31
```

## Services Architecture

### TransactionMatchingService
Main service for running intelligent matching algorithms

**Key Methods:**
- `matchTransactions(companyId, options)`: Run matching process
- `findBestMatch(transaction, expenses, rules)`: Find optimal match
- `exactMatching()`: Exact matching strategy
- `fuzzyMatching()`: Fuzzy matching with fuse.js
- `patternMatching()`: Pattern-based matching
- `mlAssistedMatching()`: Machine learning matching

### MatchingReviewService
Handles manual review and user feedback

**Key Methods:**
- `getPendingReviews(companyId, options)`: Get pending matches
- `approveMatch(matchId, userId, feedback)`: Approve match
- `rejectMatch(matchId, userId, reason)`: Reject match
- `createSplitMatch()`: Handle split transactions
- `storeLearningData()`: Store ML training data

### ReconciliationService
Generates comprehensive reconciliation reports

**Key Methods:**
- `generateReconciliationReport()`: Create detailed reports
- `generateExcelReport()`: Excel format reports
- `calculateStatistics()`: Performance metrics
- `identifyTopIssues()`: Flag problematic items

## Matching Algorithms

### 1. Exact Matching
Perfect matches require:
- Identical amounts (within 0.1%)
- Same date
- Vendor name similarity >95%

### 2. Fuzzy Matching
Uses weighted scoring:
- **Amount Score**: Calculated with tolerance for small differences
- **Date Score**: Linear decrease over ±3 days tolerance
- **Vendor Score**: String similarity + substring matching
- **Final Score**: Weighted average of individual scores

### 3. Pattern Matching
Detects patterns like:
- Recurring transactions (same merchant, similar amounts)
- Common expense patterns
- Date-based patterns (monthly, weekly)

### 4. ML-Assisted Matching
K-nearest neighbors algorithm:
- Feature vector includes amount, date, vendor scores
- Learns from user confirmations and rejections
- Predicts match likelihood based on historical data
- Continuous improvement with user feedback

## Configuration

### Default Weights
```javascript
{
  amount: 0.4,    // 40% weight for amount matching
  date: 0.3,      // 30% weight for date proximity
  vendor: 0.3     // 30% weight for vendor similarity
}
```

### Confidence Thresholds
```javascript
{
  autoApproval: 0.9,     // Auto-approve above 90%
  manualReview: 0.6,     // Review required below 60%
  minimumMatch: 0.4,     // Minimum 40% to consider match
  fuzzyAmount: 0.02,     // 2% amount tolerance
  dateTolerance: 3,      // ±3 days date tolerance
  vendorSimilarity: 0.7  // 70% vendor similarity minimum
}
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install fuse.js string-similarity mathjs exceljs fs-extra
```

### 2. Database Migration
```bash
npx prisma db push
npx prisma generate
```

### 3. Environment Configuration
```env
# Add any specific configuration for matching service
MATCHING_MODEL_VERSION=1.0.0
REPORTS_DIRECTORY=./uploads/reports
```

### 4. Initialize Services
```javascript
const TransactionMatchingService = require('./services/transactionMatchingService');
const MatchingReviewService = require('./services/matchingReviewService');
const ReconciliationService = require('./services/reconciliationService');

const matchingService = new TransactionMatchingService();
const reviewService = new MatchingReviewService();
const reconciliationService = new ReconciliationService();
```

## Frontend Components

### MatchingDashboard
Comprehensive dashboard for transaction matching with:
- Real-time statistics and performance metrics
- Pending matches review interface
- Analytics and charts
- Unmatched items management
- Report generation capabilities

**Key Features:**
- Interactive match review with confidence visualization
- Approve/reject workflow with feedback collection
- Split transaction handling
- Auto-refresh and manual matching triggers
- Export capabilities for reconciliation reports

## Machine Learning Integration

### Training Data Collection
- User confirmations (approve/reject) stored as training data
- Feature vectors extracted for each match decision
- Anonymized data ensures privacy compliance
- Continuous learning from user feedback

### Feature Engineering
Current features include:
- Amount similarity score
- Date proximity score
- Vendor name similarity score
- Transaction amount magnitude
- Description/title lengths
- Day difference between dates

### Model Improvement
- K-nearest neighbors for similarity-based prediction
- Weighted learning from user confidence ratings
- Model versioning for tracking improvements
- Performance monitoring and retraining triggers

## Performance Targets

### Primary Metrics
- **Auto-Reconciliation Rate**: >85%
- **Average Confidence Score**: >0.8
- **Processing Time**: <10 seconds per document
- **Accuracy**: >95% on clear documents

### Monitoring
- Real-time performance tracking
- User feedback collection
- System health monitoring
- Continuous improvement metrics

## Security & Privacy

### Data Protection
- Anonymized learning data storage
- Secure audit trail maintenance
- GDPR compliance for data handling
- Local processing (no external API calls)

### Access Control
- Role-based permissions for matching operations
- Audit logging of all user actions
- Secure API endpoints with authentication
- Company-level data isolation

## Troubleshooting

### Common Issues

#### Low Auto-Reconciliation Rate
1. Check matching rule configurations
2. Review confidence thresholds
3. Analyze rejection patterns
4. Retrain ML model with more data

#### High False Positive Rate
1. Increase confidence thresholds
2. Adjust matching weights
3. Improve vendor name normalization
4. Add custom matching rules

#### Performance Issues
1. Optimize database queries
2. Add proper indexes
3. Limit search scope with date ranges
4. Cache frequently accessed data

### Debugging Tools
- Detailed logging in matching service
- Confidence score breakdown in UI
- Audit trail for match decisions
- Performance metrics dashboard

## Future Enhancements

### Planned Features
- OCR integration for receipt matching
- Advanced pattern recognition
- Multi-currency support improvements
- Real-time matching capabilities
- Enhanced ML models (neural networks)

### Integration Opportunities
- Bank API direct connections
- Accounting software integrations
- Mobile app matching capabilities
- Automated expense categorization
- Advanced reporting and analytics

## Support

For technical support or feature requests:
1. Check the troubleshooting section
2. Review audit logs for matching decisions
3. Analyze performance metrics
4. Contact development team with specific issues

## License

This intelligent transaction matching system is proprietary software developed for ExpenseFlow Pro. 