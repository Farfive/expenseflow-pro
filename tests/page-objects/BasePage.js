const { expect } = require('@playwright/test');

class BasePage {
  constructor(page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:4000';
  }

  // Navigation helpers
  async goto(path = '') {
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async reload() {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  async goBack() {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  // Element interaction helpers
  async clickElement(selector, options = {}) {
    await this.page.waitForSelector(selector, { state: 'visible' });
    await this.page.click(selector, options);
  }

  async fillField(selector, value, options = {}) {
    await this.page.waitForSelector(selector, { state: 'visible' });
    await this.page.fill(selector, value, options);
  }

  async selectOption(selector, value) {
    await this.page.waitForSelector(selector, { state: 'visible' });
    await this.page.selectOption(selector, value);
  }

  async uploadFile(selector, filePath) {
    await this.page.waitForSelector(selector);
    await this.page.setInputFiles(selector, filePath);
  }

  async getText(selector) {
    await this.page.waitForSelector(selector);
    return await this.page.textContent(selector);
  }

  async getValue(selector) {
    await this.page.waitForSelector(selector);
    return await this.page.inputValue(selector);
  }

  async isVisible(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      return await this.page.isVisible(selector);
    } catch {
      return false;
    }
  }

  async isEnabled(selector) {
    await this.page.waitForSelector(selector);
    return await this.page.isEnabled(selector);
  }

  async getAttribute(selector, attribute) {
    await this.page.waitForSelector(selector);
    return await this.page.getAttribute(selector, attribute);
  }

  // Wait helpers
  async waitForSelector(selector, options = {}) {
    return await this.page.waitForSelector(selector, {
      timeout: 30000,
      ...options
    });
  }

  async waitForText(text, options = {}) {
    return await this.page.waitForFunction(
      (searchText) => document.body.textContent.includes(searchText),
      text,
      { timeout: 30000, ...options }
    );
  }

  async waitForURL(url, options = {}) {
    return await this.page.waitForURL(url, {
      timeout: 30000,
      ...options
    });
  }

  async waitForResponse(url, options = {}) {
    return await this.page.waitForResponse(url, {
      timeout: 30000,
      ...options
    });
  }

  async waitForRequest(url, options = {}) {
    return await this.page.waitForRequest(url, {
      timeout: 30000,
      ...options
    });
  }

  // Screenshot helpers
  async takeScreenshot(name, options = {}) {
    return await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
      ...options
    });
  }

  async takeElementScreenshot(selector, name, options = {}) {
    const element = await this.page.locator(selector);
    return await element.screenshot({
      path: `test-results/screenshots/${name}.png`,
      ...options
    });
  }

  // Form helpers
  async fillForm(formData) {
    for (const [selector, value] of Object.entries(formData)) {
      if (value !== null && value !== undefined) {
        await this.fillField(selector, value);
      }
    }
  }

  async submitForm(formSelector = 'form') {
    await this.clickElement(`${formSelector} [type="submit"]`);
  }

  // Modal helpers
  async waitForModal(modalSelector = '[role="dialog"]') {
    return await this.waitForSelector(modalSelector);
  }

  async closeModal(closeSelector = '[data-testid="modal-close"]') {
    await this.clickElement(closeSelector);
  }

  // Toast/notification helpers
  async waitForToast(message = null, type = null) {
    const toastSelector = '[data-testid="toast"]';
    await this.waitForSelector(toastSelector);
    
    if (message) {
      await this.waitForText(message);
    }
    
    if (type) {
      const toast = await this.page.locator(toastSelector);
      const toastType = await toast.getAttribute('data-type');
      expect(toastType).toBe(type);
    }
  }

  async waitForSuccessToast(message = null) {
    await this.waitForToast(message, 'success');
  }

  async waitForErrorToast(message = null) {
    await this.waitForToast(message, 'error');
  }

  // Loading state helpers
  async waitForLoadingToComplete(loadingSelector = '[data-testid="loading"]') {
    try {
      await this.page.waitForSelector(loadingSelector, { timeout: 1000 });
      await this.page.waitForSelector(loadingSelector, { 
        state: 'detached', 
        timeout: 30000 
      });
    } catch {
      // Loading indicator might not appear for fast operations
    }
  }

  // Table helpers
  async getTableRowCount(tableSelector = 'table') {
    const rows = await this.page.locator(`${tableSelector} tbody tr`);
    return await rows.count();
  }

  async getTableCellText(tableSelector, row, column) {
    const cell = await this.page.locator(
      `${tableSelector} tbody tr:nth-child(${row}) td:nth-child(${column})`
    );
    return await cell.textContent();
  }

  async clickTableRow(tableSelector, row) {
    await this.clickElement(
      `${tableSelector} tbody tr:nth-child(${row})`
    );
  }

