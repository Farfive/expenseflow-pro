const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Next.js Fix & Clean Script');
console.log('==============================\n');

const frontendPath = path.join(__dirname, 'frontend');

// Function to safely remove directory
function removeDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed: ${path.basename(dirPath)}`);
      return true;
    } else {
      console.log(`ℹ️  Not found: ${path.basename(dirPath)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Failed to remove ${path.basename(dirPath)}:`, error.message);
    return false;
  }
}

// Clean Next.js build artifacts
console.log('🧹 Cleaning Next.js build artifacts...');
removeDir(path.join(frontendPath, '.next'));
removeDir(path.join(frontendPath, 'out'));
removeDir(path.join(frontendPath, '.turbo'));

// Clean package manager caches
console.log('\n🧹 Cleaning package manager caches...');
try {
  process.chdir(frontendPath);
  
  // Clear npm cache
  try {
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('✅ Cleaned npm cache');
  } catch (error) {
    console.log('⚠️  Could not clean npm cache');
  }
  
  // Reinstall dependencies
  console.log('\n📦 Reinstalling dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies reinstalled');
  } catch (error) {
    console.log('❌ Failed to reinstall dependencies:', error.message);
  }
  
} catch (error) {
  console.log('❌ Error during cleanup:', error.message);
}

// Create safe environment file
console.log('\n⚙️  Creating safe environment configuration...');
const envContent = `# SAFE Next.js Environment
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Disable problematic features
NEXT_TELEMETRY_DISABLED=1
ANALYZE=false

# Performance & Safety
FAST_REFRESH=true
NEXT_PRIVATE_STANDALONE=false
`;

try {
  const envPath = path.join(frontendPath, '.env.local');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created safe .env.local');
} catch (error) {
  console.log('❌ Failed to create .env.local:', error.message);
}

console.log('\n🎉 Next.js Fix Complete!');
console.log('========================');
console.log('Now you can safely start the application with:');
console.log('');
console.log('Option 1 (Recommended): node start-safe.js');
console.log('Option 2 (Manual):      cd frontend && npm run dev -- --no-turbo');
console.log('');
console.log('This should resolve the turbopack runtime error! 🚀'); 