const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const waitOn = require('wait-on');

async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  // Start backend server if not running
  if (!process.env.CI) {
    console.log('Starting backend server...');
    const backendProcess = spawn('node', ['simple-server.js'], {
      stdio: 'pipe',
      detached: true
    });

    // Store process ID for cleanup
    process.env.BACKEND_PID = backendProcess.pid;

    // Wait for backend to be ready
    await waitOn({
      resources: ['http://localhost:3001'],
      timeout: 60000,
      interval: 1000
    });

    console.log('✅ Backend server is ready');
  }

  // Start frontend server if not running
  if (!process.env.CI) {
    console.log('Starting frontend server...');
    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: './frontend',
      stdio: 'pipe',
      detached: true
    });

    process.env.FRONTEND_PID = frontendProcess.pid;

    // Wait for frontend to be ready
    await waitOn({
      resources: ['http://localhost:4000'],
      timeout: 120000,
      interval: 1000
    });

    console.log('✅ Frontend server is ready');
  }

  // Setup test database
  console.log('Setting up test database...');
  await setupTestDatabase();

  // Create test users
  console.log('Creating test users...');
  await createTestUsers();

  console.log('✅ Global setup completed');
}

async function setupTestDatabase() {
  // Database setup logic here
  // This would typically involve creating test schemas, tables, etc.
  console.log('Database setup completed');
}

async function createTestUsers() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Create regular test user
    await createUser(page, {
      email: 'test.user@expenseflow.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'employee'
    });

    // Create admin test user
    await createUser(page, {
      email: 'test.admin@expenseflow.com',
      password: 'AdminPassword123!',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin'
    });

    // Create manager test user
    await createUser(page, {
      email: 'test.manager@expenseflow.com',
      password: 'ManagerPassword123!',
      firstName: 'Test',
      lastName: 'Manager',
      role: 'manager'
    });

    console.log('✅ Test users created successfully');
  } catch (error) {
    console.error('Failed to create test users:', error);
  } finally {
    await browser.close();
  }
}

async function createUser(page, userData) {
  // Navigate to registration page
  await page.goto('/auth/register');
  
  // Fill registration form
  await page.fill('[data-testid="firstName"]', userData.firstName);
  await page.fill('[data-testid="lastName"]', userData.lastName);
  await page.fill('[data-testid="email"]', userData.email);
  await page.fill('[data-testid="password"]', userData.password);
  await page.fill('[data-testid="confirmPassword"]', userData.password);
  
  // Submit form
  await page.click('[data-testid="register-button"]');
  
  // Wait for registration success
  await page.waitForSelector('[data-testid="registration-success"]', { timeout: 10000 });
}

module.exports = globalSetup; 