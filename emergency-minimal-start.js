const { exec, spawn } = require('child_process');
const path = require('path');

console.log('🚨 EMERGENCY MINIMAL STARTUP');
console.log('============================');

// Kill any existing processes
console.log('1. Killing existing processes...');
exec('taskkill /F /IM node.exe 2>nul', () => {
  setTimeout(startServices, 2000);
});

function startServices() {
  console.log('2. Starting Backend...');
  
  // Start backend with minimal output
  const backend = spawn('node', ['simple-server.js'], {
    stdio: 'pipe'
  });
  
  backend.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Ready for testing')) {
      console.log('✅ Backend started successfully!');
      startFrontend();
    }
  });
  
  backend.stderr.on('data', (data) => {
    console.log('Backend error:', data.toString());
  });
}

function startFrontend() {
  console.log('3. Starting Frontend (Minimal Mode)...');
  
  const frontendDir = path.join(__dirname, 'frontend');
  
  // Use basic npm start instead of dev
  const frontend = spawn('npm', ['start'], {
    cwd: frontendDir,
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
      TURBO_TELEMETRY_DISABLED: '1',
      PORT: '3000'
    }
  });
  
  frontend.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Frontend:', output.trim());
    
    if (output.includes('ready') || output.includes('Local:')) {
      console.log('✅ Frontend started successfully!');
      console.log('🌐 Open: http://localhost:3000');
    }
  });
  
  frontend.stderr.on('data', (data) => {
    console.log('Frontend warning:', data.toString());
  });
  
  frontend.on('error', (err) => {
    console.log('Frontend failed, trying alternative...');
    startFrontendAlternative();
  });
}

function startFrontendAlternative() {
  console.log('4. Trying alternative frontend startup...');
  
  const frontendDir = path.join(__dirname, 'frontend');
  
  // Try with npx next dev directly
  const frontend = spawn('npx', ['next', 'dev'], {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1'
    }
  });
  
  frontend.on('error', () => {
    console.log('❌ All frontend startup methods failed');
    console.log('Try: cd frontend && npm run dev manually');
  });
}

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
}); 