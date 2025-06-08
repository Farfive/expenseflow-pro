const axios = require('axios');

const BASE_URL = 'http://localhost:4001';

async function testAPI() {
  console.log('🧪 Testing ExpenseFlow Pro API Endpoints...\n');

  const tests = [
    // Authentication
    { name: 'Login', method: 'POST', url: '/api/auth/login', data: { email: 'test@test.com', password: 'test' } },
    
    // Core Data
    { name: 'Get Expenses', method: 'GET', url: '/api/expenses' },
    { name: 'Get Documents', method: 'GET', url: '/api/documents' },
    { name: 'Get Bank Statements', method: 'GET', url: '/api/bank-statements' },
    { name: 'Get Categories', method: 'GET', url: '/api/categories' },
    { name: 'Get Workflows', method: 'GET', url: '/api/workflows' },
    { name: 'Get Team', method: 'GET', url: '/api/team' },
    { name: 'Get Reports', method: 'GET', url: '/api/reports' },
    { name: 'Get Notifications', method: 'GET', url: '/api/notifications' },
    { name: 'Get Profile', method: 'GET', url: '/api/profile' },
    { name: 'Get Analytics', method: 'GET', url: '/api/analytics' },
    
    // Statistics
    { name: 'Expense Stats', method: 'GET', url: '/api/expenses/stats' },
    { name: 'Document Stats', method: 'GET', url: '/api/documents/stats' },
    { name: 'Category Stats', method: 'GET', url: '/api/categories/stats' },
    { name: 'Workflow Stats', method: 'GET', url: '/api/workflows/stats' },
    { name: 'Team Stats', method: 'GET', url: '/api/team/stats' },
    { name: 'Report Stats', method: 'GET', url: '/api/reports/stats' },
    { name: 'Notification Stats', method: 'GET', url: '/api/notifications/stats' },
    
    // Health Check
    { name: 'Health Check', method: 'GET', url: '/api/health' }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const config = {
        method: test.method.toLowerCase(),
        url: BASE_URL + test.url,
        timeout: 5000
      };

      if (test.data) {
        config.data = test.data;
      }

      const response = await axios(config);
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ ${test.name}: ${response.status} - ${response.data?.message || 'OK'}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: ${response.status} - Unexpected status`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.code || error.response?.status || 'ERROR'} - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log(`\n🎉 All API endpoints are working correctly!`);
  } else {
    console.log(`\n⚠️  Some endpoints need attention.`);
  }
}

// Test if axios is available
try {
  testAPI();
} catch (error) {
  console.log('❌ axios not available. Install with: npm install axios');
  console.log('Manual testing required.');
} 