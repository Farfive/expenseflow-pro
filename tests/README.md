# ExpenseFlow Pro Test Suite

## 🧪 Test Structure

This directory contains the complete test automation suite for ExpenseFlow Pro.

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Install Playwright Browsers
```bash
npm run test:setup
```

### Run All Tests
```bash
npm run test:all
```

### Run Specific Test Suites
```bash
# End-to-end tests
npm run test:e2e

# API tests
npm run test:api

# Unit tests
npm run test:unit
```

## 📁 Directory Structure

```
tests/
├── auth/                    # Authentication state management
├── config/                  # Test configuration
├── utils/                   # Test utilities
├── page-objects/           # Page Object Model
├── e2e/                    # End-to-end tests
├── api/                    # API tests
└── fixtures/              # Test data and files
```

## 🔍 Test Reports

View test results:
```bash
npx playwright show-report
```

## 🌐 Multi-Browser Testing

```bash
# Chrome only
npm run test:e2e -- --project=chromium

# Firefox only
npm run test:e2e -- --project=firefox
```

## 📊 Features Tested

- ✅ Authentication flows
- ✅ Expense management
- ✅ Document processing
- ✅ OCR functionality
- ✅ Multi-language support
- ✅ Security testing
- ✅ Performance validation

For detailed information, see [TEST_AUTOMATION_SUMMARY.md](../TEST_AUTOMATION_SUMMARY.md) 