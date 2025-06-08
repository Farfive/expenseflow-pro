const { test, expect } = require('@playwright/test');
const AuthPage = require('../../page-objects/AuthPage');
const TestDataGenerator = require('../../utils/test-data-generator');

test.describe('Authentication', () => {
  let authPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async () => {
      await authPage.loginWithValidCredentials();
      await authPage.waitForLoginSuccess();
      await authPage.assertURL('/dashboard');
    });

    test('should show error for invalid credentials', async () => {
      await authPage.login({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
      
      await authPage.assertLoginError('Invalid credentials');
    });

    test('should show validation errors for empty fields', async () => {
      await authPage.goToLogin();
      await authPage.submitLogin();
      
      await authPage.assertFormValidationError(authPage.selectors.emailInput, 'Email is required');
      await authPage.assertFormValidationError(authPage.selectors.passwordInput, 'Password is required');
    });

    test('should validate email format', async () => {
      await authPage.goToLogin();
      await authPage.fillField(authPage.selectors.emailInput, 'invalid-email');
      await authPage.submitLogin();
      
      await authPage.assertFormValidationError(authPage.selectors.emailInput, 'Invalid email format');
    });

    test('should remember user when remember me is checked', async () => {
      await authPage.login({
        email: 'test.user@expenseflow.com',
        password: 'TestPassword123!',
        rememberMe: true
      });
      
      await authPage.waitForLoginSuccess();
      
      // Reload page and verify user is still logged in
      await authPage.reload();
      await authPage.assertURL('/dashboard');
    });
  });

  test.describe('Registration', () => {
    test('should register new user with valid data', async () => {
      const userData = TestDataGenerator.generateUser();
      
      await authPage.register(userData);
      await authPage.waitForRegistrationSuccess();
    });

    test('should show error for existing email', async () => {
      await authPage.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'test.user@expenseflow.com', // Existing email
        password: 'Password123!',
        company: 'Test Company'
      });
      
      await authPage.assertRegistrationError('Email already exists');
    });

    test('should validate password requirements', async () => {
      await authPage.goToRegister();
      
      const weakPasswords = [
        '123',
        'password',
        'PASSWORD',
        'password123',
        'Password'
      ];
      
      for (const password of weakPasswords) {
        await authPage.fillField(authPage.selectors.passwordInput, password);
        await authPage.assertFormValidationError(authPage.selectors.passwordInput);
        await authPage.fillField(authPage.selectors.passwordInput, '');
      }
    });

    test('should validate password confirmation', async () => {
      await authPage.goToRegister();
      await authPage.fillField(authPage.selectors.passwordInput, 'Password123!');
      await authPage.fillField(authPage.selectors.confirmPasswordInput, 'DifferentPassword123!');
      
      await authPage.assertFormValidationError(authPage.selectors.confirmPasswordInput, 'Passwords must match');
    });

    test('should require terms acceptance', async () => {
      const userData = TestDataGenerator.generateUser();
      userData.acceptTerms = false;
      
      await authPage.goToRegister();
      await authPage.fillRegistrationForm(userData);
      await authPage.submitRegistration();
      
      await authPage.assertFormValidationError(authPage.selectors.termsCheckbox, 'You must accept the terms');
    });
  });

  test.describe('Form Navigation', () => {
    test('should switch between login and registration forms', async () => {
      await authPage.goToLogin();
      await authPage.switchToRegister();
      await authPage.assertElementExists(authPage.selectors.registerForm);
      
      await authPage.switchToLogin();
      await authPage.assertElementExists(authPage.selectors.loginForm);
    });

    test('should navigate to forgot password from login', async () => {
      await authPage.goToLogin();
      await authPage.goToForgotPasswordFromLogin();
      await authPage.assertElementExists(authPage.selectors.resetForm);
    });
  });

  test.describe('Security', () => {
    test('should prevent SQL injection attacks', async () => {
      const sqlInjectionStrings = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "admin'--"
      ];

      for (const injectionString of sqlInjectionStrings) {
        await authPage.login({
          email: injectionString,
          password: injectionString
        });
        
        await authPage.assertLoginError();
        await authPage.goToLogin(); // Reset form
      }
    });

    test('should prevent XSS attacks', async () => {
      const xssStrings = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">'
      ];

      for (const xssString of xssStrings) {
        await authPage.login({
          email: xssString,
          password: 'password'
        });
        
        await authPage.assertLoginError();
        await authPage.goToLogin(); // Reset form
      }
    });

    test('should implement rate limiting', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await authPage.login({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        
        if (i < 5) {
          await authPage.assertLoginError('Invalid credentials');
        } else {
          await authPage.assertLoginError('Too many attempts');
        }
        
        await authPage.goToLogin();
      }
    });
  });

  test.describe('Internationalization', () => {
    test('should display UI in Polish', async () => {
      await authPage.goToLogin();
      await authPage.changeLanguage('pl');
      
      // Verify Polish text is displayed
      await authPage.assertTextContent(authPage.selectors.loginButton, 'Zaloguj się');
    });

    test('should display UI in German', async () => {
      await authPage.goToLogin();
      await authPage.changeLanguage('de');
      
      // Verify German text is displayed
      await authPage.assertTextContent(authPage.selectors.loginButton, 'Anmelden');
    });

    test('should maintain language preference after login', async () => {
      await authPage.goToLogin();
      await authPage.changeLanguage('pl');
      await authPage.loginWithValidCredentials();
      await authPage.waitForLoginSuccess();
      
      // Verify language is maintained in dashboard
      await authPage.assertTextContent('[data-testid="dashboard-title"]', 'Pulpit');
    });
  });

  test.describe('Performance', () => {
    test('should login within acceptable time', async () => {
      const loginTime = await authPage.measureLoginPerformance();
      expect(loginTime).toBeLessThan(5000); // Should login within 5 seconds
    });

    test('should load login page quickly', async () => {
      const loadTime = await authPage.measurePageLoadTime();
      await authPage.goToLogin();
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form accessibility', async () => {
      await authPage.checkLoginFormAccessibility();
    });

    test('should support keyboard navigation', async () => {
      await authPage.goToLogin();
      
      // Navigate through form using tab
      await authPage.page.keyboard.press('Tab');
      await expect(authPage.page.locator(authPage.selectors.emailInput)).toBeFocused();
      
      await authPage.page.keyboard.press('Tab');
      await expect(authPage.page.locator(authPage.selectors.passwordInput)).toBeFocused();
      
      await authPage.page.keyboard.press('Tab');
      await expect(authPage.page.locator(authPage.selectors.loginButton)).toBeFocused();
    });
  });
}); 