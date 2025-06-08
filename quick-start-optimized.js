const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ExpenseFlow Pro - ULTRA FAST Startup');
console.log('=====================================\n');

// Create optimized environment file for frontend
const envContent = `# ULTRA FAST Development Environment
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Performance optimizations
NEXT_TELEMETRY_DISABLED=1
NEXT_PRIVATE_STANDALONE=true
FAST_REFRESH=true

# Skip unnecessary features for speed
NEXT_PUBLIC_FEATURE_ANALYTICS=false
ANALYZE=false
`;

const envPath = path.join(__dirname, 'frontend', '.env.local');
try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created optimized .env.local for frontend');
} catch (error) {
  console.log('⚠️  Could not create .env.local:', error.message);
}

// Function to start processes with optimizations
function startProcess(command, args, cwd, name, color) {
  const childProcess = spawn(command, args, {
    cwd: cwd || __dirname,
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096',
      FORCE_COLOR: '1'
    }
  });

  childProcess.stdout.on('data', (data) => {
    console.log(`${color}[${name}]${'\x1b[0m'} ${data.toString().trim()}`);
  });

  childProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (!message.includes('ExperimentalWarning') && !message.includes('punycode')) {
      console.log(`${color}[${name}]${'\x1b[0m'} ${message}`);
    }
  });

  childProcess.on('close', (code) => {
    console.log(`${color}[${name}]${'\x1b[0m'} Process exited with code ${code}`);
  });

  return childProcess;
}

// Start backend server (optimized)
console.log('🔧 Starting ULTRA FAST backend server...');
const backend = startProcess(
  'node',
  ['simple-server.js'],
  __dirname,
  'BACKEND',
  '\x1b[36m' // Cyan
);

// Wait a moment for backend to start, then start frontend
setTimeout(() => {
  console.log('🎨 Starting ULTRA FAST frontend...');
  const frontend = startProcess(
    'npm',
    ['run', 'dev'],
    path.join(__dirname, 'frontend'),
    'FRONTEND',
    '\x1b[32m' // Green
  );

  // Health check after startup
  setTimeout(() => {
    console.log('\n🏁 ULTRA FAST Startup Complete!');
    console.log('================================');
    console.log('🔗 Backend:  http://localhost:3002');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('⚡ Autologin: ENABLED & OPTIMIZED');
    console.log('🚀 Ready for lightning-fast testing!\n');
  }, 5000);

}, 2000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
}); 