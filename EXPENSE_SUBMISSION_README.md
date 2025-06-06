# ExpenseFlow Pro - Employee Expense Submission System

## Overview

A comprehensive, intuitive employee interface for expense submission with advanced OCR processing, smart categorization, and offline capabilities. Built specifically for Polish businesses with GDPR compliance and document-first approach.

## 🌟 Key Features

### Core Functionality
- **Drag & Drop File Upload** - Support for images (JPG, PNG) and PDFs
- **Camera Integration** - Direct photo capture on mobile devices
- **Real-time OCR Processing** - Automatic data extraction using Tesseract.js with Polish language support
- **Smart Categorization** - AI-powered expense categorization using NLP and merchant pattern recognition
- **Project Assignment** - Link expenses to projects/cost centers
- **Form Validation** - Comprehensive validation with real-time feedback
- **Draft Management** - Auto-save functionality every 2 seconds
- **Offline Capability** - Submit expenses offline with background sync
- **Image Preview & Zoom** - Full-featured image gallery with zoom functionality

### Advanced Features
- **Receipt Quality Validation** - Automatic image quality checks (brightness, contrast, sharpness)
- **Bulk Upload Support** - Process multiple receipts simultaneously
- **Smart Suggestions** - ML-based category suggestions with confidence scores
- **Real-time Progress Tracking** - Live processing status indicators
- **Responsive Design** - Optimized for desktop and mobile devices

## 🏗️ Architecture

### Frontend Structure
```
frontend/src/
├── app/dashboard/expenses/
│   ├── page.tsx                 # Expenses dashboard with statistics
│   └── new/page.tsx            # New expense submission page
├── components/expenses/
│   ├── ExpenseSubmissionForm.tsx    # Main submission form with OCR
│   ├── FileUploadZone.tsx          # Drag-drop & camera upload
│   ├── ExpenseFormFields.tsx       # Form input fields
│   ├── ImagePreviewGallery.tsx     # Image preview & zoom
│   ├── OfflineIndicator.tsx        # Network status indicator
│   ├── ProcessingIndicator.tsx     # OCR processing status
│   ├── ExpenseStats.tsx           # Dashboard statistics
│   ├── QuickActions.tsx           # Quick action buttons
│   └── ExpensesList.tsx           # Personal expense history
└── utils/
    ├── draftStorage.ts             # Draft management with IndexedDB
    ├── imageValidation.ts          # Receipt quality validation
    ├── categorization.ts           # Smart categorization engine
    └── offlineQueue.ts             # Offline submission queue
```

### Backend Structure
```
src/
├── routes/
│   ├── expenses.js                 # Expense CRUD & OCR processing
│   ├── categories.js              # Category management
│   └── projects.js                # Project/cost center management
└── middleware/
    ├── auth.js                    # Authentication middleware
    └── upload.js                  # File upload handling
```

### Database Schema
```sql
-- Projects table for cost center assignment
CREATE TABLE "projects" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "budget" DECIMAL(12,2),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

-- Updated expenses table with project support
ALTER TABLE "expenses" ADD COLUMN "projectId" TEXT;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_projectId_fkey" 
    FOREIGN KEY ("projectId") REFERENCES "projects"("id");
```

## 🔧 Technical Implementation

### OCR Processing Pipeline
1. **Image Quality Validation** - Check brightness, contrast, sharpness, resolution
2. **Image Preprocessing** - Enhance image quality using Jimp
3. **OCR Extraction** - Extract text using Tesseract.js with Polish language pack
4. **Data Parsing** - Extract structured data (amount, date, merchant, receipt number)
5. **Form Population** - Auto-fill form fields with extracted data

### Smart Categorization Engine
```typescript
// Uses compromise.js for NLP and string-similarity for matching
const categorizeExpense = (merchantName: string, description: string) => {
  // 1. Check exact merchant matches
  // 2. Analyze keywords using NLP
  // 3. Apply Polish business patterns
  // 4. Return suggestions with confidence scores
};
```

### Offline Capability
- **Service Worker** - Cache assets and API responses
- **IndexedDB** - Store drafts and offline submissions
- **Background Sync** - Automatically submit when back online
- **Queue Management** - Handle submission failures and retries

### Form Validation Schema
```typescript
const expenseFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('PLN'),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  projectId: z.string().optional(),
  merchantName: z.string().optional(),
  receiptNumber: z.string().optional(),
  isReimbursable: z.boolean().default(true),
});
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Prisma CLI
- Modern web browser with ES2020 support

### Installation

1. **Install Dependencies**
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend && npm install

# Install additional packages for new features
npm install react-image-gallery idb workbox-sw @types/react-image-gallery
```

2. **Database Setup**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name add-projects

# Seed database
npx prisma db seed
```

3. **Environment Configuration**
```bash
# Copy environment file
cp .env.example .env

# Configure database URL
DATABASE_URL="postgresql://username:password@localhost:5432/expenseflow"
```

4. **Start Development Servers**
```bash
# Backend (Port 5000)
npm run dev