  // Pagination helpers
  async goToNextPage(nextButtonSelector = '[data-testid="pagination-next"]') {
    await this.clickElement(nextButtonSelector);
    await this.waitForLoadingToComplete();
  }

  async goToPreviousPage(prevButtonSelector = '[data-testid="pagination-prev"]') {
    await this.clickElement(prevButtonSelector);
    await this.waitForLoadingToComplete();
  }

  async goToPage(pageNumber, pageButtonSelector = null) {
    const selector = pageButtonSelector || `[data-testid="pagination-page-${pageNumber}"]`;
    await this.clickElement(selector);
    await this.waitForLoadingToComplete();
  }

  // Search helpers
  async search(query, searchInputSelector = '[data-testid="search-input"]') {
    await this.fillField(searchInputSelector, query);
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingToComplete();
  }

  async clearSearch(searchInputSelector = '[data-testid="search-input"]') {
    await this.fillField(searchInputSelector, '');
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingToComplete();
  }

  // Filter helpers
  async applyFilter(filterType, value, filterSelector = null) {
    const selector = filterSelector || `[data-testid="filter-${filterType}"]`;
    await this.selectOption(selector, value);
    await this.waitForLoadingToComplete();
  }

  async clearFilters(clearButtonSelector = '[data-testid="clear-filters"]') {
    await this.clickElement(clearButtonSelector);
    await this.waitForLoadingToComplete();
  }

  // Date picker helpers
  async selectDate(datePickerSelector, date) {
    await this.clickElement(datePickerSelector);
    // Implementation depends on the date picker component being used
    // This is a placeholder for the actual date selection logic
    await this.page.keyboard.type(date);
    await this.page.keyboard.press('Enter');
  }

  async selectDateRange(startDateSelector, endDateSelector, startDate, endDate) {
    await this.selectDate(startDateSelector, startDate);
    await this.selectDate(endDateSelector, endDate);
  }

  // File download helpers
  async downloadFile(downloadTriggerSelector) {
    const downloadPromise = this.page.waitForEvent('download');
    await this.clickElement(downloadTriggerSelector);
    const download = await downloadPromise;
    return download;
  }

  // Drag and drop helpers
  async dragAndDrop(sourceSelector, targetSelector) {
    await this.page.dragAndDrop(sourceSelector, targetSelector);
  }

  // Browser helpers
  async getBrowserContext() {
    return this.page.context();
  }

  async newPage() {
    const context = await this.getBrowserContext();
    return await context.newPage();
  }

  // Local storage helpers
  async setLocalStorage(key, value) {
    await this.page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key, value }
    );
  }

  async getLocalStorage(key) {
    return await this.page.evaluate(
      (key) => localStorage.getItem(key),
      key
    );
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }

  // Session storage helpers
  async setSessionStorage(key, value) {
    await this.page.evaluate(
      ({ key, value }) => sessionStorage.setItem(key, value),
      { key, value }
    );
  }

  async getSessionStorage(key) {
    return await this.page.evaluate(
      (key) => sessionStorage.getItem(key),
      key
    );
  }

  // Cookie helpers
  async getCookies() {
    return await this.page.context().cookies();
  }

  async setCookie(cookie) {
    await this.page.context().addCookies([cookie]);
  }

  // Performance helpers
  async measurePageLoadTime() {
    const startTime = Date.now();
    await this.waitForPageLoad();
    return Date.now() - startTime;
  }

  // Accessibility helpers
  async checkAccessibility() {
    // This would integrate with axe-core or similar accessibility testing tools
    // For now, it's a placeholder
    console.log('Accessibility check placeholder');
  }

  // Custom assertions
  async assertElementExists(selector, message = null) {
    const element = await this.page.locator(selector);
    await expect(element).toBeVisible({ 
      timeout: 10000,
      message: message || `Element ${selector} should be visible`
    });
  }

  async assertElementNotExists(selector, message = null) {
    const element = await this.page.locator(selector);
    await expect(element).not.toBeVisible({
      timeout: 10000,
      message: message || `Element ${selector} should not be visible`
    });
  }

  async assertTextContent(selector, expectedText, message = null) {
    const element = await this.page.locator(selector);
    await expect(element).toHaveText(expectedText, {
      timeout: 10000,
      message: message || `Element ${selector} should contain text: ${expectedText}`
    });
  }

  async assertURL(expectedURL, message = null) {
    await expect(this.page).toHaveURL(expectedURL, {
      timeout: 10000,
      message: message || `Page should have URL: ${expectedURL}`
    });
  }

  async assertTitle(expectedTitle, message = null) {
    await expect(this.page).toHaveTitle(expectedTitle, {
      timeout: 10000,
      message: message || `Page should have title: ${expectedTitle}`
    });
  }
}

module.exports = BasePage; 