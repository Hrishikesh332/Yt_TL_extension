const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Read the background.js file
const backgroundPath = path.join(__dirname, 'background.js');
let backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

// Replace placeholder values with environment variables
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

if (!backendUrl) {
  console.error('❌ Error: BACKEND_URL must be set in .env file');
  process.exit(1);
}

// Replace the placeholder value
backgroundContent = backgroundContent.replace(
  /backendUrl: 'REPLACE_WITH_BACKEND_URL'/,
  `backendUrl: '${backendUrl}'`
);

// Write the updated file
fs.writeFileSync(backgroundPath, backgroundContent);

console.log('✅ Extension built with environment variables');
console.log(`🔗 Backend URL: ${backendUrl}`);
