const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Enhanced logging with timestamps
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    ERROR: '\x1b[31m',   // Red
    WARNING: '\x1b[33m', // Yellow
    RESET: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${type}: ${message}${colors.RESET}`);
}

// Track startup phases
let startupPhase = 'INIT';
let backendStarted = false;
let frontendStarted = false;

console.log('\n🔍 DIAGNOSTIC STARTUP WITH DETAILED LOGGING');
console.log('==============================================');

async function diagnosticStartup() {
  try {
    // Phase 1: Environment Check
    startupPhase = 'ENV_CHECK';
    log('Starting diagnostic startup process');
    log('Current working directory: ' + process.cwd());
    log('Node.js version: ' + process.version);
    
    // Check if required files exist
    const requiredFiles = [
      'simple-server.js',
      'frontend/package.json',
      'frontend/next.config.simple.js'
    ];
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        log(`✅ Found: ${file}`, 'SUCCESS');
      } else {
        log(`❌ Missing: ${file}`, 'ERROR');
      }
    }
    
    // Phase 2: Port Check
    startupPhase = 'PORT_CHECK';
    log('Checking ports 3000 and 3002...');
    
    await new Promise((resolve) => {
      exec('netstat -ano | findstr ":3000\\|:3002"', (error, stdout) => {
        if (stdout) {
          log('Ports in use:', 'WARNING');
          console.log(stdout);
          log('Attempting to kill processes...', 'WARNING');
          exec('taskkill /F /IM node.exe 2>nul', () => {
            setTimeout(resolve, 2000);
          });
        } else {
          log('Ports are free', 'SUCCESS');
          resolve();
        }
      });
    });
    
    // Phase 3: Backend Startup with Detailed Monitoring
    startupPhase = 'BACKEND_START';
    log('Starting backend with detailed monitoring...');
    
    const backend = spawn('node', ['simple-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    let backendOutput = '';
    backend.stdout.on('data', (data) => {
      const output = data.toString();
      backendOutput += output;
      
      // Log each backend message
      output.split('\n').forEach(line => {
        if (line.trim()) {
          log(`BACKEND: ${line.trim()}`);
        }
      });
      
      if (output.includes('Ready for testing')) {
        backendStarted = true;
        log('Backend startup completed successfully!', 'SUCCESS');
        setTimeout(startFrontend, 2000);
      }
    });
    
    backend.stderr.on('data', (data) => {
      log(`BACKEND ERROR: ${data.toString()}`, 'ERROR');
    });
    
    backend.on('error', (err) => {
      log(`Backend process error: ${err.message}`, 'ERROR');
    });
    
    backend.on('exit', (code, signal) => {
      log(`Backend exited with code ${code}, signal ${signal}`, code === 0 ? 'INFO' : 'ERROR');
    });
    
    // Timeout for backend
    setTimeout(() => {
      if (!backendStarted) {
        log('Backend startup timeout - taking too long', 'ERROR');
        startFrontend(); // Try anyway
      }
    }, 10000);
    
  } catch (error) {
    log(`Startup error: ${error.message}`, 'ERROR');
  }
}

function startFrontend() {
  if (startupPhase === 'FRONTEND_START') return; // Prevent double start
  
  startupPhase = 'FRONTEND_START';
  log('Starting frontend diagnostic...');
  
  const frontendDir = path.join(__dirname, 'frontend');
  log(`Frontend directory: ${frontendDir}`);
  
  // Check frontend directory structure
  const frontendFiles = ['package.json', 'next.config.js', 'next.config.simple.js'];
  frontendFiles.forEach(file => {
    const filePath = path.join(frontendDir, file);
    if (fs.existsSync(filePath)) {
      log(`✅ Frontend file exists: ${file}`, 'SUCCESS');
    } else {
      log(`❌ Frontend file missing: ${file}`, 'ERROR');
    }
  });
  
  // Apply simple config
  try {
    const simpleConfigPath = path.join(frontendDir, 'next.config.simple.js');
    const configPath = path.join(frontendDir, 'next.config.js');
    
    if (fs.existsSync(simpleConfigPath)) {
      fs.copyFileSync(simpleConfigPath, configPath);
      log('Applied simple Next.js configuration', 'SUCCESS');
    } else {
      log('Simple config not found, using existing config', 'WARNING');
    }
  } catch (err) {
    log(`Config copy error: ${err.message}`, 'ERROR');
  }
  
  // Start frontend with maximum logging
  log('Spawning frontend process...');
  
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: frontendDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
      TURBO_TELEMETRY_DISABLED: '1',
      DEBUG: '*',
      VERBOSE: '1'
    }
  });
  
  let frontendOutput = '';
  let lastOutputTime = Date.now();
  
  frontend.stdout.on('data', (data) => {
    const output = data.toString();
    frontendOutput += output;
    lastOutputTime = Date.now();
    
    // Log each frontend message with analysis
    output.split('\n').forEach(line => {
      if (line.trim()) {
        log(`FRONTEND: ${line.trim()}`);
        
        // Analyze specific messages
        if (line.includes('Starting...')) {
          log('Frontend is starting Next.js compilation...', 'INFO');
        }
        if (line.includes('ready')) {
          frontendStarted = true;
          log('Frontend startup completed successfully!', 'SUCCESS');
        }
        if (line.includes('Local:')) {
          log('Frontend server is ready and listening!', 'SUCCESS');
        }
        if (line.includes('error') || line.includes('Error')) {
          log(`Potential error detected: ${line}`, 'WARNING');
        }
      }
    });
  });
  
  frontend.stderr.on('data', (data) => {
    const error = data.toString();
    log(`FRONTEND ERROR: ${error}`, 'ERROR');
  });
  
  frontend.on('error', (err) => {
    log(`Frontend process error: ${err.message}`, 'ERROR');
  });
  
  frontend.on('exit', (code, signal) => {
    log(`Frontend exited with code ${code}, signal ${signal}`, code === 0 ? 'INFO' : 'ERROR');
  });
  
  // Monitor for hanging
  const hangDetector = setInterval(() => {
    const timeSinceLastOutput = Date.now() - lastOutputTime;
    
    if (timeSinceLastOutput > 15000 && !frontendStarted) { // 15 seconds of silence
      log(`⚠️  HANG DETECTED: No output for ${Math.round(timeSinceLastOutput/1000)}s`, 'ERROR');
      log('Current phase: ' + startupPhase, 'ERROR');
      log('Last output was:', 'ERROR');
      console.log(frontendOutput.slice(-200)); // Last 200 chars
      
      log('Attempting alternative startup...', 'WARNING');
      clearInterval(hangDetector);
      tryAlternativeFrontend();
    }
  }, 5000);
  
  // Success detector
  setTimeout(() => {
    if (frontendStarted) {
      clearInterval(hangDetector);
      log('🎉 DIAGNOSTIC COMPLETE - Both services running!', 'SUCCESS');
      log('Backend: http://localhost:3002', 'SUCCESS');
      log('Frontend: http://localhost:3000', 'SUCCESS');
    }
  }, 30000);
}

function tryAlternativeFrontend() {
  log('Trying alternative frontend startup method...', 'WARNING');
  
  const frontendDir = path.join(__dirname, 'frontend');
  
  // Try with npx next dev directly
  const altFrontend = spawn('npx', ['next', 'dev', '--port', '3000'], {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1'
    }
  });
  
  altFrontend.on('error', (err) => {
    log(`Alternative frontend failed: ${err.message}`, 'ERROR');
    log('🔍 MANUAL DEBUGGING NEEDED', 'ERROR');
    log('Try these commands manually:', 'INFO');
    log('1. cd frontend', 'INFO');
    log('2. npm run dev', 'INFO');
    log('3. Check for error messages', 'INFO');
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('🛑 Diagnostic interrupted by user', 'WARNING');
  log(`Final phase: ${startupPhase}`, 'INFO');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`, 'ERROR');
  console.error(err.stack);
});

// Start the diagnostic
diagnosticStartup(); 