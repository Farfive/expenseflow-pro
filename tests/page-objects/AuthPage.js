const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class AuthPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Selectors
    this.selectors = {
      // Login form
      loginForm: '[data-testid="login-form"]',
      emailInput: '[data-testid="email"]',
      passwordInput: '[data-testid="password"]',
      loginButton: '[data-testid="login-button"]',
      rememberMeCheckbox: '[data-testid="remember-me"]',
      forgotPasswordLink: '[data-testid="forgot-password-link"]',
      
      // Registration form
      registerForm: '[data-testid="register-form"]',
      firstNameInput: '[data-testid="firstName"]',
      lastNameInput: '[data-testid="lastName"]',
      companyInput: '[data-testid="company"]',
      confirmPasswordInput: '[data-testid="confirmPassword"]',
      registerButton: '[data-testid="register-button"]',
      termsCheckbox: '[data-testid="terms-checkbox"]',
      
      // Password reset form
      resetForm: '[data-testid="reset-form"]',
      resetEmailInput: '[data-testid="reset-email"]',
      resetButton: '[data-testid="reset-button"]',
      
      // Common elements
      errorMessage: '[data-testid="error-message"]',
      successMessage: '[data-testid="success-message"]',
      loadingSpinner: '[data-testid="loading"]',
      switchToRegister: '[data-testid="switch-to-register"]',
      switchToLogin: '[data-testid="switch-to-login"]'
    };
  }

  // Navigation methods
  async goToLogin() {
    await this.goto('/auth/login');
    await this.waitForSelector(this.selectors.loginForm);
  }

  async goToRegister() {
    await this.goto('/auth/register');
    await this.waitForSelector(this.selectors.registerForm);
  }

  // Login methods
  async login(credentials) {
    await this.goToLogin();
    await this.fillLoginForm(credentials);
    await this.submitLogin();
  }

  async fillLoginForm({ email, password, rememberMe = false }) {
    await this.fillField(this.selectors.emailInput, email);
    await this.fillField(this.selectors.passwordInput, password);
    
    if (rememberMe) {
      await this.clickElement(this.selectors.rememberMeCheckbox);
    }
  }

  async submitLogin() {
    await this.clickElement(this.selectors.loginButton);
    await this.waitForLoadingToComplete();
  }

  async loginWithValidCredentials() {
    await this.login({
      email: 'test.user@expenseflow.com',
      password: 'TestPassword123!'
    });
  }

  // Registration methods
  async register(userData) {
    await this.goToRegister();
    await this.fillRegistrationForm(userData);
    await this.submitRegistration();
  }

  async fillRegistrationForm({ 
    firstName, 
    lastName, 
    email, 
    password, 
    confirmPassword, 
    company,
    acceptTerms = true 
  }) {
    await this.fillField(this.selectors.firstNameInput, firstName);
    await this.fillField(this.selectors.lastNameInput, lastName);
    await this.fillField(this.selectors.emailInput, email);
    await this.fillField(this.selectors.passwordInput, password);
    await this.fillField(this.selectors.confirmPasswordInput, confirmPassword || password);
    
    if (company) {
      await this.fillField(this.selectors.companyInput, company);
    }
    
    if (acceptTerms) {
      await this.clickElement(this.selectors.termsCheckbox);
    }
  }

  async submitRegistration() {
    await this.clickElement(this.selectors.registerButton);
    await this.waitForLoadingToComplete();
  }

  // Validation methods
  async waitForLoginSuccess() {
    await this.waitForURL('/dashboard', { timeout: 10000 });
  }

  async waitForRegistrationSuccess() {
    await this.waitForSuccessToast('Registration successful');
  }

  async assertLoginError(expectedMessage = null) {
    await this.waitForSelector(this.selectors.errorMessage);
    
    if (expectedMessage) {
      const errorText = await this.getText(this.selectors.errorMessage);
      expect(errorText).toContain(expectedMessage);
    }
  }
}

module.exports = AuthPage; 