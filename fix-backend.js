const fs = require('fs');

// Read the backend file
let content = fs.readFileSync('test-backend.js', 'utf8');

// Remove duplicate bankStatements declaration (keep first one)
const bankStatementsRegex = /\/\/ ===== BANK STATEMENTS ENDPOINTS =====\s*\n\s*\/\/ Mock bank statements data\s*\nlet bankStatements = \[[\s\S]*?\];/g;
const bankStatementsMatches = content.match(bankStatementsRegex);
if (bankStatementsMatches && bankStatementsMatches.length > 1) {
  // Remove the second occurrence
  content = content.replace(bankStatementsMatches[1], '// ===== BANK STATEMENTS ENDPOINTS =====\n\n// Bank statements data already declared above');
}

// Remove duplicate userProfile declaration (keep first one)
const userProfileRegex = /\/\/ ===== PROFILE ENDPOINTS =====\s*\n\s*\/\/ Mock profile data\s*\nlet userProfile = \{[\s\S]*?\};/g;
const userProfileMatches = content.match(userProfileRegex);
if (userProfileMatches && userProfileMatches.length > 1) {
  // Remove the second occurrence
  content = content.replace(userProfileMatches[1], '// ===== PROFILE ENDPOINTS =====\n\n// Profile data already declared above');
}

// Write the fixed content back
fs.writeFileSync('test-backend.js', content);
console.log('Backend file fixed - duplicates removed'); 