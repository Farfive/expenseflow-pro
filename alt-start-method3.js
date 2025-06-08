const { spawn, exec } = require('child_process');
const path = require('path');

console.log('================================================');
console.log('ExpenseFlow Pro - Alternative Startup Method 3');
console.log('Single Process Manager');
console.log('================================================\n');

// Kill any existing processes on our ports
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
          const pid = line.trim().split(/\s+/).pop();
          if (pid && pid !== 'PID') {
            exec(`taskkill /F /PID ${pid}`, () => {});
          }
        });
      }
      setTimeout(resolve, 1000);
    });
  });
}

async function startServices() {
  console.log('[1/4] Cleaning up existing processes...');
  await killProcessOnPort(3000);
  await killProcessOnPort(3002);
  
  console.log('[2/4] Starting Backend Server...');
  const backend = spawn('node', ['simple-server.js'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Wait for backend to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('[3/4] Starting Frontend Development Server...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });
  
  console.log('[4/4] Both services started!');
  console.log('Backend: http://localhost:3002');
  console.log('Frontend: http://localhost:3000');
  console.log('\nPress Ctrl+C to stop all services');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down services...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
  
  // Monitor processes
  backend.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
  });
  
  frontend.on('exit', (code) => {
    console.log(`Frontend exited with code ${code}`);
  });
}

startServices().catch(console.error); 