const { execSync } = require('child_process');

console.log('🔍 ExpenseFlow Pro - Status Check');
console.log('==================================\n');

// Check if processes are running
console.log('📊 Process Status:');
try {
  const processes = execSync('tasklist /fi "imagename eq node.exe"', { encoding: 'utf8' });
  if (processes.includes('node.exe')) {
    console.log('✅ Node.js processes are running');
  } else {
    console.log('❌ No Node.js processes found');
  }
} catch (error) {
  console.log('❌ Could not check processes');
}

// Check ports
console.log('\n🔌 Port Status:');
try {
  const ports = execSync('netstat -ano | findstr ":300"', { encoding: 'utf8' });
  if (ports.includes(':3000')) {
    console.log('✅ Port 3000 (Frontend) is in use');
  } else {
    console.log('❌ Port 3000 (Frontend) is free');
  }
  
  if (ports.includes(':3002')) {
    console.log('✅ Port 3002 (Backend) is in use');
  } else {
    console.log('❌ Port 3002 (Backend) is free');
  }
} catch (error) {
  console.log('❌ Could not check ports');
}

console.log('\n📋 WHAT TO DO:');
console.log('==============');
console.log('1. If NO processes running:');
console.log('   Terminal 1: node simple-server.js');
console.log('   Terminal 2: cd frontend && npm run dev');
console.log('');
console.log('2. If processes ARE running but app not working:');
console.log('   - Check http://localhost:3000 (should show diagnostic page)');
console.log('   - Check browser console for errors');
console.log('');
console.log('3. The diagnostic homepage will show:');
console.log('   - Frontend status');
console.log('   - Backend connectivity');
console.log('   - Options to test dashboard or login manually');
console.log('');
console.log('🎯 This bypasses the infinite loading issue!'); 