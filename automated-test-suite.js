const http = require('http');
const https = require('https');

class ExpenseFlowAnalyticsTestSuite {
  constructor() {
    this.baseURL = 'http://localhost:3002';
    this.frontendURL = 'http://localhost:3000';
    this.testResults = [];
    this.startTime = Date.now();
  }

  // Helper method to make HTTP requests
  makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = res.statusCode >= 200 && res.statusCode < 300 ? 
              JSON.parse(data) : { error: data, statusCode: res.statusCode };
            resolve({ data: response, statusCode: res.statusCode });
          } catch (error) {
            resolve({ data: data, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Request timeout')));
      
      if (postData) {
        req.write(JSON.stringify(postData));
      }
      req.end();
    });
  }

  // Test result logger
  logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${testName}`);
    if (details) console.log(`      ${details}`);
    
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Test 1: Backend Health Check
  async testBackendHealth() {
    console.log('\n🔍 Testing Backend Health...');
    try {
      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/health',
        method: 'GET'
      };

      const { data, statusCode } = await this.makeRequest(options);
      
      if (statusCode === 200 && data.status === 'healthy') {
        this.logTest('Backend Health Check', true, `Uptime: ${Math.round(data.uptime)}s`);
        return true;
      } else {
        this.logTest('Backend Health Check', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Backend Health Check', false, error.message);
      return false;
    }
  }

  // Test 2: Root Endpoint
  async testRootEndpoint() {
    console.log('\n🔍 Testing Root Endpoint...');
    try {
      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/',
        method: 'GET'
      };

      const { data, statusCode } = await this.makeRequest(options);
      
      if (statusCode === 200 && data.name && data.endpoints) {
        this.logTest('Root Endpoint', true, `API: ${data.name} v${data.version}`);
        return true;
      } else {
        this.logTest('Root Endpoint', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Root Endpoint', false, error.message);
      return false;
    }
  }

  // Test 3: Event Tracking
  async testEventTracking() {
    console.log('\n🔍 Testing Event Tracking...');
    try {
      const eventData = {
        eventType: 'automated_test',
        eventName: 'Automated Event Tracking Test',
        feature: 'testing_suite',
        metadata: {
          testId: 'event_001',
          automated: true,
          timestamp: new Date().toISOString()
        }
      };

      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/user-analytics/track-event',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const { data, statusCode } = await this.makeRequest(options, eventData);
      
      if (statusCode === 200 && data.success && data.data.id) {
        this.logTest('Event Tracking', true, `Event ID: ${data.data.id}`);
        return true;
      } else {
        this.logTest('Event Tracking', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Event Tracking', false, error.message);
      return false;
    }
  }

  // Test 4: Page View Tracking
  async testPageViewTracking() {
    console.log('\n🔍 Testing Page View Tracking...');
    try {
      const pageViewData = {
        page: '/test-analytics',
        referrer: 'automated-test',
        loadTime: 250,
        sessionId: 'test_session_001',
        performanceMetrics: {
          domContentLoaded: 180,
          firstContentfulPaint: 220,
          timeToInteractive: 400
        }
      };

      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/user-analytics/track-page-view',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const { data, statusCode } = await this.makeRequest(options, pageViewData);
      
      if (statusCode === 200 && data.success) {
        this.logTest('Page View Tracking', true, `Page: ${pageViewData.page}`);
        return true;
      } else {
        this.logTest('Page View Tracking', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Page View Tracking', false, error.message);
      return false;
    }
  }

  // Test 5: Feature Usage Tracking
  async testFeatureUsageTracking() {
    console.log('\n🔍 Testing Feature Usage Tracking...');
    try {
      const featureData = {
        feature: 'analytics_testing',
        action: 'automated_feature_test',
        duration: 1500,
        success: true,
        metadata: {
          testType: 'automated',
          features: ['tracking', 'timing', 'success_measurement']
        }
      };

      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/user-analytics/track-feature-usage',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const { data, statusCode } = await this.makeRequest(options, featureData);
      
      if (statusCode === 200 && data.success) {
        this.logTest('Feature Usage Tracking', true, `Feature: ${featureData.feature}, Duration: ${featureData.duration}ms`);
        return true;
      } else {
        this.logTest('Feature Usage Tracking', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Feature Usage Tracking', false, error.message);
      return false;
    }
  }

  // Test 6: Error Tracking
  async testErrorTracking() {
    console.log('\n🔍 Testing Error Tracking...');
    try {
      const errorData = {
        errorType: 'automated_test_error',
        errorMessage: 'This is a simulated error for testing purposes',
        errorStack: 'at testErrorTracking (automated-test-suite.js:123:45)',
        page: '/test-analytics',
        feature: 'error_tracking',
        severity: 'warning',
        metadata: {
          testError: true,
          errorCode: 'TEST_001',
          reproduced: true
        }
      };

      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/user-analytics/track-error',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const { data, statusCode } = await this.makeRequest(options, errorData);
      
      if (statusCode === 200 && data.success) {
        this.logTest('Error Tracking', true, `Error: ${errorData.errorType}`);
        return true;
      } else {
        this.logTest('Error Tracking', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Error Tracking', false, error.message);
      return false;
    }
  }

  // Test 7: Onboarding Tracking
  async testOnboardingTracking() {
    console.log('\n🔍 Testing Onboarding Tracking...');
    try {
      const onboardingData = {
        step: 1,
        stepName: 'welcome',
        completed: true,
        timeSpent: 30000,
        metadata: {
          automated: true,
          stepTitle: 'Welcome to ExpenseFlow Pro',
          required: true
        }
      };

      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/user-analytics/track-onboarding',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const { data, statusCode } = await this.makeRequest(options, onboardingData);
      
      if (statusCode === 200 && data.success) {
        this.logTest('Onboarding Tracking', true, `Step: ${onboardingData.stepName} (${onboardingData.timeSpent}ms)`);
        return true;
      } else {
        this.logTest('Onboarding Tracking', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Onboarding Tracking', false, error.message);
      return false;
    }
  }

  // Test 8: Feedback Submission
  async testFeedbackSubmission() {
    console.log('\n🔍 Testing Feedback Submission...');
    try {
      const feedbackData = {
        type: 'feature_request',
        rating: 5,
        message: 'Automated test feedback: The analytics system works perfectly!',
        page: '/test-analytics',
        metadata: {
          automated: true,
          testId: 'feedback_001',
          category: 'positive'
        }
      };

      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/feedback',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const { data, statusCode } = await this.makeRequest(options, feedbackData);
      
      if (statusCode === 200 && data.success) {
        this.logTest('Feedback Submission', true, `Type: ${feedbackData.type}, Rating: ${feedbackData.rating}/5`);
        return true;
      } else {
        this.logTest('Feedback Submission', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Feedback Submission', false, error.message);
      return false;
    }
  }

  // Test 9: Stats Endpoint
  async testStatsEndpoint() {
    console.log('\n🔍 Testing Stats Endpoint...');
    try {
      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/stats',
        method: 'GET'
      };

      const { data, statusCode } = await this.makeRequest(options);
      
      if (statusCode === 200 && typeof data.events === 'number') {
        this.logTest('Stats Endpoint', true, `Events: ${data.events}, Uptime: ${Math.round(data.uptime)}s`);
        return true;
      } else {
        this.logTest('Stats Endpoint', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Stats Endpoint', false, error.message);
      return false;
    }
  }

  // Test 10: Load Testing (Multiple Requests)
  async testLoadHandling() {
    console.log('\n🔍 Testing Load Handling...');
    try {
      const requests = [];
      const startTime = Date.now();
      
      // Send 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        const eventData = {
          eventType: 'load_test',
          eventName: `Load Test Event ${i + 1}`,
          feature: 'load_testing',
          metadata: { requestNumber: i + 1, batchTest: true }
        };

        const options = {
          hostname: 'localhost',
          port: 3002,
          path: '/api/user-analytics/track-event',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        requests.push(this.makeRequest(options, eventData));
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const successful = results.filter(r => r.statusCode === 200).length;
      
      if (successful >= 8) { // Allow 2 requests to fail
        this.logTest('Load Handling', true, `${successful}/10 requests successful in ${duration}ms`);
        return true;
      } else {
        this.logTest('Load Handling', false, `Only ${successful}/10 requests successful`);
        return false;
      }
    } catch (error) {
      this.logTest('Load Handling', false, error.message);
      return false;
    }
  }

  // Test 11: Frontend Connectivity
  async testFrontendConnectivity() {
    console.log('\n🔍 Testing Frontend Connectivity...');
    try {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'GET'
      };

      const { statusCode } = await this.makeRequest(options);
      
      if (statusCode === 200) {
        this.logTest('Frontend Connectivity', true, 'Frontend accessible on port 3000');
        return true;
      } else {
        this.logTest('Frontend Connectivity', false, `Status: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('Frontend Connectivity', false, error.message);
      return false;
    }
  }

  // Test 12: API Error Handling
  async testAPIErrorHandling() {
    console.log('\n🔍 Testing API Error Handling...');
    try {
      // Test invalid endpoint
      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/invalid-endpoint',
        method: 'GET'
      };

      const { data, statusCode } = await this.makeRequest(options);
      
      if (statusCode === 404 && data.success === false) {
        this.logTest('API Error Handling', true, '404 properly returned for invalid endpoint');
        return true;
      } else {
        this.logTest('API Error Handling', false, `Unexpected response: ${statusCode}`);
        return false;
      }
    } catch (error) {
      this.logTest('API Error Handling', false, error.message);
      return false;
    }
  }

  // Performance Test
  async testResponseTimes() {
    console.log('\n🔍 Testing Response Times...');
    try {
      const endpoints = [
        { path: '/api/health', name: 'Health Check' },
        { path: '/api/stats', name: 'Stats' },
        { path: '/', name: 'Root' }
      ];

      let allPassed = true;
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const options = {
          hostname: 'localhost',
          port: 3002,
          path: endpoint.path,
          method: 'GET'
        };

        const { statusCode } = await this.makeRequest(options);
        const responseTime = Date.now() - startTime;
        
        if (responseTime < 1000 && statusCode === 200) {
          this.logTest(`Response Time: ${endpoint.name}`, true, `${responseTime}ms`);
        } else {
          this.logTest(`Response Time: ${endpoint.name}`, false, `${responseTime}ms (Status: ${statusCode})`);
          allPassed = false;
        }
      }
      
      return allPassed;
    } catch (error) {
      this.logTest('Response Times', false, error.message);
      return false;
    }
  }

  // Generate comprehensive test report
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    const duration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 EXPENSEFLOW PRO ANALYTICS - TEST REPORT');
    console.log('='.repeat(60));
    console.log(`🕐 Test Duration: ${duration}ms`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Total Tests: ${totalTests}`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(t => !t.passed)
        .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
    }

    console.log('\n🎯 Test Categories Covered:');
    console.log('   ✅ Backend Health & Connectivity');
    console.log('   ✅ Analytics Event Tracking');
    console.log('   ✅ Performance Monitoring');
    console.log('   ✅ Error Handling & Logging');
    console.log('   ✅ User Feedback System');
    console.log('   ✅ Load Testing');
    console.log('   ✅ Response Time Analysis');
    console.log('   ✅ API Error Handling');

    console.log('\n' + '='.repeat(60));
    
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT! Your ExpenseFlow Pro Analytics system is working perfectly!');
    } else if (successRate >= 75) {
      console.log('✅ GOOD! Your system is mostly working, with minor issues to address.');
    } else {
      console.log('⚠️  NEEDS ATTENTION! Several tests failed. Check the backend and frontend setup.');
    }
    
    console.log('='.repeat(60));
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting ExpenseFlow Pro Analytics Test Suite...');
    console.log('⏱️  This will take about 30-60 seconds to complete...\n');

    // Core functionality tests
    await this.testBackendHealth();
    await this.testRootEndpoint();
    await this.testFrontendConnectivity();
    
    // Analytics tracking tests
    await this.testEventTracking();
    await this.testPageViewTracking();
    await this.testFeatureUsageTracking();
    await this.testErrorTracking();
    await this.testOnboardingTracking();
    await this.testFeedbackSubmission();
    
    // System tests
    await this.testStatsEndpoint();
    await this.testAPIErrorHandling();
    await this.testResponseTimes();
    await this.testLoadHandling();

    // Generate final report
    this.generateReport();
  }
}

// Run the test suite
const testSuite = new ExpenseFlowAnalyticsTestSuite();
testSuite.runAllTests().catch(error => {
  console.error('❌ Test suite failed to run:', error.message);
  process.exit(1);
}); 