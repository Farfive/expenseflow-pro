// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-only';
process.env.BCRYPT_ROUNDS = '4'; // Faster for testing
process.env.LOG_LEVEL = 'error'; // Reduce log noise during testing
process.env.UPLOAD_DIR = './test-uploads';
process.env.MAX_FILE_SIZE = '1048576'; // 1MB for testing

// Disable rate limiting in tests
process.env.RATE_LIMIT_WINDOW_MS = '0';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';

// Test database URL (if not provided)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/expenseflow_test';
} 