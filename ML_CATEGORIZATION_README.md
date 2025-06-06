# ML-Based Expense Categorization System

## Overview

ExpenseFlow Pro's ML-based categorization system automatically categorizes expenses using machine learning, natural language processing, and pattern recognition. The system learns from user corrections and provides intelligent expense categorization with confidence scoring.

## Features

### 🤖 Intelligent Categorization
- **Multi-source Classification**: Combines Naive Bayes classifier, vendor database lookup, keyword matching, and pattern recognition
- **Real-time Predictions**: Instant categorization as documents are uploaded
- **Confidence Scoring**: Statistical confidence analysis with adjustable thresholds
- **Batch Processing**: Efficient categorization of multiple documents

### 📚 Continuous Learning
- **User Correction Learning**: Improves predictions based on manual corrections
- **Vendor Database**: Maintains company-specific and global vendor-category mappings
- **Keyword Extraction**: Automatically identifies and weights important keywords
- **Pattern Recognition**: Learns document patterns and structures

### 🎯 High Accuracy
- **95%+ Target Accuracy**: Optimized for high-confidence predictions
- **Multi-language Support**: English and Polish with expansion capability
- **Context-aware**: Considers vendor, amount, description, and document content
- **Fallback Systems**: Multiple prediction sources for robustness

## Architecture

### Backend Components

#### 1. CategorizationService (`src/services/categorizationService.js`)
Core ML engine with the following capabilities:
- Naive Bayes text classification
- Vendor database management
- Keyword extraction and weighting
- Pattern matching algorithms
- Confidence calculation
- Learning from corrections

#### 2. Database Models (Prisma Schema)
```sql
-- Learning data storage
CategorizationLearning {
  vendor, description, extractedText, amount
  userCategory, confidence, features
}

-- Vendor-category mappings
VendorCategory {
  vendorName, category, confidence
  usageCount, isVerified
}

-- Category keywords
CategoryKeyword {
  keyword, category, weight
  usageCount, isActive
}
```

#### 3. API Routes (`src/routes/categorization.js`)
RESTful endpoints for:
- Category management (CRUD)
- Document categorization
- Learning from corrections
- Vendor management
- Analytics and insights

### Frontend Components

#### 1. Category Manager (`frontend/src/components/categorization/CategoryManager.tsx`)
- Visual category management
- ML insights dashboard
- Default category creation
- Performance analytics

#### 2. Document Categorization (`frontend/src/components/categorization/DocumentCategorization.tsx`)
- Real-time prediction display
- Confidence visualization
- Manual override capabilities
- Learning feedback

#### 3. Categorization Service (`frontend/src/services/categorizationService.ts`)
- API integration
- Type definitions
- Utility functions
- Validation logic

## Machine Learning Models

### 1. Naive Bayes Classifier
```javascript
// Training data format
{
  text: "extracted features from document",
  category: "travel" | "meals" | "office_supplies" | ...
}

// Features include:
// - Vendor name words
// - Description keywords
// - Document text keywords
// - Amount-based features
```

### 2. Vendor Database Lookup
```javascript
// Exact and fuzzy matching
vendorDatabase.set("starbucks", "meals")
vendorDatabase.set("hilton", "travel")

// Confidence scoring based on:
// - Match quality (exact vs fuzzy)
// - Usage frequency
// - Manual verification
```

### 3. Keyword Matching
```javascript
// Category-specific keywords with weights
{
  "travel": ["flight", "hotel", "taxi", "rental"],
  "meals": ["restaurant", "food", "lunch", "coffee"],
  "office_supplies": ["office", "supplies", "paper", "printer"]
}
```

### 4. Pattern Recognition
```javascript
// Regex patterns for document types
patterns: {
  travel: [/\b(flight|hotel|airline)\b/gi],
  meals: [/\b(restaurant|food|meal)\b/gi],
  // ... more patterns
}
```

## Default Categories

The system includes pre-configured categories optimized for business expenses:

