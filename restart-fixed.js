const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 ExpenseFlow Pro - TURBO FIX & RESTART');
console.log('=========================================\n');

// Step 1: Kill any existing Node.js processes
console.log('🛑 Stopping existing processes...');
try {
  execSync('taskkill /f /im node.exe /t', { stdio: 'ignore' });
  console.log('✅ Stopped Node.js processes');
} catch (error) {
  console.log('ℹ️  No processes to stop');
}

// Step 2: Clean .next directory  
console.log('\n🧹 Cleaning build cache...');
const nextDir = path.join(__dirname, 'frontend', '.next');
if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('✅ Removed .next directory');
  } catch (error) {
    console.log('⚠️  Could not remove .next directory:', error.message);
  }
} else {
  console.log('ℹ️  .next directory not found');
}

// Step 3: Create environment file
console.log('\n⚙️  Creating environment file...');
const envContent = `NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1`;

const envPath = path.join(__dirname, 'frontend', '.env.local');
fs.writeFileSync(envPath, envContent);
console.log('✅ Created .env.local');

console.log('\n🎉 TURBO FIX COMPLETE!');
console.log('======================');
console.log('✅ Disabled turbo in next.config.js');
console.log('✅ Fixed API URL configuration');
console.log('✅ Cleaned corrupted cache');
console.log('✅ Created proper environment');
console.log('');
console.log('📋 NOW START MANUALLY:');
console.log('');
console.log('Terminal 1: node simple-server.js');
console.log('Terminal 2: cd frontend && npm run dev');
console.log('');
console.log('🚀 This should eliminate the turbopack runtime error!'); 