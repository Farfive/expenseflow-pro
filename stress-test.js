const http = require('http');

console.log('🔥 ExpenseFlow Pro Analytics - STRESS TEST SUITE');
console.log('=================================================\n');

let results = [];
let startTime = Date.now();

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
    req.setTimeout(10000, () => reject(new Error('Timeout')));
    
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

// Stress Test 1: High Volume
async function stressTestHighVolume() {
  console.log('\n🔥 Stress Test 1: High Volume (20 concurrent requests)');
  try {
    const startTime = Date.now();
    const requests = [];

    for (let i = 0; i < 20; i++) {
      const eventData = {
        eventType: 'stress_test',
        eventName: `Stress Event ${i + 1}`,
        feature: 'stress_testing',
        metadata: { requestNumber: i + 1, payload: 'data'.repeat(100) }
      };
      
      requests.push(makeRequest('/api/user-analytics/track-event', 'POST', eventData));
    }

    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;
    const successful = responses.filter(r => r.status === 200).length;

    if (successful >= 18) {
      log('High Volume Test', true, `${successful}/20 successful in ${duration}ms`);
      return true;
    } else {
      log('High Volume Test', false, `Only ${successful}/20 successful`);
      return false;
    }
  } catch (error) {
    log('High Volume Test', false, error.message);
    return false;
  }
}

// Stress Test 2: Response Time
async function stressTestResponseTime() {
  console.log('\n🔥 Stress Test 2: Response Time Analysis');
  try {
    const responseTimes = [];
    
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      const result = await makeRequest('/api/health');
      const responseTime = Date.now() - start;
      responseTimes.push(responseTime);
    }

    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);

    if (avgResponseTime < 100 && maxResponseTime < 200) {
      log('Response Time Test', true, `Avg: ${Math.round(avgResponseTime)}ms, Max: ${maxResponseTime}ms`);
      return true;
    } else {
      log('Response Time Test', false, `Avg: ${Math.round(avgResponseTime)}ms (too slow)`);
      return false;
    }
  } catch (error) {
    log('Response Time Test', false, error.message);
    return false;
  }
}

// Stress Test 3: Error Handling
async function stressTestErrorHandling() {
  console.log('\n🔥 Stress Test 3: Error Handling Under Load');
  try {
    const requests = [];
    
    // Mix of valid and invalid requests
    for (let i = 0; i < 10; i++) {
      if (i % 3 === 0) {
        requests.push(makeRequest('/api/invalid-endpoint', 'GET'));
      } else {
        requests.push(makeRequest('/api/user-analytics/track-event', 'POST', {
          eventType: 'valid_test',
          eventName: 'Valid Event',
          feature: 'error_test'
        }));
      }
    }

    const responses = await Promise.all(requests);
    const properResponses = responses.filter(r => r.status === 200 || r.status === 404).length;

    if (properResponses >= 8) {
      log('Error Handling Test', true, `${properResponses}/10 proper responses`);
      return true;
    } else {
      log('Error Handling Test', false, `Only ${properResponses}/10 proper responses`);
      return false;
    }
  } catch (error) {
    log('Error Handling Test', false, error.message);
    return false;
  }
}

function generateReport() {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);
  const duration = Date.now() - startTime;

  console.log('\n' + '='.repeat(60));
  console.log('🔥 STRESS TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`⚡ Duration: ${duration}ms`);
  console.log(`🎯 Success Rate: ${successRate}%`);
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(test => {
      console.log(`   • ${test.test}: ${test.details}`);
    });
  }

  console.log('\n🔥 Stress Categories Tested:');
  console.log('   ⚡ High Volume Request Handling');
  console.log('   ⏱️  Response Time Under Load');
  console.log('   🛡️  Error Handling Resilience');

  console.log('\n' + '='.repeat(60));
  
  if (successRate >= 95) {
    console.log('🏆 EXCEPTIONAL! System handles stress perfectly!');
  } else if (successRate >= 80) {
    console.log('🔥 EXCELLENT! Good performance under stress!');
  } else {
    console.log('⚠️  Needs optimization for high load scenarios.');
  }
  
  console.log('='.repeat(60));
}

async function runStressTests() {
  console.log('Starting stress test execution...\n');
  
  await stressTestHighVolume();
  await stressTestResponseTime();
  await stressTestErrorHandling();

  generateReport();
}

runStressTests().catch(error => {
  console.error('\n🚨 Stress test failed:', error.message);
  process.exit(1);
}); 