### Standard Categories
- **Travel**: Flights, hotels, car rentals, taxis, parking
- **Meals**: Restaurants, coffee shops, catering, business meals
- **Office Supplies**: Paper, pens, folders, desk accessories
- **Technology**: Software, hardware, subscriptions, licenses
- **Utilities**: Electricity, internet, phone, water
- **Marketing**: Advertising, promotional materials, website costs
- **Professional Services**: Legal, accounting, consulting
- **Other**: Miscellaneous expenses

### Category Metadata
```json
{
  "name": "travel",
  "keywords": ["flight", "hotel", "taxi", "rental"],
  "vendors": ["united airlines", "hilton", "uber"],
  "patterns": ["/\\b(flight|hotel)\\b/gi"],
  "taxCategory": "travel_expense",
  "accountingCode": "6200"
}
```

## Configuration

### Environment Variables
```bash
# ML Categorization Settings
ML_CONFIDENCE_THRESHOLD=0.8      # Auto-categorize threshold
ML_AUTO_CATEGORIZE=true          # Enable auto-categorization
ML_LEARNING_ENABLED=true         # Enable learning from corrections
ML_BATCH_SIZE=10                 # Batch processing size
ML_RETRAIN_INTERVAL=24           # Hours between retraining
ML_MODEL_VERSION=1.0             # Model version tracking
ML_DATA_PATH=./data/categorization  # Data storage path
ML_ENABLE_PATTERN_MATCHING=true  # Enable regex patterns
ML_ENABLE_VENDOR_LEARNING=true   # Enable vendor learning
```

### Confidence Thresholds
```javascript
confidenceThresholds: {
  high: 0.8,    // Auto-apply category
  medium: 0.6,  // Suggest with review
  low: 0.4      // Manual categorization required
}
```

## API Usage

### Categorize Document
```javascript
POST /api/v1/categorization/categorize
{
  "vendor": "Starbucks",
  "description": "Coffee meeting",
  "extractedText": "Receipt text...",
  "amount": 25.50
}

Response:
{
  "category": "meals",
  "confidence": 0.85,
  "confidenceLevel": "high",
  "predictions": [...],
  "reasoning": "Vendor is known in database, keyword matching",
  "suggested": false
}
```

### Learn from Correction
```javascript
POST /api/v1/categorization/learn
{
  "vendor": "Uber",
  "userCategory": "travel",
  "originalPrediction": "meals"
}
```

### Batch Categorization
```javascript
POST /api/v1/categorization/batch-categorize
{
  "documents": [
    { "vendor": "Hotel XYZ", "amount": 150 },
    { "vendor": "Restaurant ABC", "amount": 45 }
  ]
}
```

## Integration with Document Processing

### OCR to Categorization Flow
1. **Document Upload** → OCR Processing
2. **Text Extraction** → Feature extraction
3. **ML Categorization** → Confidence scoring
4. **Auto-apply or Suggest** → User review if needed
5. **User Correction** → Learning update
6. **Database Storage** → Training data update

### Code Integration
```javascript
// In DocumentProcessor.js
const categorization = await this.categorization.categorizeDocument({
  vendor: extractedData.vendor,
  description: fullText.substring(0, 500),
  extractedText: fullText,
  amount: extractedData.amount
});

// Auto-apply if high confidence
if (categorization.confidence >= 0.8) {
  expense.categoryId = await getCategoryId(categorization.category);
}
```

## Performance Optimization

### Caching Strategy
- **Model Caching**: Trained classifiers cached in memory
- **Vendor Lookup**: In-memory Map for fast vendor matching
- **Keyword Indexing**: Pre-processed keyword weights

### Batch Processing
- **Queue Integration**: Uses Bull queue for batch categorization
- **Parallel Processing**: Multiple documents processed simultaneously
- **Progress Tracking**: Real-time status updates

### Database Optimization
```sql
-- Optimized indexes
CREATE INDEX idx_vendor_normalized ON vendor_categories(normalizedVendor);
CREATE INDEX idx_keyword_category ON category_keywords(keyword, category);
CREATE INDEX idx_learning_company ON categorization_learning(companyId, userCategory);
```

