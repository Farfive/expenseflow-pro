const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ExpenseFlow Pro - Quick Setup for Development');
console.log('=================================================');

try {
  // Step 1: Generate Prisma Client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully');

  // Step 2: Push database schema
  console.log('🗄️  Creating database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Database schema created successfully');

  // Step 3: Check if uploads directory exists
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 Creating uploads directory...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, 'documents'), { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, 'temp'), { recursive: true });
    console.log('✅ Uploads directory created');
  }

  // Step 4: Check if logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    console.log('📋 Creating logs directory...');
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Logs directory created');
  }

  console.log('\n🎉 Setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Start the backend: npm run dev');
  console.log('2. In another terminal, start the frontend: cd frontend && npm run dev');
  console.log('3. Open http://localhost:3000 in your browser');
  console.log('\n🔗 Test the analytics at: http://localhost:3000/test-analytics');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure you have Node.js 18+ installed');
  console.log('2. Run "npm install" to install dependencies');
  console.log('3. Check that no other processes are using the database');
  process.exit(1);
} 