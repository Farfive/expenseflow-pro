const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ExpenseFlow Pro - Simple Start');
console.log('==================================\n');

// Step 1: Create environment file
console.log('⚙️ Creating environment file...');
const envContent = `NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1`;

const envPath = path.join(__dirname, 'frontend', '.env.local');
fs.writeFileSync(envPath, envContent);
console.log('✅ Created .env.local\n');

// Step 2: Instructions
console.log('📋 MANUAL STEPS TO START:');
console.log('=========================');
console.log('');
console.log('1️⃣ TERMINAL 1 - Start Backend:');
console.log('   node simple-server.js');
console.log('');
console.log('2️⃣ TERMINAL 2 - Start Frontend:');
console.log('   cd frontend');
console.log('   npm run dev');
console.log('');
console.log('🔗 URLs:');
console.log('   Backend:  http://localhost:3002');
console.log('   Frontend: http://localhost:3000');
console.log('');
console.log('⚡ Autologin will work automatically!');
console.log('🎉 This avoids all the turbo/port issues!'); 