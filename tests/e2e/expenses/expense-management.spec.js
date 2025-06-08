const { test, expect } = require('@playwright/test');
const ExpensesPage = require('../../page-objects/ExpensesPage');
const TestDataGenerator = require('../../utils/test-data-generator');
const path = require('path');

test.describe('Expense Management', () => {
  let expensesPage;

  test.beforeEach(async ({ page }) => {
    expensesPage = new ExpensesPage(page);
  });

  test.describe('Expense Creation', () => {
    test('should create basic expense manually', async () => {
      const expenseData = TestDataGenerator.generateExpense();
      
      await expensesPage.createNewExpense();
      await expensesPage.fillBasicExpenseForm(expenseData.amount, expenseData.merchantName);
      await expensesPage.saveExpense();
      
      // Verify expense was created
      await expensesPage.goToExpensesList();
      await expensesPage.search(expenseData.merchantName);
      await expect(expensesPage.page.locator(expensesPage.selectors.expensesList)).toContainText(expenseData.merchantName);
    });

    test('should validate required fields', async () => {
      await expensesPage.createNewExpense();
      
      // Try to save without filling required fields
      await expensesPage.saveExpense();
      
      // Check for validation errors
      await expect(expensesPage.page.locator('[data-testid="amount-error"]')).toBeVisible();
      await expect(expensesPage.page.locator('[data-testid="merchant-error"]')).toBeVisible();
    });

    test('should handle different currencies', async () => {
      const currencies = ['PLN', 'EUR', 'USD'];
      
      for (const currency of currencies) {
        const expenseData = TestDataGenerator.generateExpense({ currency });
        
        await expensesPage.createNewExpense();
        await expensesPage.fillBasicExpenseForm(expenseData.amount, `${expenseData.merchantName} ${currency}`);
        
        // Select currency
        await expensesPage.page.selectOption('[data-testid="currency"]', currency);
        await expensesPage.saveExpense();
        
        // Verify currency is saved correctly
        await expensesPage.goToExpensesList();
        await expensesPage.search(`${expenseData.merchantName} ${currency}`);
        await expect(expensesPage.page.locator(expensesPage.selectors.expensesList)).toContainText(currency);
      }
    });
  });

  test.describe('Expense List Management', () => {
    test('should display expenses in list', async () => {
      await expensesPage.goToExpensesList();
      
      // Verify list is displayed
      await expect(expensesPage.page.locator(expensesPage.selectors.expensesList)).toBeVisible();
    });

    test('should search expenses by merchant name', async () => {
      // First create a test expense
      const expenseData = TestDataGenerator.generateExpense();
      await expensesPage.createNewExpense();
      await expensesPage.fillBasicExpenseForm(expenseData.amount, expenseData.merchantName);
      await expensesPage.saveExpense();
      
      // Now search for it
      await expensesPage.goToExpensesList();
      await expensesPage.search(expenseData.merchantName);
      
      // Verify search results
      await expect(expensesPage.page.locator(expensesPage.selectors.expensesList)).toContainText(expenseData.merchantName);
    });
  });

  test.describe('Performance', () => {
    test('should load expense list quickly', async () => {
      const startTime = Date.now();
      await expensesPage.goToExpensesList();
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });
  });
}); 