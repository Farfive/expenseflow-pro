const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 MANUAL FRONTEND TEST WITH DETAILED DEBUGGING');
console.log('===============================================');

// Change to frontend directory
const frontendDir = path.join(__dirname, 'frontend');
process.chdir(frontendDir);

console.log('Current directory:', process.cwd());
console.log('Node.js version:', process.version);

// Apply simple config
console.log('\n1. Applying simple Next.js configuration...');
try {
  if (fs.existsSync('next.config.simple.js')) {
    fs.copyFileSync('next.config.simple.js', 'next.config.js');
    console.log('✅ Simple config applied');
  } else {
    console.log('❌ Simple config not found');
  }
} catch (err) {
  console.log('❌ Config error:', err.message);
}

// Check node_modules
console.log('\n2. Checking dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules exists');
} else {
  console.log('❌ node_modules missing - need to run npm install');
  process.exit(1);
}

// Environment setup
console.log('\n3. Setting up environment...');
process.env.NODE_ENV = 'development';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.TURBO_TELEMETRY_DISABLED = '1';
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

console.log('Environment variables set:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- NEXT_TELEMETRY_DISABLED:', process.env.NEXT_TELEMETRY_DISABLED);
console.log('- TURBO_TELEMETRY_DISABLED:', process.env.TURBO_TELEMETRY_DISABLED);

// Start Next.js with maximum debugging
console.log('\n4. Starting Next.js with detailed logging...');
console.log('================================================');

const startTime = Date.now();
let lastOutput = Date.now();

const nextProcess = spawn('npx', ['next', 'dev', '--port', '3000'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  env: process.env
});

console.log('Next.js process spawned, waiting for output...');

nextProcess.stdout.on('data', (data) => {
  const output = data.toString();
  lastOutput = Date.now();
  
  console.log('\n📤 STDOUT:', output.trim());
  
  // Analyze specific patterns
  if (output.includes('ready')) {
    console.log('🎉 SUCCESS: Next.js is ready!');
  }
  if (output.includes('Local:')) {
    console.log('🌐 Server is listening!');
  }
  if (output.includes('Starting...')) {
    console.log('⏳ Next.js is starting compilation...');
  }
  if (output.includes('Compiling')) {
    console.log('🔄 Compilation in progress...');
  }
});

nextProcess.stderr.on('data', (data) => {
  const error = data.toString();
  lastOutput = Date.now();
  
  console.log('\n🚨 STDERR:', error.trim());
  
  // Check for specific errors
  if (error.includes('EADDRINUSE')) {
    console.log('❌ Port 3000 is already in use!');
  }
  if (error.includes('Cannot find module')) {
    console.log('❌ Missing module dependency!');
  }
  if (error.includes('SyntaxError')) {
    console.log('❌ Syntax error in configuration!');
  }
});

nextProcess.on('error', (err) => {
  console.log('\n💥 PROCESS ERROR:', err.message);
});

nextProcess.on('exit', (code, signal) => {
  const duration = Date.now() - startTime;
  console.log(`\n🏁 Process exited after ${duration}ms`);
  console.log(`Exit code: ${code}, Signal: ${signal}`);
});

// Hang detector
const hangDetector = setInterval(() => {
  const timeSinceOutput = Date.now() - lastOutput;
  const totalTime = Date.now() - startTime;
  
  if (timeSinceOutput > 10000) { // 10 seconds of silence
    console.log(`\n⚠️  HANG DETECTED!`);
    console.log(`- No output for: ${Math.round(timeSinceOutput/1000)}s`);
    console.log(`- Total runtime: ${Math.round(totalTime/1000)}s`);
    console.log('\n🔍 This suggests Next.js is stuck during compilation');
    console.log('Common causes:');
    console.log('- Complex configuration in next.config.js');
    console.log('- Missing or corrupted dependencies');
    console.log('- TypeScript compilation issues');
    console.log('- Webpack configuration problems');
    
    console.log('\n🛑 Killing process...');
    nextProcess.kill('SIGTERM');
    clearInterval(hangDetector);
    
    setTimeout(() => {
      nextProcess.kill('SIGKILL');
      process.exit(1);
    }, 3000);
  }
}, 5000);

// Success timeout
setTimeout(() => {
  clearInterval(hangDetector);
  console.log('\n✅ Process has been running for 60 seconds - likely successful');
}, 60000);

console.log('\nProcess started, monitoring output...'); 