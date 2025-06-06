const fs = require('fs-extra');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clean up test uploads directory
    const testUploadsDir = path.join(process.cwd(), 'test-uploads');
    if (await fs.pathExists(testUploadsDir)) {
      await fs.remove(testUploadsDir);
      console.log('✅ Test uploads directory cleaned');
    }

    // Clean up test logs directory
    const testLogsDir = path.join(process.cwd(), 'test-logs');
    if (await fs.pathExists(testLogsDir)) {
      await fs.remove(testLogsDir);
      console.log('✅ Test logs directory cleaned');
    }

    console.log('✅ Test teardown completed');
  } catch (error) {
    console.error('❌ Error during test teardown:', error);
  }
}; 