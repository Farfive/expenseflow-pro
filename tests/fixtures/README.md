# Test Fixtures

This directory contains sample files and test data used by the automated test suite.

## Document Samples

### Receipts
- `sample-receipt.jpg` - Standard grocery receipt in Polish
- `polish-receipt.jpg` - Polish receipt with clear text for OCR testing
- `low-quality-receipt.jpg` - Poor quality receipt for OCR failure testing
- `receipt1.jpg`, `receipt2.jpg` - Multiple receipts for bulk testing

### Invoices
- `sample-invoice.pdf` - Standard VAT invoice
- `vat-invoice.pdf` - Invoice with VAT information
- `invoice1.pdf` - Additional invoice for testing

### Bank Statements
- `bank-statement.pdf` - Sample bank statement
- `bank-statement.csv` - CSV format bank statement
- `bank-statement.xlsx` - Excel format bank statement

### Invalid Files
- `document.txt` - Text file for unsupported format testing
- `corrupted-image.jpg` - Corrupted image for error handling testing
- `large-file.jpg` - Large file for size limit testing (if needed)

## Test Data

### JSON Files
- `test-users.json` - Sample user data for testing
- `test-expenses.json` - Sample expense data
- `test-companies.json` - Sample company data

## Usage

These fixtures are used by:
- E2E tests for document upload and processing
- OCR accuracy testing
- Error handling scenarios
- Performance testing with different file sizes
- Multi-format support testing

## Adding New Fixtures

When adding new test fixtures:
1. Use realistic data that reflects actual use cases
2. Include Polish language content for localization testing
3. Ensure files are appropriately sized for test performance
4. Document the purpose of each fixture in this README
5. Consider privacy - use only synthetic or anonymized data

## File Size Guidelines

- Small files (< 100KB) for basic functionality tests
- Medium files (100KB - 1MB) for standard use case testing  
- Large files (1MB - 5MB) for performance and limit testing
- Oversized files (> 5MB) for error condition testing 