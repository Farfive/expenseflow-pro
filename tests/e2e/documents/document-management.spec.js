const { test, expect } = require('@playwright/test');
const DocumentsPage = require('../../page-objects/DocumentsPage');
const path = require('path');

test.describe('Document Management', () => {
  let documentsPage;

  test.beforeEach(async ({ page }) => {
    documentsPage = new DocumentsPage(page);
  });

  test.describe('Document Upload', () => {
    test('should upload receipt image successfully', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath);
      
      await documentsPage.assertDocumentUploaded('sample-receipt.jpg');
    });

    test('should upload PDF invoice successfully', async () => {
      const invoicePath = path.join(__dirname, '../../fixtures/sample-invoice.pdf');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(invoicePath);
      
      await documentsPage.assertDocumentUploaded('sample-invoice.pdf');
    });

    test('should upload multiple documents at once', async () => {
      const filePaths = [
        path.join(__dirname, '../../fixtures/receipt1.jpg'),
        path.join(__dirname, '../../fixtures/receipt2.jpg'),
        path.join(__dirname, '../../fixtures/invoice1.pdf')
      ];
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadMultipleDocuments(filePaths);
      
      // Verify all documents were uploaded
      const documentCount = await documentsPage.getDocumentCount();
      expect(documentCount).toBeGreaterThanOrEqual(3);
    });

    test('should reject unsupported file types', async () => {
      const textFilePath = path.join(__dirname, '../../fixtures/document.txt');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadInvalidFileAndVerifyError(textFilePath, 'Unsupported file type');
    });

    test('should reject files exceeding size limit', async () => {
      await documentsPage.goToDocuments();
      await documentsPage.openUploadModal();
      
      // Simulate large file upload
      await documentsPage.page.evaluate(() => {
        const input = document.querySelector('[data-testid="file-input"]');
        const file = new File(['x'.repeat(6000000)], 'large-file.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      await documentsPage.assertFileSizeError('File size exceeds 5MB limit');
    });

    test('should support drag and drop upload', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      
      await documentsPage.dragAndDropUpload(receiptPath);
      await documentsPage.assertDocumentUploaded('sample-receipt.jpg');
    });
  });

  test.describe('OCR Processing', () => {
    test('should process receipt and extract data correctly', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/polish-receipt.jpg');
      
      await documentsPage.goToDocuments();
      const extractedData = await documentsPage.uploadReceiptAndVerifyOCR(receiptPath);
      
      expect(parseFloat(extractedData.amount)).toBeGreaterThan(0);
      expect(extractedData.merchant).toBeTruthy();
    });

    test('should process invoice and extract VAT information', async () => {
      const invoicePath = path.join(__dirname, '../../fixtures/vat-invoice.pdf');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(invoicePath);
      await documentsPage.assertOCRCompleted();
      
      const extractedData = await documentsPage.getExtractedData();
      expect(parseFloat(extractedData.vat)).toBeGreaterThan(0);
    });

    test('should handle OCR failure gracefully', async () => {
      const corruptedPath = path.join(__dirname, '../../fixtures/corrupted-image.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(corruptedPath, false);
      
      // Wait for processing and check if it failed
      await documentsPage.waitForOCRProcessing();
      await documentsPage.assertOCRFailed();
    });

    test('should allow OCR retry', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/low-quality-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath);
      
      // If OCR failed, retry
      const status = await documentsPage.getOCRStatus();
      if (status.toLowerCase() === 'failed') {
        await documentsPage.retryOCR();
        await documentsPage.assertOCRCompleted();
      }
    });

    test('should allow manual correction of extracted data', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath);
      await documentsPage.assertOCRCompleted();
      
      // Edit extracted data
      const correctedData = {
        amount: '125.50',
        merchant: 'Corrected Merchant Name',
        date: '2024-01-15'
      };
      
      await documentsPage.editExtractedData(correctedData);
      
      // Verify changes were saved
      const updatedData = await documentsPage.getExtractedData();
      expect(updatedData.amount).toContain('125.50');
      expect(updatedData.merchant).toContain('Corrected Merchant Name');
    });
  });

  test.describe('Document Viewing', () => {
    test('should display document viewer with zoom controls', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath);
      
      await documentsPage.testDocumentViewer(0);
    });

    test('should allow document download', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath);
      await documentsPage.openDocument(0);
      
      const download = await documentsPage.downloadDocument();
      expect(download.suggestedFilename()).toBeTruthy();
    });

    test('should display correct document metadata', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath);
      
      const documentInfo = await documentsPage.getDocumentInfo(0);
      expect(documentInfo.name).toContain('sample-receipt');
      expect(documentInfo.type).toBe('Receipt');
      expect(documentInfo.status).toBe('Processed');
    });
  });

  test.describe('Document Search and Filtering', () => {
    test('should search documents by name', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/test-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath);
      
      await documentsPage.searchDocuments('test-receipt');
      
      const documentCount = await documentsPage.getDocumentCount();
      expect(documentCount).toBeGreaterThan(0);
    });

    test('should filter documents by type', async () => {
      await documentsPage.goToDocuments();
      
      // Upload different document types
      await documentsPage.uploadDocument(path.join(__dirname, '../../fixtures/receipt.jpg'));
      await documentsPage.uploadDocument(path.join(__dirname, '../../fixtures/invoice.pdf'));
      
      // Filter by receipts only
      await documentsPage.filterByType('receipt');
      
      // Verify only receipts are shown
      const documentInfo = await documentsPage.getDocumentInfo(0);
      expect(documentInfo.type.toLowerCase()).toContain('receipt');
    });

    test('should filter documents by processing status', async () => {
      await documentsPage.goToDocuments();
      
      // Filter by processed documents
      await documentsPage.filterByStatus('processed');
      
      // Verify all documents have 'processed' status
      const count = await documentsPage.getDocumentCount();
      for (let i = 0; i < count; i++) {
        const info = await documentsPage.getDocumentInfo(i);
        expect(info.status.toLowerCase()).toContain('processed');
      }
    });
  });

  test.describe('Document Actions', () => {
    test('should create expense from document', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath);
      await documentsPage.openDocument(0);
      
      await documentsPage.createExpenseFromDocument();
      
      // Should redirect to expense form with pre-filled data
      await expect(documentsPage.page).toHaveURL(/\/dashboard\/expenses\/new/);
    });

    test('should delete document', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/delete-test-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath);
      
      const initialCount = await documentsPage.getDocumentCount();
      
      await documentsPage.openDocument(0);
      await documentsPage.deleteDocument();
      
      await documentsPage.goToDocuments();
      const newCount = await documentsPage.getDocumentCount();
      expect(newCount).toBe(initialCount - 1);
    });
  });

  test.describe('Bulk Operations', () => {
    test('should select and delete multiple documents', async () => {
      await documentsPage.goToDocuments();
      
      // Upload multiple documents
      const filePaths = [
        path.join(__dirname, '../../fixtures/bulk-test-1.jpg'),
        path.join(__dirname, '../../fixtures/bulk-test-2.jpg')
      ];
      
      await documentsPage.uploadMultipleDocuments(filePaths);
      
      const initialCount = await documentsPage.getDocumentCount();
      
      // Select first two documents
      await documentsPage.selectDocument(0);
      await documentsPage.selectDocument(1);
      
      await documentsPage.bulkDeleteDocuments();
      
      const newCount = await documentsPage.getDocumentCount();
      expect(newCount).toBe(initialCount - 2);
    });

    test('should retry OCR for multiple documents', async () => {
      await documentsPage.goToDocuments();
      
      // Upload documents that might need OCR retry
      const filePaths = [
        path.join(__dirname, '../../fixtures/low-quality-1.jpg'),
        path.join(__dirname, '../../fixtures/low-quality-2.jpg')
      ];
      
      await documentsPage.uploadMultipleDocuments(filePaths);
      
      // Select all documents
      await documentsPage.selectAllDocuments();
      
      // Retry OCR for selected documents
      await documentsPage.bulkRetryOCR();
      
      // Verify success message
      await documentsPage.waitForSuccessToast('OCR processing started');
    });
  });

  test.describe('Performance', () => {
    test('should upload document within acceptable time', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      
      const startTime = Date.now();
      
      await documentsPage.goToDocuments();
      await documentsPage.uploadDocument(receiptPath, false); // Don't wait for processing
      
      const uploadTime = Date.now() - startTime;
      expect(uploadTime).toBeLessThan(10000); // Should upload within 10 seconds
    });

    test('should process OCR within acceptable time', async () => {
      const receiptPath = path.join(__dirname, '../../fixtures/small-receipt.jpg');
      
      await documentsPage.goToDocuments();
      await documentsPage.openUploadModal();
      await documentsPage.uploadFile(documentsPage.selectors.fileInput, receiptPath);
      await documentsPage.clickElement(documentsPage.selectors.uploadConfirmButton);
      
      const startTime = Date.now();
      await documentsPage.waitForOCRProcessing();
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(30000); // Should process within 30 seconds
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors during upload', async () => {
      await documentsPage.goToDocuments();
      
      // Simulate network failure
      await documentsPage.page.route('**/api/documents/upload', route => {
        route.abort('failed');
      });
      
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      
      await documentsPage.openUploadModal();
      await documentsPage.uploadFile(documentsPage.selectors.fileInput, receiptPath);
      
      await documentsPage.waitForErrorToast('Upload failed');
    });

    test('should handle OCR service unavailable', async () => {
      await documentsPage.goToDocuments();
      
      // Simulate OCR service failure
      await documentsPage.page.route('**/api/documents/*/ocr', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'OCR service unavailable' })
        });
      });
      
      const receiptPath = path.join(__dirname, '../../fixtures/sample-receipt.jpg');
      await documentsPage.uploadDocument(receiptPath, false);
      
      await documentsPage.waitForOCRProcessing();
      await documentsPage.assertOCRFailed();
    });
  });
}); 