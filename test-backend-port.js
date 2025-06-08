// Test script to verify backend port configuration
const express = require('express');

// Read the simple-server.js file to check port configuration
const fs = require('fs');
const path = require('path');

console.log('🔍 ExpenseFlow Pro - Backend Port Configuration Test');
console.log('====================================================');

// Check if simple-server.js exists
const serverFile = path.join(__dirname, 'simple-server.js');
if (!fs.existsSync(serverFile)) {
  console.error('❌ simple-server.js not found!');
  process.exit(1);
}

// Read the server file and check port configuration
const serverContent = fs.readFileSync(serverFile, 'utf8');
const portMatch = serverContent.match(/const PORT = process\.env\.PORT \|\| (\d+)/);

if (portMatch) {
  const defaultPort = portMatch[1];
  console.log(`✅ Found port configuration: process.env.PORT || ${defaultPort}`);
  
  // Test with different environment variables
  console.log('\n📋 Port Resolution Test:');
  
  // Test 1: No PORT env var
  delete process.env.PORT;
  const port1 = process.env.PORT || defaultPort;
  console.log(`   No PORT env var: ${port1}`);
  
  // Test 2: PORT=4001
  process.env.PORT = '4001';
  const port2 = process.env.PORT || defaultPort;
  console.log(`   PORT=4001: ${port2}`);
  
  // Test 3: PORT=3000
  process.env.PORT = '3000';
  const port3 = process.env.PORT || defaultPort;
  console.log(`   PORT=3000: ${port3}`);
  
  console.log('\n🎯 Recommended startup commands:');
  console.log('   Backend: set PORT=4001 && node simple-server.js');
  console.log('   Frontend: cd frontend && set PORT=4000 && npm run dev');
  
} else {
  console.error('❌ Could not find port configuration in simple-server.js');
}

// Check CORS configuration
const corsMatch = serverContent.match(/origin: \[(.*?)\]/);
if (corsMatch) {
  console.log(`\n✅ CORS origins found: ${corsMatch[1]}`);
} else {
  console.log('\n⚠️ CORS configuration not found or different format');
}

// Check if frontend directory exists
const frontendDir = path.join(__dirname, 'frontend');
if (fs.existsSync(frontendDir)) {
  console.log('✅ Frontend directory exists');
  
  // Check frontend package.json
  const frontendPackage = path.join(frontendDir, 'package.json');
  if (fs.existsSync(frontendPackage)) {
    console.log('✅ Frontend package.json exists');
  } else {
    console.log('❌ Frontend package.json missing');
  }
} else {
  console.log('❌ Frontend directory missing');
}

console.log('\n🚀 To start the application:');
console.log('1. Open two terminal windows');
console.log('2. Terminal 1: set PORT=4001 && node simple-server.js');
console.log('3. Terminal 2: cd frontend && set PORT=4000 && npm run dev');
console.log('4. Open http://localhost:4000 in your browser');
console.log('\nAlternatively, run: node start-both.js'); 