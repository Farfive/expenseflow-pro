const http = require('http');

console.log('🚀 ExpenseFlow Pro Analytics - Automated Test Suite');
console.log('===================================================\n');

class AnalyticsTestSuite {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3002,
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
      req.setTimeout(5000, () => reject(new Error('Timeout')));
      
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  log(test, passed, details = '') {
    const emoji = passed ? '✅' : '❌';
    console.log(`${emoji} ${test}`);
    if (details) console.log(`   └─ ${details}`);
    this.results.push({ test, passed, details });
  }

  async test1_BackendHealth() {
    console.log('\n🔍 Test 1: Backend Health Check');
    try {
      const { data, status } = await this.makeRequest('/api/health');
      if (status === 200 && data.status === 'healthy') {
        this.log('Backend Health', true, `Uptime: ${Math.round(data.uptime)} seconds`);
        return true;
      } else {
        this.log('Backend Health', false, `Status: ${status}`);
        return false;
      }
    } catch (error) {
      this.log('Backend Health', false, error.message);
      return false;
    }
  }

  async test2_EventTracking() {
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

      const { data, status } = await this.makeRequest('/api/user-analytics/track-event', 'POST', eventData);
      
      if (status === 200 && data.success) {
        this.log('Event Tracking', true, `Event ID: ${data.data.id}`);
        return true;
      } else {
        this.log('Event Tracking', false, `Status: ${status}`);
        return false;
      }
    } catch (error) {
      this.log('Event Tracking', false, error.message);
      return false;
    }
  }

  async test3_PageViewTracking() {
    console.log('\n🔍 Test 3: Page View Tracking');
    try {
      const pageData = {
        page: '/test-automation',
        referrer: 'automated-test-suite',
        loadTime: 250,
        sessionId: 'test_session_auto',
        performanceMetrics: {
          domContentLoaded: 180,
          firstContentfulPaint: 220,
          timeToInteractive: 400
        }
      };

      const { data, status } = await this.makeRequest('/api/user-analytics/track-page-view', 'POST', pageData);
      
      if (status === 200 && data.success) {
        this.log('Page View Tracking', true, `Page: ${pageData.page}`);
        return true;
      } else {
        this.log('Page View Tracking', false, `Status: ${status}`);
        return false;
      }
    } catch (error) {
      this.log('Page View Tracking', false, error.message);
      return false;
    }
  }

  async test4_FeatureUsage() {
    console.log('\n🔍 Test 4: Feature Usage Tracking');
    try {
      const featureData = {
        feature: 'automated_testing',
        action: 'comprehensive_test',
        duration: 1200,
        success: true,
        metadata: {
          testType: 'automation',
          coverage: 'full'
        }
      };

      const { data, status } = await this.makeRequest('/api/user-analytics/track-feature-usage', 'POST', featureData);
      
      if (status === 200 && data.success) {
        this.log('Feature Usage Tracking', true, `Feature: ${featureData.feature}, Duration: ${featureData.duration}ms`);
        return true;
      } else {
        this.log('Feature Usage Tracking', false, `Status: ${status}`);
        return false;
      }
    } catch (error) {
      this.log('Feature Usage Tracking', false, error.message);
      return false;
    }
  }

  async test5_ErrorTracking() {
    console.log('\n🔍 Test 5: Error Tracking');
    try {
      const errorData = {
        errorType: 'test_error',
        errorMessage: 'Automated test error simulation',
        errorStack: 'at test5_ErrorTracking (test-automation.js:123)',
        page: '/test-automation',
        feature: 'error_tracking',
        severity: 'info',
        metadata: {
          simulatedError: true,
          testPurpose: 'validation'
        }
      };

      const { data, status } = await this.makeRequest('/api/user-analytics/track-error', 'POST', errorData);
      
      if (status === 200 && data.success) {
        this.log('Error Tracking', true, `Error Type: ${errorData.errorType}`);
        return true;
      } else {
        this.log('Error Tracking', false, `Status: ${status}`);
        return false;
      }
    } catch (error) {
      this.log('Error Tracking', false, error.message);
      return false;
    }
  }

  async test6_FeedbackSystem() {
    console.log('\n🔍 Test 6: Feedback System');
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

      const { data, status } = await this.makeRequest('/api/feedback', 'POST', feedbackData);
      
      if (status === 200 && data.success) {
        this.log('Feedback System', true, `Type: ${feedbackData.type}, Rating: ${feedbackData.rating}/5`);
        return true;
      } else {
        this.log('Feedback System', false, `Status: ${status}`);
        return false;
      }
    } catch (error) {
      this.log('Feedback System', false, error.message);
      return false;
    }
  }

  async test7_OnboardingTracking() {
    console.log('\n🔍 Test 7: Onboarding Tracking');
    try {
      const onboardingData = {
        step: 1,
        stepName: 'automated_welcome',
        completed: true,
        timeSpent: 5000,
        metadata: {
          automated: true,
          stepTitle: 'Automated Welcome Step'
        }
      };

      const { data, status } = await this.makeRequest('/api/user-analytics/track-onboarding', 'POST', onboardingData);
      
      if (status === 200 && data.success) {
        this.log('Onboarding Tracking', true, `Step: ${onboardingData.stepName} (${onboardingData.timeSpent}ms)`);
        return true;
      } else {
        this.log('Onboarding Tracking', false, `Status: ${status}`);
        return false;
      }
    } catch (error) {
      this.log('Onboarding Tracking', false, error.message);
      return false;
    }
  }

  async test8_StatsEndpoint() {
    console.log('\n🔍 Test 8: Stats Endpoint');
    try {
      const { data, status } = await this.makeRequest('/api/stats');
      
      if (status === 200 && typeof data.events === 'number') {
        this.log('Stats Endpoint', true, `Events: ${data.events}, Uptime: ${Math.round(data.uptime)}s`);
        return true;
      } else {
        this.log('Stats Endpoint', false, `Status: ${status}`);
        return false;
      }
    } catch (error) {
      this.log('Stats Endpoint', false, error.message);
      return false;
    }
  }

  async test9_LoadTesting() {
    console.log('\n🔍 Test 9: Load Testing (10 concurrent requests)');
    try {
      const startTime = Date.now();
      const requests = [];

      for (let i = 0; i < 10; i++) {
        const loadTestData = {
          eventType: 'load_test',
          eventName: `Load Test ${i + 1}`,
          feature: 'load_testing',
          metadata: { requestNumber: i + 1 }
        };
        
        requests.push(this.makeRequest('/api/user-analytics/track-event', 'POST', loadTestData));
      }

      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      const successful = results.filter(r => r.status === 200).length;

      if (successful >= 8) {
        this.log('Load Testing', true, `${successful}/10 requests successful in ${duration}ms`);
        return true;
      } else {
        this.log('Load Testing', false, `Only ${successful}/10 requests successful`);
        return false;
      }
    } catch (error) {
      this.log('Load Testing', false, error.message);
      return false;
    }
  }

  async test10_ResponseTimes() {
    console.log('\n🔍 Test 10: Response Time Testing');
    try {
      const endpoints = [
        { path: '/api/health', name: 'Health' },
        { path: '/api/stats', name: 'Stats' },
        { path: '/', name: 'Root' }
      ];

      let allGood = true;
      for (const endpoint of endpoints) {
        const start = Date.now();
        const { status } = await this.makeRequest(endpoint.path);
        const responseTime = Date.now() - start;

        if (responseTime < 1000 && status === 200) {
          this.log(`${endpoint.name} Response Time`, true, `${responseTime}ms`);
        } else {
          this.log(`${endpoint.name} Response Time`, false, `${responseTime}ms (Status: ${status})`);
          allGood = false;
        }
      }
      return allGood;
    } catch (error) {
      this.log('Response Time Testing', false, error.message);
      return false;
    }
  }

  generateReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const successRate = ((passed / total) * 100).toFixed(1);
    const duration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(70));
    console.log('📊 AUTOMATED TEST RESULTS - EXPENSEFLOW PRO ANALYTICS');
    console.log('='.repeat(70));
    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`✅ Tests Passed: ${passed}/${total}`);
    console.log(`❌ Tests Failed: ${failed}/${total}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(test => {
        console.log(`   • ${test.test}: ${test.details}`);
      });
    }

    console.log('\n🎯 Test Coverage Areas:');
    console.log('   ✓ Backend Health & Connectivity');
    console.log('   ✓ Analytics Event Tracking');
    console.log('   ✓ Page View Monitoring');
    console.log('   ✓ Feature Usage Analytics');
    console.log('   ✓ Error Tracking & Logging');
    console.log('   ✓ User Feedback Collection');
    console.log('   ✓ Onboarding Progress Tracking');
    console.log('   ✓ System Performance & Load Testing');
    console.log('   ✓ API Response Time Analysis');

    console.log('\n' + '='.repeat(70));
    
    if (successRate >= 95) {
      console.log('🎉 OUTSTANDING! Your analytics system is performing excellently!');
      console.log('🚀 Ready for production deployment!');
    } else if (successRate >= 85) {
      console.log('✅ VERY GOOD! System is working well with minor issues.');
      console.log('🔧 Review failed tests and optimize as needed.');
    } else if (successRate >= 70) {
      console.log('⚠️  GOOD but needs improvement. Address failed tests.');
    } else {
      console.log('❌ NEEDS ATTENTION! Multiple issues detected.');
      console.log('🔧 Check server status and configuration.');
    }
    
    console.log('='.repeat(70));
  }

  async runAllTests() {
    console.log('Running comprehensive automated tests...\n');
    
    await this.test1_BackendHealth();
    await this.test2_EventTracking();
    await this.test3_PageViewTracking();
    await this.test4_FeatureUsage();
    await this.test5_ErrorTracking();
    await this.test6_FeedbackSystem();
    await this.test7_OnboardingTracking();
    await this.test8_StatsEndpoint();
    await this.test9_LoadTesting();
    await this.test10_ResponseTimes();

    this.generateReport();
  }
}

// Run the automated test suite
const testSuite = new AnalyticsTestSuite();
testSuite.runAllTests().catch(error => {
  console.error('\n❌ Test suite execution failed:', error.message);
  process.exit(1);
}); 