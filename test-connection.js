const http = require('http');

console.log('🧪 Testing ExpenseFlow Pro Backend API Connection...\n');

// Test the health endpoint
const testHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3001/api/health', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Health Check:', response.status);
          console.log('⏱️  Uptime:', Math.round(response.uptime), 'seconds');
          console.log('🕐 Timestamp:', response.timestamp);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      reject(new Error('Request timeout'));
    });
  });
};

// Test the root endpoint
const testRoot = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3001/', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('\n✅ Root Endpoint:', response.name);
          console.log('📍 Frontend URL:', response.frontend);
          console.log('🧪 Test Page:', response.testPage);
          console.log('📊 Available Endpoints:', Object.keys(response.endpoints).length);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      reject(new Error('Request timeout'));
    });
  });
};

// Test a POST endpoint
const testAnalytics = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      eventType: 'test_connection',
      eventName: 'Backend Connection Test',
      feature: 'connection_testing',
      metadata: {
        source: 'test_script',
        timestamp: new Date().toISOString()
      }
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/user-analytics/track-event',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('\n✅ Analytics Tracking:', response.success ? 'Working' : 'Failed');
          console.log('📊 Event ID:', response.data?.id);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
};

// Run all tests
async function runTests() {
  try {
    await testHealth();
    await testRoot();
    await testAnalytics();
    
    console.log('\n🎉 All tests passed! Backend API is working correctly.');
    console.log('\n📝 Next Steps:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Navigate to http://localhost:3000/test-analytics');
    console.log('3. Click the test buttons to see the analytics in action');
    console.log('4. Check this terminal for backend logs');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the backend server is running: node simple-server.js');
    console.log('2. Check if port 3001 is available');
    console.log('3. Restart the server if needed');
  }
}

runTests(); 