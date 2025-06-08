const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 ExpenseFlow Pro - Programmatic Startup');
console.log('==========================================');

// Kill existing processes
console.log('[1/5] Cleaning up existing processes...');
exec('taskkill /f /im node.exe', (error) => {
  if (error && !error.message.includes('not found')) {
    console.log('Note: Some processes may have been running');
  }
  
  setTimeout(() => {
    console.log('[2/5] Starting backend server on port 4001...');
    
    // Start backend
    const backend = spawn('node', ['simple-server.js'], {
      env: { ...process.env, PORT: '4001', NODE_ENV: 'development' },
      stdio: 'pipe',
      cwd: __dirname
    });
    
    backend.stdout.on('data', (data) => {
      console.log(`[BACKEND] ${data.toString().trim()}`);
    });
    
    backend.stderr.on('data', (data) => {
      console.error(`[BACKEND ERROR] ${data.toString().trim()}`);
    });
    
    backend.on('error', (error) => {
      console.error('[BACKEND] Failed to start:', error.message);
    });
    
    // Wait for backend to start, then start frontend
    setTimeout(() => {
      console.log('[3/5] Testing backend connectivity...');
      
      // Test backend
      const http = require('http');
      const req = http.get('http://localhost:4001/api/health', (res) => {
        console.log('✅ Backend is responding on port 4001');
        startFrontend();
      });
      
      req.on('error', (error) => {
        console.log('❌ Backend not responding, but continuing with frontend...');
        startFrontend();
      });
      
      req.setTimeout(5000, () => {
        console.log('⏰ Backend health check timeout, continuing...');
        startFrontend();
      });
      
    }, 8000);
    
  }, 3000);
});

function startFrontend() {
  console.log('[4/5] Starting frontend server on port 4000...');
  
  const frontend = spawn('npm', ['run', 'dev'], {
    env: { 
      ...process.env, 
      PORT: '4000',
      NEXT_PUBLIC_API_URL: 'http://localhost:4001'
    },
    stdio: 'pipe',
    cwd: path.join(__dirname, 'frontend'),
    shell: true
  });
  
  frontend.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`[FRONTEND] ${output}`);
    
    // Check if frontend is ready
    if (output.includes('Local:') && output.includes('4000')) {
      setTimeout(() => {
        console.log('[5/5] Opening browser...');
        const { exec } = require('child_process');
        exec('start http://localhost:4000');
        
        console.log('');
        console.log('==========================================');
        console.log('          STARTUP COMPLETE!');
        console.log('==========================================');
        console.log('');
        console.log('Backend:  http://localhost:4001/api/health');
        console.log('Frontend: http://localhost:4000');
        console.log('');
        console.log('Press Ctrl+C to stop both services');
      }, 3000);
    }
  });
  
  frontend.stderr.on('data', (data) => {
    console.error(`[FRONTEND ERROR] ${data.toString().trim()}`);
  });
  
  frontend.on('error', (error) => {
    console.error('[FRONTEND] Failed to start:', error.message);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down services...');
  exec('taskkill /f /im node.exe', () => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down services...');
  exec('taskkill /f /im node.exe', () => {
    process.exit(0);
  });
}); 