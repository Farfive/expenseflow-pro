const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class ExpensesPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      expensesList: '[data-testid="expenses-list"]',
      newExpenseButton: '[data-testid="new-expense-button"]',
      searchInput: '[data-testid="search-input"]',
      expenseForm: '[data-testid="expense-form"]',
      amountInput: '[data-testid="amount"]',
      merchantInput: '[data-testid="merchant-name"]',
      saveButton: '[data-testid="save-button"]',
      submitButton: '[data-testid="submit-button"]'
    };
  }

  async goToExpensesList() {
    await this.goto('/dashboard/expenses');
    await this.waitForSelector(this.selectors.expensesList);
  }

  async createNewExpense() {
    await this.goToExpensesList();
    await this.clickElement(this.selectors.newExpenseButton);
  }

  async fillBasicExpenseForm(amount, merchant) {
    await this.fillField(this.selectors.amountInput, amount.toString());
    await this.fillField(this.selectors.merchantInput, merchant);
  }

  async saveExpense() {
    await this.clickElement(this.selectors.saveButton);
    await this.waitForLoadingToComplete();
  }
}

module.exports = ExpensesPage; 