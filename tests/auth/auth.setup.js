const { test as setup, expect } = require('@playwright/test');
const path = require('path');

const authFile = path.join(__dirname, 'user.json');
const adminAuthFile = path.join(__dirname, 'admin.json');

setup('authenticate as regular user', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Fill login form
  await page.fill('[data-testid="email"]', 'test.user@expenseflow.com');
  await page.fill('[data-testid="password"]', 'TestPassword123!');
  
  // Click login button
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login redirect
  await page.waitForURL('/dashboard');
  
  // Verify we're logged in by checking for user menu or dashboard elements
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});

setup('authenticate as admin user', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Fill login form
  await page.fill('[data-testid="email"]', 'test.admin@expenseflow.com');
  await page.fill('[data-testid="password"]', 'AdminPassword123!');
  
  // Click login button
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login redirect
  await page.waitForURL('/dashboard');
  
  // Verify we're logged in and have admin access
  await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();
  
  // Save authentication state
  await page.context().storageState({ path: adminAuthFile });
}); 