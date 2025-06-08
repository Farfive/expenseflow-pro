const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🛡️  ExpenseFlow Pro - SAFE Startup (No Turbo Issues)');
console.log('====================================================\n');

// Create safe environment file for frontend
const envContent = `# SAFE Development Environment (No Turbo Issues)
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Disable problematic features
NEXT_TELEMETRY_DISABLED=1
ANALYZE=false

# Safe Next.js settings
FAST_REFRESH=true
NEXT_PRIVATE_STANDALONE=false
`;

const envPath = path.join(__dirname, 'frontend', '.env.local');
try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created safe .env.local for frontend');
} catch (error) {
  console.log('⚠️  Could not create .env.local:', error.message);
}

// Function to start processes safely
function startProcessSafe(command, args, cwd, name, color) {
  console.log(`🚀 Starting ${name}...`);
  
  const childProcess = spawn(command, args, {
    cwd: cwd || __dirname,
    stdio: 'inherit', // Show output directly
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096',
      FORCE_COLOR: '1'
    }
  });

  childProcess.on('error', (error) => {
    console.error(`❌ ${name} failed to start:`, error.message);
  });

  childProcess.on('close', (code) => {
    console.log(`${color}[${name}]${'\x1b[0m'} Process exited with code ${code}`);
  });

  return childProcess;
}

// Clean startup function
async function cleanStartup() {
  console.log('🧹 Cleaning up any existing processes...');
  
  // Start backend server (optimized)
  console.log('🔧 Starting backend server...');
  const backend = startProcessSafe(
    'node',
    ['simple-server.js'],
    __dirname,
    'BACKEND',
    '\x1b[36m'
  );

  // Wait for backend to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Start frontend with safe settings (no turbo)
  console.log('🎨 Starting frontend (SAFE MODE - No Turbo)...');
  const frontend = startProcessSafe(
    'npm',
    ['run', 'dev', '--', '--no-turbo'],
    path.join(__dirname, 'frontend'),
    'FRONTEND',
    '\x1b[32m'
  );

  // Show completion message
  setTimeout(() => {
    console.log('\n🏁 SAFE Startup Complete!');
    console.log('=========================');
    console.log('🔗 Backend:  http://localhost:3002');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('⚡ Autologin: ENABLED & OPTIMIZED');
    console.log('🛡️  Mode: SAFE (Turbo Disabled)');
    console.log('🚀 Ready for testing!\n');
  }, 8000);

  return { backend, frontend };
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down safely...');
  process.exit(0);
});

// Start the application
cleanStartup().catch(console.error); 