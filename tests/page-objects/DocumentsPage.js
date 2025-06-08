const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class DocumentsPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      // Document list
      documentsList: '[data-testid="documents-list"]',
      uploadButton: '[data-testid="upload-document"]',
      searchInput: '[data-testid="search-documents"]',
      filterType: '[data-testid="filter-type"]',
      filterStatus: '[data-testid="filter-status"]',
      
      // Upload modal
      uploadModal: '[data-testid="upload-modal"]',
      fileInput: '[data-testid="file-input"]',
      dragDropArea: '[data-testid="drag-drop-area"]',
      uploadProgressBar: '[data-testid="upload-progress"]',
      uploadConfirmButton: '[data-testid="confirm-upload"]',
      
      // Document details
      documentPreview: '[data-testid="document-preview"]',
      documentViewer: '[data-testid="document-viewer"]',
      zoomInButton: '[data-testid="zoom-in"]',
      zoomOutButton: '[data-testid="zoom-out"]',
      downloadButton: '[data-testid="download-document"]',
      deleteButton: '[data-testid="delete-document"]',
      
      // OCR processing
      ocrStatus: '[data-testid="ocr-status"]',
      ocrProgress: '[data-testid="ocr-progress"]',
      ocrResults: '[data-testid="ocr-results"]',
      ocrConfidence: '[data-testid="ocr-confidence"]',
      retryOcrButton: '[data-testid="retry-ocr"]',
      
      // Extracted data
      extractedAmount: '[data-testid="extracted-amount"]',
      extractedMerchant: '[data-testid="extracted-merchant"]',
      extractedDate: '[data-testid="extracted-date"]',
      extractedVat: '[data-testid="extracted-vat"]',
      
      // Actions
      createExpenseButton: '[data-testid="create-expense-from-document"]',
      editDataButton: '[data-testid="edit-extracted-data"]',
      saveDataButton: '[data-testid="save-extracted-data"]'
    };
  }

  // Navigation methods
  async goToDocuments() {
    await this.goto('/dashboard/documents');
    await this.waitForSelector(this.selectors.documentsList);
  }

  // Document upload methods
  async openUploadModal() {
    await this.clickElement(this.selectors.uploadButton);
    await this.waitForSelector(this.selectors.uploadModal);
  }

  async uploadDocument(filePath, waitForProcessing = true) {
    await this.openUploadModal();
    await this.uploadFile(this.selectors.fileInput, filePath);
    await this.clickElement(this.selectors.uploadConfirmButton);
    
    if (waitForProcessing) {
      await this.waitForUploadComplete();
      await this.waitForOCRProcessing();
    }
  }

  async dragAndDropUpload(filePath) {
    await this.goToDocuments();
    
    // Simulate drag and drop
    await this.page.setInputFiles(this.selectors.fileInput, filePath);
    await this.waitForUploadComplete();
    await this.waitForOCRProcessing();
  }

  async uploadMultipleDocuments(filePaths) {
    await this.openUploadModal();
    await this.page.setInputFiles(this.selectors.fileInput, filePaths);
    await this.clickElement(this.selectors.uploadConfirmButton);
    
    // Wait for all uploads to complete
    for (let i = 0; i < filePaths.length; i++) {
      await this.waitForUploadComplete();
    }
  }

  async waitForUploadComplete() {
    // Wait for upload progress to complete
    await this.waitForSelector(this.selectors.uploadProgressBar);
    await this.page.waitForSelector(this.selectors.uploadProgressBar, { 
      state: 'detached',
      timeout: 30000 
    });
  }

  async waitForOCRProcessing() {
    // Wait for OCR status to change from 'processing' to 'completed'
    await this.waitForSelector(this.selectors.ocrStatus);
    
    await this.page.waitForFunction(() => {
      const statusElement = document.querySelector('[data-testid="ocr-status"]');
      return statusElement && statusElement.textContent !== 'processing';
    }, { timeout: 60000 });
  }

  // Document viewing methods
  async openDocument(documentIndex = 0) {
    const documentRows = this.page.locator('[data-testid="document-row"]');
    await documentRows.nth(documentIndex).click();
    await this.waitForSelector(this.selectors.documentViewer);
  }

  async zoomIn() {
    await this.clickElement(this.selectors.zoomInButton);
  }

  async zoomOut() {
    await this.clickElement(this.selectors.zoomOutButton);
  }

  async downloadDocument() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.clickElement(this.selectors.downloadButton);
    return await downloadPromise;
  }

  async deleteDocument() {
    await this.clickElement(this.selectors.deleteButton);
    await this.waitForModal();
    await this.clickElement('[data-testid="confirm-delete"]');
    await this.waitForSuccessToast('Document deleted');
  }

  // OCR interaction methods
  async getOCRStatus() {
    return await this.getText(this.selectors.ocrStatus);
  }

  async getOCRConfidence() {
    const confidenceText = await this.getText(this.selectors.ocrConfidence);
    return parseFloat(confidenceText.replace('%', ''));
  }

  async retryOCR() {
    await this.clickElement(this.selectors.retryOcrButton);
    await this.waitForOCRProcessing();
  }

  async getExtractedData() {
    await this.waitForSelector(this.selectors.ocrResults);
    
    return {
      amount: await this.getText(this.selectors.extractedAmount),
      merchant: await this.getText(this.selectors.extractedMerchant),
      date: await this.getText(this.selectors.extractedDate),
      vat: await this.getText(this.selectors.extractedVat)
    };
  }

  async editExtractedData(newData) {
    await this.clickElement(this.selectors.editDataButton);
    
    if (newData.amount) {
      await this.fillField(this.selectors.extractedAmount, newData.amount);
    }
    if (newData.merchant) {
      await this.fillField(this.selectors.extractedMerchant, newData.merchant);
    }
    if (newData.date) {
      await this.fillField(this.selectors.extractedDate, newData.date);
    }
    if (newData.vat) {
      await this.fillField(this.selectors.extractedVat, newData.vat);
    }
    
    await this.clickElement(this.selectors.saveDataButton);
    await this.waitForSuccessToast('Data updated');
  }

  async createExpenseFromDocument() {
    await this.clickElement(this.selectors.createExpenseButton);
    await this.waitForURL('/dashboard/expenses/new');
    
    // Verify extracted data is pre-filled in expense form
    const amount = await this.getValue('[data-testid="amount"]');
    const merchant = await this.getValue('[data-testid="merchant-name"]');
    
    expect(parseFloat(amount)).toBeGreaterThan(0);
    expect(merchant).not.toBe('');
  }

  // Search and filter methods
  async searchDocuments(query) {
    await this.search(query, this.selectors.searchInput);
  }

  async filterByType(type) {
    await this.selectOption(this.selectors.filterType, type);
    await this.waitForLoadingToComplete();
  }

  async filterByStatus(status) {
    await this.selectOption(this.selectors.filterStatus, status);
    await this.waitForLoadingToComplete();
  }

  async getDocumentCount() {
    const documents = this.page.locator('[data-testid="document-row"]');
    return await documents.count();
  }

  async getDocumentInfo(index) {
    const row = this.page.locator('[data-testid="document-row"]').nth(index);
    
    return {
      name: await row.locator('[data-testid="document-name"]').textContent(),
      type: await row.locator('[data-testid="document-type"]').textContent(),
      status: await row.locator('[data-testid="document-status"]').textContent(),
      uploadDate: await row.locator('[data-testid="upload-date"]').textContent()
    };
  }

  // Validation methods
  async assertDocumentUploaded(filename) {
    await this.searchDocuments(filename);
    const count = await this.getDocumentCount();
    expect(count).toBeGreaterThan(0);
  }

  async assertOCRCompleted() {
    const status = await this.getOCRStatus();
    expect(status.toLowerCase()).toBe('completed');
  }

  async assertOCRFailed() {
    const status = await this.getOCRStatus();
    expect(status.toLowerCase()).toBe('failed');
  }

  async assertExtractedDataExists() {
    const data = await this.getExtractedData();
    expect(data.amount).not.toBe('');
    expect(data.merchant).not.toBe('');
  }

  async assertFileTypeError(expectedMessage) {
    await this.waitForErrorToast(expectedMessage);
  }

  async assertFileSizeError(expectedMessage) {
    await this.waitForErrorToast(expectedMessage);
  }

  // Bulk operations
  async selectDocument(index) {
    const checkbox = this.page.locator('[data-testid="document-row"]').nth(index).locator('input[type="checkbox"]');
    await checkbox.check();
  }

  async selectAllDocuments() {
    await this.clickElement('[data-testid="select-all-documents"]');
  }

  async bulkDeleteDocuments() {
    await this.clickElement('[data-testid="bulk-delete"]');
    await this.waitForModal();
    await this.clickElement('[data-testid="confirm-bulk-delete"]');
    await this.waitForSuccessToast('Documents deleted');
  }

  async bulkRetryOCR() {
    await this.clickElement('[data-testid="bulk-retry-ocr"]');
    await this.waitForSuccessToast('OCR processing started');
  }

  // Test helper methods
  async uploadReceiptAndVerifyOCR(receiptPath) {
    await this.uploadDocument(receiptPath);
    await this.assertOCRCompleted();
    
    const confidence = await this.getOCRConfidence();
    expect(confidence).toBeGreaterThan(70); // Expect at least 70% confidence
    
    await this.assertExtractedDataExists();
    return await this.getExtractedData();
  }

  async uploadInvalidFileAndVerifyError(filePath, expectedError) {
    await this.openUploadModal();
    await this.uploadFile(this.selectors.fileInput, filePath);
    await this.assertFileTypeError(expectedError);
  }

  async testDocumentViewer(documentIndex = 0) {
    await this.openDocument(documentIndex);
    
    // Test zoom functionality
    await this.zoomIn();
    await this.zoomOut();
    
    // Test document download
    const download = await this.downloadDocument();
    expect(download).toBeTruthy();
  }
}

module.exports = DocumentsPage; 