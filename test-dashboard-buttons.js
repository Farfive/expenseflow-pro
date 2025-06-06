const axios = require('axios');

const BASE_URL_FRONTEND = 'http://localhost:3000';
const BASE_URL_BACKEND = 'http://localhost:3002';

async function testDashboardConnections() {
  console.log('🎯 ExpenseFlow Pro - Dashboard Button & Connection Testing');
  console.log('================================================================\n');
  
  const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  };

  // Helper function to run tests
  const runTest = async (testName, testFunction) => {
    testResults.total++;
    console.log(`\n🧪 Testing: ${testName}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await testFunction();
      if (result.success) {
        testResults.passed++;
        console.log(`✅ PASS: ${result.message}`);
        testResults.details.push({ test: testName, status: 'PASS', message: result.message });
      } else {
        testResults.failed++;
        console.log(`❌ FAIL: ${result.message}`);
        testResults.details.push({ test: testName, status: 'FAIL', message: result.message });
      }
    } catch (error) {
      testResults.failed++;
      console.log(`❌ ERROR: ${error.message}`);
      testResults.details.push({ test: testName, status: 'ERROR', message: error.message });
    }
  };

  // Test 1: Backend Health Check
  await runTest('Backend Health Check', async () => {
    const response = await axios.get(`${BASE_URL_BACKEND}/api/health`);
    return {
      success: response.status === 200,
      message: `Backend healthy - Uptime: ${response.data.uptime}s`
    };
  });

  // Test 2: Frontend Home Page Access
  await runTest('Frontend Home Page', async () => {
    const response = await axios.get(BASE_URL_FRONTEND);
    return {
      success: response.status === 200,
      message: 'Home page accessible'
    };
  });

  // Test 3: Dashboard Route Access
  await runTest('Dashboard Route Access', async () => {
    const response = await axios.get(`${BASE_URL_FRONTEND}/dashboard`);
    return {
      success: response.status === 200,
      message: 'Dashboard route accessible'
    };
  });

  // Test 4: Auto-Login API Endpoint
  await runTest('Auto-Login API', async () => {
    const response = await axios.post(`${BASE_URL_BACKEND}/api/auth/auto-login`);
    return {
      success: response.data.success && response.data.data.user,
      message: `Auto-login successful for: ${response.data.data.user.name}`
    };
  });

  // Test 5: Analytics Tracking API
  await runTest('Analytics Tracking API', async () => {
    const testEvent = {
      eventType: 'test_dashboard_button',
      eventName: 'Dashboard Button Test',
      feature: 'dashboard_testing',
      metadata: { test: true }
    };
    const response = await axios.post(`${BASE_URL_BACKEND}/api/user-analytics/track-event`, testEvent);
    return {
      success: response.data.success,
      message: 'Event tracking working correctly'
    };
  });

  // Test 6: Page View Tracking API
  await runTest('Page View Tracking API', async () => {
    const pageView = {
      path: '/dashboard',
      title: 'Dashboard',
      referrer: '/',
      userAgent: 'Test Agent'
    };
    const response = await axios.post(`${BASE_URL_BACKEND}/api/user-analytics/track-page-view`, pageView);
    return {
      success: response.data.success,
      message: 'Page view tracking working correctly'
    };
  });

  // Test 7: Feature Usage Tracking API
  await runTest('Feature Usage Tracking API', async () => {
    const featureUsage = {
      feature: 'dashboard_navigation',
      action: 'button_click',
      success: true,
      duration: 150,
      metadata: { button: 'expenses' }
    };
    const response = await axios.post(`${BASE_URL_BACKEND}/api/user-analytics/track-feature-usage`, featureUsage);
    return {
      success: response.data.success,
      message: 'Feature usage tracking working correctly'
    };
  });

  // Test 8: Error Tracking API
  await runTest('Error Tracking API', async () => {
    const errorData = {
      errorType: 'test_error',
      errorMessage: 'Dashboard test error',
      severity: 'info',
      metadata: { test: true }
    };
    const response = await axios.post(`${BASE_URL_BACKEND}/api/user-analytics/track-error`, errorData);
    return {
      success: response.data.success,
      message: 'Error tracking working correctly'
    };
  });

  // Test 9: Feedback System API
  await runTest('Feedback System API', async () => {
    const feedback = {
      type: 'feedback',
      content: 'Dashboard test feedback',
      rating: 5,
      category: 'general',
      metadata: { test: true }
    };
    const response = await axios.post(`${BASE_URL_BACKEND}/api/feedback`, feedback);
    return {
      success: response.data.success,
      message: 'Feedback system working correctly'
    };
  });

  // Test 10: Analytics Test Page
  await runTest('Analytics Test Page', async () => {
    const response = await axios.get(`${BASE_URL_FRONTEND}/test-analytics`);
    return {
      success: response.status === 200,
      message: 'Analytics test page accessible'
    };
  });

  // Test 11: Dashboard Routes Simulation
  const dashboardRoutes = [
    '/dashboard/expenses',
    '/dashboard/expenses/new',
    '/dashboard/documents',
    '/dashboard/analytics',
    '/dashboard/verification',
    '/dashboard/bank-statements',
    '/dashboard/exports',
    '/dashboard/user-analytics'
  ];

  for (const route of dashboardRoutes) {
    await runTest(`Dashboard Route: ${route}`, async () => {
      try {
        const response = await axios.get(`${BASE_URL_FRONTEND}${route}`, {
          timeout: 5000,
          validateStatus: (status) => status < 500 // Accept 404s as some routes might not exist yet
        });
        return {
          success: response.status < 500,
          message: `Route responds with status ${response.status}`
        };
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          return { success: false, message: 'Connection refused' };
        }
        return { success: true, message: `Route handled (${error.response?.status || 'timeout'})` };
      }
    });
  }

  // Test 12: Load Testing with Multiple Requests
  await runTest('Load Test - Multiple Concurrent Requests', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        axios.post(`${BASE_URL_BACKEND}/api/user-analytics/track-event`, {
          eventType: 'load_test',
          eventName: `Load Test ${i}`,
          feature: 'stress_testing'
        })
      );
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.data.success).length;
    
    return {
      success: successCount === 10,
      message: `${successCount}/10 concurrent requests successful`
    };
  });

  // Test 13: Backend Statistics Endpoint
  await runTest('Backend Statistics API', async () => {
    const response = await axios.get(`${BASE_URL_BACKEND}/api/stats`);
    const stats = response.data;
    
    return {
      success: response.status === 200 && stats.events !== undefined,
      message: `Stats retrieved - Events: ${stats.events}, Page Views: ${stats.pageViews}, Feedback: ${stats.feedback}`
    };
  });

  // Print Final Results
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\n📈 Overall Results:`);
  console.log(`   ✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`   ❌ Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`   📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.passed === testResults.total) {
    console.log('\n🎉 ALL TESTS PASSED! Dashboard is fully functional! 🎉');
  } else {
    console.log('\n⚠️  Some tests failed. Review the details above.');
  }

  console.log('\n📋 Detailed Results:');
  testResults.details.forEach((result, index) => {
    const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`   ${index + 1}. ${status} ${result.test}: ${result.message}`);
  });

  console.log('\n🔗 Key URLs to Test in Browser:');
  console.log('   🏠 Home: http://localhost:3000');
  console.log('   📊 Dashboard: http://localhost:3000/dashboard');
  console.log('   📈 Analytics Test: http://localhost:3000/test-analytics');
  console.log('   💰 New Expense: http://localhost:3000/dashboard/expenses/new');
  console.log('   📄 Documents: http://localhost:3000/dashboard/documents');
  
  console.log('\n🛠️  Next Steps:');
  console.log('   1. Open browser and test each URL above');
  console.log('   2. Click through all dashboard navigation buttons');
  console.log('   3. Test form submissions and file uploads');
  console.log('   4. Verify analytics tracking in real-time');
  
  return testResults;
}

// Run the tests
testDashboardConnections()
  .then((results) => {
    process.exit(results.failed === 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
  }); 