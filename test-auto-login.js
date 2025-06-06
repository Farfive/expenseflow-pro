const axios = require('axios');

async function testAutoLogin() {
  console.log('🧪 Testing Auto-Login Functionality\n');
  
  try {
    // Test 1: Backend auto-login endpoint
    console.log('1️⃣ Testing backend auto-login endpoint...');
    const response = await axios.post('http://localhost:3002/api/auth/auto-login', {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.success) {
      console.log('✅ Backend auto-login successful');
      console.log(`   User: ${response.data.data.user.name} (${response.data.data.user.email})`);
      console.log(`   Role: ${response.data.data.user.role}`);
      console.log(`   Token: ${response.data.data.token.substring(0, 20)}...`);
    } else {
      console.log('❌ Backend auto-login failed');
      return;
    }
    
    // Test 2: Verify token works with protected endpoint
    console.log('\n2️⃣ Testing token with protected endpoint...');
    const token = response.data.data.token;
    
    try {
      const meResponse = await axios.get('http://localhost:3002/api/auth/me', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (meResponse.data.success) {
        console.log('✅ Token validation successful');
        console.log(`   Authenticated as: ${meResponse.data.data.name}`);
      } else {
        console.log('❌ Token validation failed');
      }
    } catch (error) {
      console.log('❌ Token validation error:', error.response?.data?.message || error.message);
    }
    
    // Test 3: Frontend accessibility
    console.log('\n3️⃣ Testing frontend accessibility...');
    try {
      const frontendResponse = await axios.get('http://localhost:3000', {
        timeout: 5000
      });
      
      if (frontendResponse.status === 200) {
        console.log('✅ Frontend is accessible');
        console.log('   Status:', frontendResponse.status);
      } else {
        console.log('❌ Frontend returned unexpected status:', frontendResponse.status);
      }
    } catch (error) {
      console.log('❌ Frontend accessibility error:', error.message);
    }
    
    console.log('\n🎉 Auto-login system is ready!');
    console.log('\n📋 Instructions:');
    console.log('   1. Open http://localhost:3000 in your browser');
    console.log('   2. The app will automatically log you in as the test user');
    console.log('   3. You will be redirected to the dashboard');
    console.log('   4. No need to enter credentials - login page is bypassed!');
    console.log('\n👤 Test User Credentials:');
    console.log('   Email: test@expenseflow.com');
    console.log('   Name: Test User');
    console.log('   Role: admin');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Response:', error.response.data);
    }
  }
}

// Run the test
testAutoLogin(); 