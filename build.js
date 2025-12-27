const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Read the background.js file
const backgroundPath = path.join(__dirname, 'background.js');
let backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

// Get backend URL from .env file (required)
const backendUrl = process.env.BACKEND_URL;

if (!backendUrl) {
  console.error('❌ Error: BACKEND_URL must be set in .env file');
  console.error('   Please add: BACKEND_URL=your_backend_url to your .env file');
  process.exit(1);
}

// Replace the placeholder with the backend URL from .env
backgroundContent = backgroundContent.replace(
  /REPLACE_WITH_BACKEND_URL/g,
  backendUrl
);

// Write the updated file
fs.writeFileSync(backgroundPath, backgroundContent);

console.log('✅ Extension built with environment variables');
console.log(`🔗 Backend URL: ${backendUrl}`);
