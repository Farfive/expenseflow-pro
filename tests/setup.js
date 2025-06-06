const { PrismaClient } = require('@prisma/client');

// Global test setup
global.prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5433/expenseflow_test'
    }
  }
});

// Global test utilities
global.testUtils = {
  // Create test user
  createTestUser: async (userData = {}) => {
    const bcrypt = require('bcryptjs');
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      password: await bcrypt.hash('Test123!', 12),
      firstName: 'Test',
      lastName: 'User',
      isVerified: true,
      isActive: true,
      ...userData
    };

    return global.prisma.user.create({
      data: defaultUser
    });
  },

  // Create test company
  createTestCompany: async (companyData = {}) => {
    const defaultCompany = {
      name: `Test Company ${Date.now()}`,
      vatNumber: `PL${Date.now()}`,
      currency: 'PLN',
      ...companyData
    };

    return global.prisma.company.create({
      data: defaultCompany
    });
  },

  // Generate JWT token for testing
  generateTestToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },

  // Clean up test data
  cleanupTestData: async () => {
    // Delete in reverse order to handle foreign key constraints
    await global.prisma.auditLog.deleteMany({});
    await global.prisma.notification.deleteMany({});
    await global.prisma.approvalRecord.deleteMany({});
    await global.prisma.approvalWorkflow.deleteMany({});
    await global.prisma.expense.deleteMany({});
    await global.prisma.document.deleteMany({});
    await global.prisma.expenseCategory.deleteMany({});
    await global.prisma.companyUser.deleteMany({});
    await global.prisma.company.deleteMany({});
    await global.prisma.user.deleteMany({});
  }
};

// Setup before all tests
beforeAll(async () => {
  // Ensure test database is clean
  await global.testUtils.cleanupTestData();
});

// Cleanup after each test
afterEach(async () => {
  // Optional: cleanup after each test to ensure isolation
  // await global.testUtils.cleanupTestData();
});

// Cleanup after all tests
afterAll(async () => {
  await global.testUtils.cleanupTestData();
  await global.prisma.$disconnect();
}); 