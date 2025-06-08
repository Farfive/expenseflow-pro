const http = require('http');

console.log('🔍 ExpenseFlow Pro - Service Verification');
console.log('=========================================');

// Test backend on different ports
const testPorts = [4001, 4002, 4003, 4004, 4005];
let backendPort = null;

async function testBackend() {
  console.log('\n[1/3] Testing backend connectivity...');
  
  for (const port of testPorts) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/api/health`, (res) => {
          if (res.statusCode === 200) {
            console.log(`✅ Backend found on port ${port}`);
            backendPort = port;
            resolve();
          } else {
            reject(new Error(`Status: ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.setTimeout(2000, () => reject(new Error('Timeout')));
      });
      break;
    } catch (error) {
      console.log(`❌ Port ${port}: ${error.message}`);
    }
  }
  
  if (!backendPort) {
    console.log('❌ Backend not found on any port');
    return false;
  }
  
  return true;
}

async function testFrontend() {
  console.log('\n[2/3] Testing frontend connectivity...');
  
  const frontendPorts = [4000, 4010, 4020];
  
  for (const port of frontendPorts) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            console.log(`✅ Frontend found on port ${port}`);
            resolve();
          } else {
            reject(new Error(`Status: ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.setTimeout(2000, () => reject(new Error('Timeout')));
      });
      return port;
    } catch (error) {
      console.log(`❌ Port ${port}: ${error.message}`);
    }
  }
  
  console.log('❌ Frontend not found on any port');
  return null;
}

async function main() {
  const backendRunning = await testBackend();
  const frontendPort = await testFrontend();
  
  console.log('\n[3/3] Service Status Summary:');
  console.log('==============================');
  
  if (backendRunning) {
    console.log(`✅ Backend: http://localhost:${backendPort}/api/health`);
  } else {
    console.log('❌ Backend: Not running');
  }
  
  if (frontendPort) {
    console.log(`✅ Frontend: http://localhost:${frontendPort}`);
  } else {
    console.log('❌ Frontend: Not running');
  }
  
  if (backendRunning && frontendPort) {
    console.log('\n🎉 SUCCESS! Both services are running');
    console.log(`🌐 Open your browser to: http://localhost:${frontendPort}`);
    console.log('📝 Use any email/password to login');
  } else {
    console.log('\n⚠️ Some services are not running. Check the terminal windows.');
    console.log('\n🔧 To start manually:');
    console.log('Terminal 1: set PORT=4005 && node simple-server.js');
    console.log('Terminal 2: cd frontend && set PORT=4000 && set NEXT_PUBLIC_API_URL=http://localhost:4005 && npm run dev');
  }
}

main().catch(console.error); 