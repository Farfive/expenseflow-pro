const http = require('http');

console.log('🚀 ExpenseFlow Pro Analytics - Automated Test Suite');
console.log('===================================================\n');

// Test configuration
const CONFIG = {
  BACKEND_PORT: 3002,
  FRONTEND_PORT: 3000,
  HOST: 'localhost'
};

let testResults = [];
let testStartTime = Date.now();

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.HOST,
      port: CONFIG.BACKEND_PORT,
      path: path,
      method: method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ data: parsed, status: res.statusCode });
        } catch (e) {
          resolve({ data: responseData, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Request timeout')));
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Test result logger
function logTest(testName, passed, details = '') {
  const emoji = passed ? '✅' : '❌';
  console.log(`${emoji} ${testName}`);
  if (details) console.log(`   └─ ${details}`);
  testResults.push({ test: testName, passed, details });
}

// Test 1: Backend Health Check
async function testBackendHealth() {
  console.log('\n🔍 Test 1: Backend Health Check');
  try {
    const { data, status } = await makeRequest('/api/health');
    if (status === 200 && data.status === 'healthy') {
      logTest('Backend Health', true, `Uptime: ${Math.round(data.uptime)} seconds`);
      return true;
    } else {
      logTest('Backend Health', false, `Status: ${status}`);
      return false;
    }
  } catch (error) {
    logTest('Backend Health', false, error.message);
    return false;
  }
}

// Test 2: Event Tracking
async function testEventTracking() {
  console.log('\n🔍 Test 2: Event Tracking');
  try {
    const eventData = {
      eventType: 'automated_test',
      eventName: 'Test Suite Event Tracking',
      feature: 'automated_testing',
      metadata: { 
        testId: 'AUTO_001',
        timestamp: new Date().toISOString()
      }
    };

    const { data, status } = await makeRequest('/api/user-analytics/track-event', 'POST', eventData);
    
    if (status === 200 && data.success) {
      logTest('Event Tracking', true, `Event ID: ${data.data.id}`);
      return true;
    } else {
      logTest('Event Tracking', false, `Status: ${status}`);
      return false;
    }
  } catch (error) {
    logTest('Event Tracking', false, error.message);
    return false;
  }
}

// Test 3: Load Testing
async function testLoadHandling() {
  console.log('\n🔍 Test 3: Load Testing (5 concurrent requests)');
  try {
    const startTime = Date.now();
    const requests = [];

    for (let i = 0; i < 5; i++) {
      const loadTestData = {
        eventType: 'load_test',
        eventName: `Load Test ${i + 1}`,
        feature: 'load_testing',
        metadata: { requestNumber: i + 1 }
      };
      
      requests.push(makeRequest('/api/user-analytics/track-event', 'POST', loadTestData));
    }

    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.status === 200).length;

    if (successful >= 4) {
      logTest('Load Testing', true, `${successful}/5 requests successful in ${duration}ms`);
      return true;
    } else {
      logTest('Load Testing', false, `Only ${successful}/5 requests successful`);
      return false;
    }
  } catch (error) {
    logTest('Load Testing', false, error.message);
    return false;
  }
}

// Test 4: Feedback System
async function testFeedbackSystem() {
  console.log('\n🔍 Test 4: Feedback System');
  try {
    const feedbackData = {
      type: 'general',
      rating: 5,
      message: 'Automated test feedback: System working excellently!',
      page: '/test-automation',
      metadata: {
        automated: true,
        testCategory: 'positive'
      }
    };

    const { data, status } = await makeRequest('/api/feedback', 'POST', feedbackData);
    
    if (status === 200 && data.success) {
      logTest('Feedback System', true, `Type: ${feedbackData.type}, Rating: ${feedbackData.rating}/5`);
      return true;
    } else {
      logTest('Feedback System', false, `Status: ${status}`);
      return false;
    }
  } catch (error) {
    logTest('Feedback System', false, error.message);
    return false;
  }
}

// Test 5: Stats Endpoint
async function testStatsEndpoint() {
  console.log('\n🔍 Test 5: Stats Endpoint');
  try {
    const { data, status } = await makeRequest('/api/stats');
    
    if (status === 200 && typeof data.events === 'number') {
      logTest('Stats Endpoint', true, `Events: ${data.events}, Uptime: ${Math.round(data.uptime)}s`);
      return true;
    } else {
      logTest('Stats Endpoint', false, `Status: ${status}`);
      return false;
    }
  } catch (error) {
    logTest('Stats Endpoint', false, error.message);
    return false;
  }
}

// Generate test report
function generateReport() {
  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);
  const duration = Date.now() - testStartTime;

  console.log('\n' + '='.repeat(60));
  console.log('📊 AUTOMATED TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📈 Success Rate: ${successRate}%`);
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => !r.passed).forEach(test => {
      console.log(`   • ${test.test}: ${test.details}`);
    });
  }

  console.log('\n🎯 Test Coverage:');
  console.log('   ✓ Backend Health & Connectivity');
  console.log('   ✓ Analytics Event Tracking');
  console.log('   ✓ User Feedback Collection');
  console.log('   ✓ System Performance & Load Testing');
  console.log('   ✓ API Response Analysis');

  console.log('\n' + '='.repeat(60));
  
  if (successRate >= 95) {
    console.log('🎉 EXCELLENT! Analytics system performing perfectly!');
  } else if (successRate >= 80) {
    console.log('✅ GOOD! System working well with minor issues.');
  } else {
    console.log('⚠️  NEEDS ATTENTION! Check failed tests.');
  }
  
  console.log('='.repeat(60));
}

// Main test runner
async function runAllTests() {
  console.log('Starting automated test execution...\n');
  
  await testBackendHealth();
  await testEventTracking();
  await testLoadHandling();
  await testFeedbackSystem();
  await testStatsEndpoint();

  generateReport();
}

// Execute the test suite
runAllTests().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
}); 