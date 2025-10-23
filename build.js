const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Read the background.js file
const backgroundPath = path.join(__dirname, 'background.js');
let backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

// Replace placeholder values with environment variables
const apiKey = process.env.API_KEY || '';
const indexId = process.env.INDEX_ID || '';

if (!apiKey || !indexId) {
  console.error('❌ Error: API_KEY and INDEX_ID must be set in .env file');
  process.exit(1);
}

// Replace the placeholder values
backgroundContent = backgroundContent.replace(
  /apiKey: 'REPLACE_WITH_API_KEY'/,
  `apiKey: '${apiKey}'`
);

backgroundContent = backgroundContent.replace(
  /indexId: 'REPLACE_WITH_INDEX_ID'/,
  `indexId: '${indexId}'`
);

// Write the updated file
fs.writeFileSync(backgroundPath, backgroundContent);

console.log('✅ Extension built with environment variables');
console.log('🔒 API credentials injected securely');
