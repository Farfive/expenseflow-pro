const axios = require('axios');

async function measurePerformance() {
  console.log('⚡ ExpenseFlow Pro - Performance Monitor');
  console.log('=======================================\n');

  const tests = [
    {
      name: 'Backend Health Check',
      url: 'http://localhost:3002/api/health',
      method: 'GET'
    },
    {
      name: 'Ultra Fast Auto-Login',
      url: 'http://localhost:3002/api/auth/auto-login',
      method: 'POST'
    },
    {
      name: 'Token Validation (Cached)',
      url: 'http://localhost:3002/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': 'Bearer test-token' }
    },
    {
      name: 'Analytics Dashboard',
      url: 'http://localhost:3002/api/user-analytics/dashboard',
      method: 'GET'
    }
  ];

  console.log('🔍 Running performance tests...\n');

  for (const test of tests) {
    try {
      const startTime = process.hrtime.bigint();
      
      const config = {
        method: test.method,
        url: test.url,
        timeout: 5000
      };
      
      if (test.headers) {
        config.headers = test.headers;
      }
      
      const response = await axios(config);
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      const status = response.status === 200 ? '✅' : '⚠️';
      console.log(`${status} ${test.name}: ${duration.toFixed(2)}ms (${response.status})`);
      
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED (${error.message})`);
    }
  }

  console.log('\n📊 Performance Summary:');
  console.log('=======================');
  console.log('🎯 Target: < 50ms for auth endpoints');
  console.log('🎯 Target: < 100ms for data endpoints');
  console.log('⚡ Optimizations: Token caching, minimal processing, CORS optimization');
}

// Run performance test every 10 seconds
async function continuousMonitoring() {
  await measurePerformance();
  
  setInterval(async () => {
    console.log('\n' + '='.repeat(50));
    await measurePerformance();
  }, 10000);
}

// Start monitoring
continuousMonitoring().catch(console.error); 