## Monitoring and Analytics

### Key Metrics
- **Accuracy Rate**: Percentage of correct auto-categorizations
- **Confidence Distribution**: High/medium/low confidence breakdown
- **Learning Rate**: Corrections per day/week
- **Processing Time**: Average categorization time
- **Category Usage**: Most/least used categories

### Dashboard Insights
```javascript
// Available analytics
{
  categoryDistribution: [...],    // Usage by category
  confidenceStats: [...],         // Confidence levels
  learningCount: 150,            // Total corrections
  topVendors: [...],             // Most frequent vendors
  accuracyTrend: [...]           // Accuracy over time
}
```

## Error Handling

### Graceful Degradation
- **Fallback Categories**: Default to "other" if prediction fails
- **Confidence Floors**: Minimum confidence thresholds
- **Manual Override**: Always allow user corrections
- **Retry Logic**: Automatic retry for transient failures

### Common Issues
```javascript
// Low confidence handling
if (prediction.confidence < threshold) {
  return {
    category: 'other',
    suggested: true,
    reason: 'Low confidence - manual review required'
  };
}

// Missing data handling
if (!vendor && !description && !extractedText) {
  return defaultCategorizationResult;
}
```

## Testing

### Unit Tests
```javascript
// Test categorization accuracy
describe('CategorizationService', () => {
  test('should categorize travel expenses correctly', async () => {
    const result = await service.categorizeDocument({
      vendor: 'United Airlines',
      amount: 450
    });
    expect(result.category).toBe('travel');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

### Integration Tests
- API endpoint testing
- Database integration testing
- Learning mechanism validation
- Performance benchmarking

## Security Considerations

### Data Privacy
- **Company Isolation**: Each company's learning data is isolated
- **No Data Sharing**: Company-specific vendor mappings stay private
- **Audit Logging**: All categorization changes are logged
- **Data Encryption**: Sensitive data encrypted at rest

### Access Control
- **Role-based Access**: Only authorized users can modify categories
- **Company Scope**: Users only see their company's data
- **API Authentication**: All endpoints require valid JWT tokens

## Future Enhancements

### Planned Features
- **Deep Learning Models**: TensorFlow.js integration for advanced NLP
- **Multi-language Support**: Expand beyond English/Polish
- **Receipt Image Analysis**: Visual categorization based on receipt layout
- **Seasonal Learning**: Time-based categorization patterns
- **Integration APIs**: Connect with accounting software for better training data

### Scalability Improvements
- **Distributed Training**: Scale ML training across multiple workers
- **Model Versioning**: A/B testing of different model versions
- **Real-time Learning**: Instant model updates from corrections
- **Cloud ML**: Integration with cloud ML services

## Troubleshooting

### Common Issues

1. **Low Accuracy**
   - Check training data quality
   - Verify category keyword coverage
   - Review vendor database completeness

2. **Slow Performance**
   - Monitor database query performance
   - Check memory usage for large models
   - Optimize batch processing sizes

3. **Learning Not Working**
   - Verify correction data is being stored
   - Check retraining schedule
   - Monitor learning data quality

### Debug Commands
```bash
# Check categorization status
curl -X GET "/api/v1/categorization/insights"

# Test specific document
curl -X POST "/api/v1/categorization/categorize" \
  -d '{"vendor": "Test Vendor", "amount": 100}'

# View learning data
curl -X GET "/api/v1/categorization/vendors?search=starbucks"
```

## Contributing

### Adding New Categories
1. Define category metadata with keywords and patterns
2. Add to default categories configuration
3. Update frontend category formatting
4. Test with sample documents

### Improving Accuracy
1. Analyze mis-categorized documents
2. Update keyword lists and patterns
3. Improve vendor database coverage
4. Enhance feature extraction logic

### Performance Optimization
1. Profile categorization performance
2. Optimize database queries
3. Implement better caching strategies
4. Reduce memory usage

---

**ExpenseFlow Pro ML Categorization System** - Intelligent, learning-enabled expense categorization for modern businesses. 