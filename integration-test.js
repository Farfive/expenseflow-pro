const http = require('http');

console.log('🎯 ExpenseFlow Pro Analytics - INTEGRATION TEST SUITE');
console.log('====================================================\n');

let results = [];
let startTime = Date.now();
let sessionId = `session_${Date.now()}`;
let userId = `user_${Math.random().toString(36).substr(2, 9)}`;

async function makeRequest(path, method = 'GET', data = null) {
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
    req.setTimeout(8000, () => reject(new Error('Timeout')));
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function log(test, passed, details = '') {
  const emoji = passed ? '✅' : '❌';
  console.log(`${emoji} ${test}`);
  if (details) console.log(`   └─ ${details}`);
  results.push({ test, passed, details });
}

// Integration Test 1: User Registration Flow
async function testUserRegistrationFlow() {
  console.log('\n🎯 Integration Test 1: User Registration Flow');
  try {
    // Step 1: Track page view
    const pageViewResult = await makeRequest('/api/user-analytics/track-page-view', 'POST', {
      page: '/register',
      referrer: '/landing',
      loadTime: 180,
      sessionId: sessionId
    });

    // Step 2: Track registration event
    const eventResult = await makeRequest('/api/user-analytics/track-event', 'POST', {
      eventType: 'user_interaction',
      eventName: 'Registration Started',
      feature: 'user_registration',
      sessionId: sessionId,
      metadata: { formType: 'registration', step: 'form_start' }
    });

    if (pageViewResult.status === 200 && eventResult.status === 200) {
      log('User Registration Flow', true, 'Registration tracking successful');
      return true;
    } else {
      log('User Registration Flow', false, 'Registration tracking failed');
      return false;
    }
  } catch (error) {
    log('User Registration Flow', false, error.message);
    return false;
  }
}

// Integration Test 2: Feature Usage Journey
async function testFeatureUsageJourney() {
  console.log('\n🎯 Integration Test 2: Feature Usage Journey');
  try {
    const features = [
      { name: 'expense_submission', action: 'create_expense', duration: 12000 },
      { name: 'document_upload', action: 'upload_receipt', duration: 8000 },
      { name: 'analytics_dashboard', action: 'view_analytics', duration: 15000 }
    ];

    let successful = 0;

    for (const feature of features) {
      const result = await makeRequest('/api/user-analytics/track-feature-usage', 'POST', {
        feature: feature.name,
        action: feature.action,
        duration: feature.duration,
        success: true,
        sessionId: sessionId,
        metadata: { userTier: 'free', featureVersion: '1.0' }
      });

      if (result.status === 200) successful++;
    }

    if (successful === features.length) {
      log('Feature Usage Journey', true, `All ${features.length} features tracked`);
      return true;
    } else {
      log('Feature Usage Journey', false, `Only ${successful}/${features.length} features tracked`);
      return false;
    }
  } catch (error) {
    log('Feature Usage Journey', false, error.message);
    return false;
  }
}

// Integration Test 3: Error & Feedback Flow
async function testErrorAndFeedbackFlow() {
  console.log('\n🎯 Integration Test 3: Error & Feedback Flow');
  try {
    // Track an error
    const errorResult = await makeRequest('/api/user-analytics/track-error', 'POST', {
      errorType: 'validation_error',
      errorMessage: 'Invalid expense amount format',
      severity: 'warning',
      feature: 'expense_submission',
      sessionId: sessionId,
      metadata: { recoverable: true, userAction: 'form_submission' }
    });

    // Submit feedback
    const feedbackResult = await makeRequest('/api/feedback', 'POST', {
      type: 'bug_report',
      rating: 3,
      message: 'Validation error message could be clearer',
      page: '/dashboard/expenses',
      sessionId: sessionId,
      metadata: { userTier: 'free', submissionMethod: 'widget' }
    });

    if (errorResult.status === 200 && feedbackResult.status === 200) {
      log('Error & Feedback Flow', true, 'Error tracking and feedback submission successful');
      return true;
    } else {
      log('Error & Feedback Flow', false, 'Error or feedback tracking failed');
      return false;
    }
  } catch (error) {
    log('Error & Feedback Flow', false, error.message);
    return false;
  }
}

// Integration Test 4: Complete Session Analytics
async function testCompleteSessionAnalytics() {
  console.log('\n🎯 Integration Test 4: Complete Session Analytics');
  try {
    const sessionPages = ['/dashboard', '/dashboard/expenses', '/dashboard/analytics'];
    let pageViewsTracked = 0;

    for (let i = 0; i < sessionPages.length; i++) {
      const page = sessionPages[i];
      const referrer = i > 0 ? sessionPages[i - 1] : '/login';
      
      const result = await makeRequest('/api/user-analytics/track-page-view', 'POST', {
        page: page,
        referrer: referrer,
        loadTime: Math.floor(Math.random() * 200) + 100,
        sessionId: sessionId,
        performanceMetrics: {
          domContentLoaded: 150,
          firstContentfulPaint: 200
        }
      });

      if (result.status === 200) pageViewsTracked++;
    }

    // Track session end
    const sessionEndResult = await makeRequest('/api/user-analytics/track-event', 'POST', {
      eventType: 'session_end',
      eventName: 'Session Completed',
      feature: 'session_management',
      sessionId: sessionId,
      metadata: {
        sessionDuration: Date.now() - startTime,
        pagesVisited: sessionPages.length
      }
    });

    if (pageViewsTracked === sessionPages.length && sessionEndResult.status === 200) {
      log('Complete Session Analytics', true, `${pageViewsTracked} page views + session end tracked`);
      return true;
    } else {
      log('Complete Session Analytics', false, 'Session tracking incomplete');
      return false;
    }
  } catch (error) {
    log('Complete Session Analytics', false, error.message);
    return false;
  }
}

function generateIntegrationReport() {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);
  const duration = Date.now() - startTime;

  console.log('\n' + '='.repeat(60));
  console.log('🎯 INTEGRATION TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`👤 User ID: ${userId}`);
  console.log(`🔐 Session: ${sessionId}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📈 Success Rate: ${successRate}%`);
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(test => {
      console.log(`   • ${test.test}: ${test.details}`);
    });
  }

  console.log('\n🎯 Integration Scenarios:');
  console.log('   👤 User Registration Workflow');
  console.log('   🔧 Feature Usage Tracking');
  console.log('   🚨 Error & Feedback Handling');
  console.log('   📊 Complete Session Analytics');

  console.log('\n' + '='.repeat(60));
  
  if (successRate >= 95) {
    console.log('🏆 OUTSTANDING! Perfect real-world scenario handling!');
  } else if (successRate >= 80) {
    console.log('🎯 EXCELLENT! Strong integration performance!');
  } else {
    console.log('⚠️  Review failed scenarios for improvements.');
  }
  
  console.log('='.repeat(60));
}

async function runIntegrationTests() {
  console.log('Starting integration testing...');
  console.log('🎬 Simulating real user workflows...\n');
  
  await testUserRegistrationFlow();
  await testFeatureUsageJourney();
  await testErrorAndFeedbackFlow();
  await testCompleteSessionAnalytics();

  generateIntegrationReport();
}

runIntegrationTests().catch(error => {
  console.error('\n🚨 Integration test failed:', error.message);
  process.exit(1);
}); 