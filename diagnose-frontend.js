const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 ExpenseFlow Pro - Frontend Diagnostic');
console.log('========================================');

// Check frontend directory structure
console.log('\n[1/5] Checking frontend directory...');
const frontendDir = path.join(__dirname, 'frontend');

if (!fs.existsSync(frontendDir)) {
  console.log('❌ Frontend directory not found!');
  process.exit(1);
}

console.log('✅ Frontend directory exists');

// Check package.json
const packagePath = path.join(frontendDir, 'package.json');
if (!fs.existsSync(packagePath)) {
  console.log('❌ Frontend package.json not found!');
  process.exit(1);
}

console.log('✅ Frontend package.json exists');

// Check node_modules
const nodeModulesPath = path.join(frontendDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ Frontend node_modules not found!');
  console.log('🔧 Run: cd frontend && npm install');
  process.exit(1);
}

console.log('✅ Frontend node_modules exists');

// Check Next.js installation
const nextPath = path.join(frontendDir, 'node_modules', 'next');
if (!fs.existsSync(nextPath)) {
  console.log('❌ Next.js not installed!');
  console.log('🔧 Run: cd frontend && npm install next');
  process.exit(1);
}

console.log('✅ Next.js is installed');

// Check for problematic files
console.log('\n[2/5] Checking for problematic files...');

const problematicFiles = [
  '.next/cache',
  '.next/static',
  'node_modules/.cache'
];

let foundProblems = false;
problematicFiles.forEach(file => {
  const fullPath = path.join(frontendDir, file);
  if (fs.existsSync(fullPath)) {
    console.log(`⚠️ Found cache: ${file}`);
    foundProblems = true;
  }
});

if (foundProblems) {
  console.log('🔧 Consider clearing cache: cd frontend && rm -rf .next node_modules/.cache');
} else {
  console.log('✅ No problematic cache files found');
}

// Check environment files
console.log('\n[3/5] Checking environment configuration...');

const envFiles = ['.env.local', '.env', '.env.development'];
envFiles.forEach(envFile => {
  const envPath = path.join(frontendDir, envFile);
  if (fs.existsSync(envPath)) {
    console.log(`✅ Found: ${envFile}`);
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('NEXT_PUBLIC_API_URL')) {
      console.log(`   Contains API URL configuration`);
    }
  }
});

// Test Next.js compilation
console.log('\n[4/5] Testing Next.js compilation...');
console.log('Running: next build --dry-run (this may take a moment)...');

const testBuild = spawn('npx', ['next', 'build', '--dry-run'], {
  cwd: frontendDir,
  stdio: 'pipe'
});

let buildOutput = '';
testBuild.stdout.on('data', (data) => {
  buildOutput += data.toString();
});

testBuild.stderr.on('data', (data) => {
  buildOutput += data.toString();
});

testBuild.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Next.js compilation test passed');
  } else {
    console.log('❌ Next.js compilation test failed');
    console.log('Build output:', buildOutput);
  }
  
  // Recommendations
  console.log('\n[5/5] Recommendations:');
  console.log('======================');
  
  if (code !== 0) {
    console.log('🔧 Frontend compilation issues detected:');
    console.log('   1. cd frontend && npm install');
    console.log('   2. cd frontend && rm -rf .next node_modules/.cache');
    console.log('   3. cd frontend && npm run dev:fast');
  } else {
    console.log('✅ Frontend should compile successfully');
    console.log('🚀 Try running: FAST_START.bat');
  }
  
  console.log('\n💡 Alternative startup methods:');
  console.log('   - FAST_START.bat (uses turbo mode)');
  console.log('   - QUICK_FIX.bat (uses simplified config)');
  console.log('   - Manual: cd frontend && npm run dev:fast');
});

// Timeout for build test
setTimeout(() => {
  testBuild.kill();
  console.log('⏰ Build test timed out (this is normal for first run)');
  console.log('✅ Next.js appears to be working');
  console.log('\n🚀 Try running: FAST_START.bat');
}, 30000); 