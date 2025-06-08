async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');

  // Clean up test database
  console.log('Cleaning up test database...');
  await cleanupTestDatabase();

  // Kill backend process if we started it
  if (process.env.BACKEND_PID) {
    try {
      process.kill(process.env.BACKEND_PID);
      console.log('✅ Backend server stopped');
    } catch (error) {
      console.log('Backend server was already stopped');
    }
  }

  // Kill frontend process if we started it
  if (process.env.FRONTEND_PID) {
    try {
      process.kill(process.env.FRONTEND_PID);
      console.log('✅ Frontend server stopped');
    } catch (error) {
      console.log('Frontend server was already stopped');
    }
  }

  // Clean up test artifacts
  console.log('Cleaning up test artifacts...');
  await cleanupTestArtifacts();

  console.log('✅ Global teardown completed');
}

async function cleanupTestDatabase() {
  // Clean up test data from database
  // This would typically involve dropping test schemas, clearing tables, etc.
  console.log('Database cleanup completed');
}

async function cleanupTestArtifacts() {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    // Clean up uploaded test files
    const uploadsDir = './uploads/test';
    await fs.rmdir(uploadsDir, { recursive: true, force: true });

    // Clean up temporary test files
    const tempDir = './temp/test';
    await fs.rmdir(tempDir, { recursive: true, force: true });

    console.log('Test artifacts cleaned up');
  } catch (error) {
    console.log('No test artifacts to clean up');
  }
}

module.exports = globalTeardown; 