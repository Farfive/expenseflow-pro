const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚨 EMERGENCY FIX - ExpenseFlow Pro');
console.log('===================================\n');

// Kill all Node processes first
console.log('🛑 Step 1: Killing all Node.js processes...');
try {
  execSync('taskkill /f /im node.exe /t', { stdio: 'ignore' });
  console.log('✅ Killed Node.js processes');
} catch (error) {
  console.log('ℹ️  No Node.js processes found');
}

console.log('\n⏱️  Waiting 3 seconds for cleanup...');
// Wait for processes to clean up
setTimeout(() => {
  continueEmergencyFix();
}, 3000);

function continueEmergencyFix() {
  console.log('\n🔧 Step 2: Creating missing .env.local file...');
  
  const envContent = `# ExpenseFlow Pro Environment
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
ANALYZE=false
`;

  const envPath = path.join(__dirname, 'frontend', '.env.local');
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env.local with correct configuration');
  } catch (error) {
    console.log('❌ Failed to create .env.local:', error.message);
  }

  // Clean .next directory
  console.log('\n🧹 Step 3: Cleaning corrupted cache...');
  const nextDir = path.join(__dirname, 'frontend', '.next');
  if (fs.existsSync(nextDir)) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true });
      console.log('✅ Removed .next directory');
    } catch (error) {
      console.log('⚠️  Could not remove .next:', error.message);
    }
  } else {
    console.log('ℹ️  .next directory not found');
  }

  // Check if package.json exists
  console.log('\n📦 Step 4: Checking dependencies...');
  const packagePath = path.join(__dirname, 'frontend', 'package.json');
  if (fs.existsSync(packagePath)) {
    console.log('✅ Frontend package.json exists');
    
    // Check if node_modules exists
    const nodeModulesPath = path.join(__dirname, 'frontend', 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      console.log('✅ Frontend node_modules exists');
    } else {
      console.log('❌ Frontend node_modules missing');
      console.log('   Run: cd frontend && npm install');
    }
  } else {
    console.log('❌ Frontend package.json missing');
  }

  // Test backend file
  console.log('\n🔍 Step 5: Checking backend file...');
  const backendPath = path.join(__dirname, 'simple-server.js');
  if (fs.existsSync(backendPath)) {
    console.log('✅ Backend file (simple-server.js) exists');
  } else {
    console.log('❌ Backend file missing');
  }

  console.log('\n🎉 EMERGENCY FIX COMPLETE!');
  console.log('==========================');
  console.log('');
  console.log('📋 MANUAL STARTUP STEPS:');
  console.log('');
  console.log('1️⃣ TERMINAL 1 - Backend:');
  console.log('   node simple-server.js');
  console.log('');
  console.log('2️⃣ TERMINAL 2 - Frontend:');
  console.log('   cd frontend');
  console.log('   npm run dev');
  console.log('');
  console.log('3️⃣ OPEN BROWSER:');
  console.log('   http://localhost:3000');
  console.log('');
  console.log('🎯 You should see the diagnostic page!');
  console.log('');
  console.log('🔧 If frontend fails to start:');
  console.log('   cd frontend && npm install');
  console.log('   Then try npm run dev again');
}

// If running directly, show immediate instructions
if (require.main === module) {
  // Script is being run directly, not imported
} 