# Frontend (Port 3000)
cd frontend && npm run dev
```

## 📱 Usage Guide

### For Employees

#### Submitting an Expense
1. **Navigate** to Dashboard → Expenses → New Expense
2. **Upload Receipt** - Drag & drop or use camera to capture receipt
3. **Auto-Processing** - Wait for OCR to extract data automatically
4. **Review & Edit** - Verify extracted information and make corrections
5. **Categorize** - Select category (with AI suggestions)
6. **Assign Project** - Choose project/cost center if applicable
7. **Submit** - Click submit for approval workflow

#### Working Offline
- Form data is automatically saved as drafts
- Submissions are queued when offline
- Automatic sync when connection is restored
- Visual indicators show online/offline status

### For Administrators

#### Managing Projects
```bash
# API endpoints for project management
GET    /api/projects              # List all projects
POST   /api/projects              # Create new project
PUT    /api/projects/:id          # Update project
DELETE /api/projects/:id          # Deactivate project
GET    /api/projects/:id/stats    # Project statistics
```

#### Category Management
- Create and manage expense categories
- Set default VAT rates per category
- Monitor category usage statistics
- Configure category keywords for auto-suggestion

## 🔍 API Documentation

### Expense Endpoints
```bash
# Core expense operations
POST   /api/expenses              # Create new expense
GET    /api/expenses              # List user expenses
GET    /api/expenses/:id          # Get specific expense
PUT    /api/expenses/:id          # Update expense
DELETE /api/expenses/:id          # Delete expense

# OCR and processing
POST   /api/expenses/ocr          # Process receipt with OCR
POST   /api/expenses/upload       # Upload receipt files

# Statistics and reporting
GET    /api/expenses/stats        # User expense statistics
GET    /api/expenses/categories   # Category usage breakdown
```

### Request/Response Examples

#### Create Expense
```json
POST /api/expenses
{
  "title": "Business Lunch",
  "amount": 85.50,
  "currency": "PLN",
  "transactionDate": "2024-12-05",
  "categoryId": "cat_123",
  "projectId": "proj_456",
  "merchantName": "Restaurant XYZ",
  "receiptNumber": "12345",
  "isReimbursable": true
}
```

#### OCR Processing
```json
POST /api/expenses/ocr
Content-Type: multipart/form-data

Response:
{
  "success": true,
  "data": {
    "amount": 85.50,
    "currency": "PLN",
    "date": "2024-12-05",
    "merchant": "Restaurant XYZ",
    "receiptNumber": "12345",
    "confidence": 0.95
  }
}
```

## 🎨 UI/UX Features

### Visual Design
- **Modern Material Design** - Clean, professional interface
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Dark/Light Mode** - Automatic theme switching
- **Accessibility** - WCAG 2.1 AA compliant
- **Polish Localization** - Full Polish language support

### Interactive Elements
- **Animated Progress Bars** - Real-time processing feedback
- **Toast Notifications** - Success/error messages
- **Loading States** - Skeleton screens and spinners
- **Drag Indicators** - Visual feedback for file uploads
- **Zoom & Pan** - Full-featured image viewer

### Performance Optimizations
- **Lazy Loading** - Components load on demand
- **Image Compression** - Automatic image optimization
- **Caching Strategy** - Service worker caching
- **Bundle Splitting** - Optimized JavaScript delivery

## 🔒 Security & Compliance

### Data Protection
- **GDPR Compliance** - Full compliance with EU data protection
- **Local Processing** - OCR runs locally, no data sent to third parties
- **Secure File Storage** - Encrypted file storage with hash verification
- **Access Control** - Role-based permissions system

### Security Features
- **Input Validation** - Comprehensive server-side validation
- **File Type Validation** - Restricted to safe file types
- **Size Limits** - Maximum file size enforcement
- **Rate Limiting** - API rate limiting to prevent abuse

## 📊 Performance Metrics

### OCR Processing
- **Accuracy Target** - 95%+ on clear receipts
- **Processing Time** - <10 seconds average
- **Supported Languages** - Polish (primary), English
- **File Size Limit** - 10MB per file

### System Performance
- **Load Time** - <2 seconds initial page load
- **File Upload** - Progress tracking with compression
- **Offline Storage** - 50MB IndexedDB quota
- **Browser Support** - Chrome 80+, Firefox 74+, Safari 13+

## 🧪 Testing

### Test Coverage
```bash
# Run frontend tests
cd frontend && npm test

# Run backend tests
npm test

# E2E testing
npm run test:e2e
```

### Test Scenarios
- OCR accuracy testing with various receipt formats
- Offline functionality testing
- Form validation testing
- File upload edge cases
- Mobile responsiveness testing

## 📈 Future Enhancements

### Planned Features
- **Multi-language OCR** - Support for Czech, Slovak, German
- **Receipt Analytics** - Spending pattern analysis
- **Integration APIs** - Connect with accounting software
- **Mobile App** - Native iOS/Android applications
- **AI Improvements** - Enhanced categorization accuracy

### Technical Improvements
- **Performance Monitoring** - Real-time performance metrics
- **Error Tracking** - Comprehensive error logging
- **A/B Testing** - Feature flag system
- **Advanced Caching** - Redis caching layer

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request with documentation

### Code Standards
- **TypeScript** - Strict type checking enabled
- **ESLint** - Airbnb configuration
- **Prettier** - Automatic code formatting
- **Husky** - Pre-commit hooks for quality

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

---

**ExpenseFlow Pro** - Making expense management effortless for Polish businesses. 