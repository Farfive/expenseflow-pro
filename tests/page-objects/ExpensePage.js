const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class ExpensePage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      // Expense list page
      expensesList: '[data-testid="expenses-list"]',
      newExpenseButton: '[data-testid="new-expense-button"]',
      searchInput: '[data-testid="search-input"]',
      filterButton: '[data-testid="filter-button"]',
      sortDropdown: '[data-testid="sort-dropdown"]',
      
      // Expense form
      expenseForm: '[data-testid="expense-form"]',
      amountInput: '[data-testid="amount"]',
      currencySelect: '[data-testid="currency"]',
      dateInput: '[data-testid="transaction-date"]',
      merchantInput: '[data-testid="merchant-name"]',
      categorySelect: '[data-testid="category"]',
      descriptionInput: '[data-testid="description"]',
      
      // Document upload
      documentUpload: '[data-testid="document-upload"]',
      uploadButton: '[data-testid="upload-button"]',
      documentPreview: '[data-testid="document-preview"]',
      
      // Form actions
      saveButton: '[data-testid="save-button"]',
      submitButton: '[data-testid="submit-button"]',
      cancelButton: '[data-testid="cancel-button"]',
      
      // Expense details
      expenseDetails: '[data-testid="expense-details"]',
      editButton: '[data-testid="edit-button"]',
      deleteButton: '[data-testid="delete-button"]',
      statusBadge: '[data-testid="status-badge"]',
      
      // OCR results
      ocrResults: '[data-testid="ocr-results"]',
      ocrConfidence: '[data-testid="ocr-confidence"]',
      acceptOcrButton: '[data-testid="accept-ocr"]',
      rejectOcrButton: '[data-testid="reject-ocr"]'
    };
  }

  // Navigation methods
  async goToExpensesList() {
    await this.goto('/dashboard/expenses');
    await this.waitForSelector(this.selectors.expensesList);
  }

  async goToNewExpense() {
    await this.goto('/dashboard/expenses/new');
    await this.waitForSelector(this.selectors.expenseForm);
  }

  async goToExpenseDetails(expenseId) {
    await this.goto(`/dashboard/expenses/${expenseId}`);
    await this.waitForSelector(this.selectors.expenseDetails);
  }

  async goToEditExpense(expenseId) {
    await this.goto(`/dashboard/expenses/${expenseId}/edit`);
    await this.waitForSelector(this.selectors.expenseForm);
  }

  // Expense creation methods
  async createNewExpense() {
    await this.goToExpensesList();
    await this.clickElement(this.selectors.newExpenseButton);
    await this.waitForSelector(this.selectors.expenseForm);
  }

  async fillExpenseForm(expenseData) {
    const {
      amount,
      currency = 'PLN',
      date,
      merchant,
      category,
      description,
      documentPath
    } = expenseData;

    if (amount) {
      await this.fillField(this.selectors.amountInput, amount.toString());
    }

    if (currency) {
      await this.selectOption(this.selectors.currencySelect, currency);
    }

    if (date) {
      await this.selectDate(this.selectors.dateInput, date);
    }

    if (merchant) {
      await this.fillField(this.selectors.merchantInput, merchant);
    }

    if (category) {
      await this.selectOption(this.selectors.categorySelect, category);
    }

    if (description) {
      await this.fillField(this.selectors.descriptionInput, description);
    }

    if (documentPath) {
      await this.uploadDocument(documentPath);
    }
  }

  async uploadDocument(filePath) {
    await this.uploadFile(this.selectors.documentUpload, filePath);
    await this.waitForSelector(this.selectors.documentPreview);
  }

  async saveExpenseAsDraft() {
    await this.clickElement(this.selectors.saveButton);
    await this.waitForLoadingToComplete();
    await this.waitForSuccessToast('Expense saved as draft');
  }

  async submitExpense() {
    await this.clickElement(this.selectors.submitButton);
    await this.waitForLoadingToComplete();
    await this.waitForSuccessToast('Expense submitted');
  }

  async cancelExpenseForm() {
    await this.clickElement(this.selectors.cancelButton);
  }

  // OCR interaction methods
  async waitForOCRProcessing() {
    await this.waitForLoadingToComplete();
    await this.waitForSelector(this.selectors.ocrResults);
  }

  async acceptOCRResults() {
    await this.clickElement(this.selectors.acceptOcrButton);
    await this.waitForLoadingToComplete();
  }

  async rejectOCRResults() {
    await this.clickElement(this.selectors.rejectOcrButton);
  }

  async getOCRConfidence() {
    const confidenceText = await this.getText(this.selectors.ocrConfidence);
    return parseFloat(confidenceText.replace('%', ''));
  }

  // Expense list methods
  async searchExpenses(query) {
    await this.search(query, this.selectors.searchInput);
  }

  async filterExpensesByStatus(status) {
    await this.applyFilter('status', status);
  }

  async filterExpensesByCategory(category) {
    await this.applyFilter('category', category);
  }

  async filterExpensesByDateRange(startDate, endDate) {
    await this.selectDateRange('[data-testid="date-from"]', '[data-testid="date-to"]', startDate, endDate);
    await this.waitForLoadingToComplete();
  }

  async sortExpensesBy(field, direction = 'asc') {
    await this.selectOption(this.selectors.sortDropdown, `${field}-${direction}`);
    await this.waitForLoadingToComplete();
  }

  async getExpenseCount() {
    return await this.getTableRowCount(this.selectors.expensesList);
  }

  async clickExpenseRow(rowIndex) {
    await this.clickTableRow(this.selectors.expensesList, rowIndex);
  }

  async getExpenseFromList(rowIndex) {
    const row = `${this.selectors.expensesList} tbody tr:nth-child(${rowIndex})`;
    
    return {
      amount: await this.getTableCellText(this.selectors.expensesList, rowIndex, 1),
      merchant: await this.getTableCellText(this.selectors.expensesList, rowIndex, 2),
      date: await this.getTableCellText(this.selectors.expensesList, rowIndex, 3),
      status: await this.getTableCellText(this.selectors.expensesList, rowIndex, 4)
    };
  }

  // Expense details methods
  async editExpense() {
    await this.clickElement(this.selectors.editButton);
    await this.waitForSelector(this.selectors.expenseForm);
  }

  async deleteExpense() {
    await this.clickElement(this.selectors.deleteButton);
    await this.waitForModal();
    await this.clickElement('[data-testid="confirm-delete"]');
    await this.waitForSuccessToast('Expense deleted');
  }

  async getExpenseStatus() {
    return await this.getText(this.selectors.statusBadge);
  }

  async getExpenseDetails() {
    await this.waitForSelector(this.selectors.expenseDetails);
    
    return {
      amount: await this.getText('[data-testid="detail-amount"]'),
      currency: await this.getText('[data-testid="detail-currency"]'),
      merchant: await this.getText('[data-testid="detail-merchant"]'),
      date: await this.getText('[data-testid="detail-date"]'),
      category: await this.getText('[data-testid="detail-category"]'),
      description: await this.getText('[data-testid="detail-description"]'),
      status: await this.getExpenseStatus()
    };
  }

  // Bulk operations
  async selectExpense(rowIndex) {
    await this.clickElement(`${this.selectors.expensesList} tbody tr:nth-child(${rowIndex}) input[type="checkbox"]`);
  }

  async selectAllExpenses() {
    await this.clickElement(`${this.selectors.expensesList} thead input[type="checkbox"]`);
  }

  async bulkSubmitExpenses() {
    await this.clickElement('[data-testid="bulk-submit"]');
    await this.waitForModal();
    await this.clickElement('[data-testid="confirm-bulk-submit"]');
    await this.waitForSuccessToast('Expenses submitted');
  }

  async bulkDeleteExpenses() {
    await this.clickElement('[data-testid="bulk-delete"]');
    await this.waitForModal();
    await this.clickElement('[data-testid="confirm-bulk-delete"]');
    await this.waitForSuccessToast('Expenses deleted');
  }

  // Validation methods
  async assertExpenseInList(expenseData) {
    await this.searchExpenses(expenseData.merchant);
    const firstExpense = await this.getExpenseFromList(1);
    
    expect(firstExpense.merchant).toContain(expenseData.merchant);
    expect(firstExpense.amount).toContain(expenseData.amount.toString());
  }

  async assertExpenseNotInList(merchant) {
    await this.searchExpenses(merchant);
    const count = await this.getExpenseCount();
    expect(count).toBe(0);
  }

  async assertFormValidationError(fieldSelector, expectedMessage = null) {
    const errorSelector = `${fieldSelector}-error`;
    await this.waitForSelector(errorSelector);
    
    if (expectedMessage) {
      const errorText = await this.getText(errorSelector);
      expect(errorText).toContain(expectedMessage);
    }
  }

  async assertRequiredFieldValidation() {
    // Try to submit empty form
    await this.clickElement(this.selectors.submitButton);
    
    // Check required field errors
    await this.assertFormValidationError(this.selectors.amountInput, 'Amount is required');
    await this.assertFormValidationError(this.selectors.merchantInput, 'Merchant is required');
    await this.assertFormValidationError(this.selectors.dateInput, 'Date is required');
  }

  async assertAmountValidation() {
    const invalidAmounts = ['0', '-10', 'abc', ''];
    
    for (const amount of invalidAmounts) {
      await this.fillField(this.selectors.amountInput, amount);
      await this.assertFormValidationError(this.selectors.amountInput);
      await this.fillField(this.selectors.amountInput, '');
    }
  }

  // Test scenarios
  async createBasicExpense(expenseData) {
    await this.createNewExpense();
    await this.fillExpenseForm(expenseData);
    await this.saveExpenseAsDraft();
    return expenseData;
  }

  async createExpenseWithDocument(expenseData, documentPath) {
    await this.createNewExpense();
    await this.uploadDocument(documentPath);
    await this.waitForOCRProcessing();
    
    // Verify OCR extracted some data
    const confidence = await this.getOCRConfidence();
    expect(confidence).toBeGreaterThan(0);
    
    await this.acceptOCRResults();
    
    // Fill remaining fields if needed
    await this.fillExpenseForm(expenseData);
    await this.submitExpense();
    
    return expenseData;
  }

  async editExistingExpense(expenseId, updateData) {
    await this.goToExpenseDetails(expenseId);
    await this.editExpense();
    await this.fillExpenseForm(updateData);
    await this.saveExpenseAsDraft();
  }

  async submitExpenseForApproval(expenseId) {
    await this.goToExpenseDetails(expenseId);
    const currentStatus = await this.getExpenseStatus();
    
    if (currentStatus === 'Draft') {
      await this.editExpense();
      await this.submitExpense();
    }
  }

  // Multi-currency testing
  async testMultiCurrencyExpense() {
    const currencies = ['PLN', 'EUR', 'USD'];
    const expenses = [];
    
    for (const currency of currencies) {
      const expenseData = {
        amount: 100,
        currency,
        merchant: `Test Merchant ${currency}`,
        category: 'Travel',
        description: `Test expense in ${currency}`
      };
      
      await this.createBasicExpense(expenseData);
      expenses.push(expenseData);
    }
    
    return expenses;
  }

  // Performance testing
  async measureExpenseCreationTime() {
    const startTime = Date.now();
    
    await this.createBasicExpense({
      amount: 100,
      merchant: 'Performance Test Merchant',
      category: 'Travel',
      description: 'Performance test expense'
    });
    
    const endTime = Date.now();
    return endTime - startTime;
  }

  // Pagination testing
  async testExpensesPagination() {
    await this.goToExpensesList();
    
    const totalPages = await this.page.locator('[data-testid="pagination-info"]').textContent();
    const pageCount = parseInt(totalPages.split('of')[1].trim());
    
    // Navigate through all pages
    for (let i = 2; i <= pageCount; i++) {
      await this.goToPage(i);
      await this.waitForLoadingToComplete();
      
      // Verify we're on the correct page
      const currentPage = await this.page.locator('[data-testid="current-page"]').textContent();
      expect(parseInt(currentPage)).toBe(i);
    }
  }
}

module.exports = ExpensePage; 