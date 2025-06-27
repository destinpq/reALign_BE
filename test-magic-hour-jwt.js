const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// You need to replace this with a valid JWT token from Magic Hour dashboard
const MAGIC_HOUR_JWT = process.env.MAGIC_HOUR_JWT || 'REPLACE_WITH_VALID_JWT';
const JOB_ID = 'cmce9sr6w13fgzk0z185b5qxb';

async function testMagicHourJWTAccess() {
  console.log('🔍 Testing Magic Hour JWT Image Access');
  
  const endpoints = [
    `https://magichour.ai/api/image/${JOB_ID}`,
    `https://magichour.ai/api/v1/image/${JOB_ID}`,
    `https://magichour.ai/api/images/${JOB_ID}`,
    `https://magichour.ai/api/v1/images/${JOB_ID}`,
    `https://magichour.ai/api/download/${JOB_ID}`,
    `https://magichour.ai/api/v1/download/${JOB_ID}`,
    `https://api.magichour.ai/image/${JOB_ID}`,
    `https://api.magichour.ai/images/${JOB_ID}`,
    `https://api.magichour.ai/download/${JOB_ID}`,
  ];

  const headers = {
    'authority': 'magichour.ai',
    'authorization': `Bearer ${MAGIC_HOUR_JWT}`,
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'accept': 'image/*,*/*',
  };

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔄 Testing: ${endpoint}`);
      
      const response = await axios.get(endpoint, { 
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      console.log(`✅ SUCCESS: Status ${response.status}`);
      console.log(`Content-Type: ${response.headers['content-type']}`);
      console.log(`Content-Length: ${response.headers['content-length']}`);
      
      // Check if it's an image
      if (response.headers['content-type']?.includes('image')) {
        const filename = `magic_hour_${JOB_ID}.jpg`;
        fs.writeFileSync(filename, response.data);
        console.log(`🎯 IMAGE DOWNLOADED: ${filename}`);
        console.log(`File size: ${fs.statSync(filename).size} bytes`);
        return filename;
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${error.response.status}: ${error.response.statusText}`);
        if (error.response.status === 401) {
          console.log('🔑 Authentication failed - JWT token may be invalid');
        }
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n⚠️  No working endpoint found. Make sure to set MAGIC_HOUR_JWT in .env file');
  return null;
}

// Run the test
testMagicHourJWTAccess()
  .then(result => {
    if (result) {
      console.log(`\n🎉 SUCCESS! Image saved as: ${result}`);
    } else {
      console.log('\n❌ Failed to retrieve image');
    }
  })
  .catch(console.error); 