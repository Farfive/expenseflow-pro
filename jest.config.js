module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/server.js', // Exclude main server file
    '!**/node_modules/**',
    '!**/coverage/**'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],

  // Test timeout
  testTimeout: 30000,

  // Module paths
  moduleDirectories: [
    'node_modules',
    'src'
  ],

  // Environment variables for testing
  setupFiles: [
    '<rootDir>/tests/env.js'
  ],

  // Global teardown
  globalTeardown: '<rootDir>/tests/teardown.js',

  // Transform configuration
  transform: {},

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Coverage ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/dist/',
    '/build/',
    'jest.config.js'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json'
  ],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Max workers for parallel testing
  maxWorkers: '50%',

  // Error on deprecated features
  errorOnDeprecated: true
}; 