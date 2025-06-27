const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;

async function getJWTFromAPIKey() {
  console.log('🔑 Converting Magic Hour API key to JWT token...');
  
  if (!MAGIC_HOUR_API_KEY) {
    console.log('❌ MAGIC_HOUR_API_KEY not found in .env');
    return null;
  }
  
  console.log(`Using API Key: ${MAGIC_HOUR_API_KEY.substring(0, 20)}...`);
  
  // Try different auth endpoints to exchange API key for JWT
  const authEndpoints = [
    'https://api.magichour.ai/v1/auth/token',
    'https://api.magichour.ai/auth/token',
    'https://api.magichour.ai/v1/auth/exchange',
    'https://api.magichour.ai/auth/exchange',
    'https://magichour.ai/api/auth/token',
    'https://magichour.ai/api/v1/auth/token',
    'https://api.magichour.ai/v1/token',
    'https://api.magichour.ai/token'
  ];
  
  const headers = {
    'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  };
  
  for (const endpoint of authEndpoints) {
    try {
      console.log(`\n🔄 Testing: ${endpoint}`);
      
      // Try GET first
      const getResponse = await axios.get(endpoint, { headers });
      
      console.log(`✅ GET Success: ${getResponse.status}`);
      console.log('Response data:', getResponse.data);
      
      // Look for JWT in response
      const jwt = getResponse.data?.token || 
                 getResponse.data?.access_token || 
                 getResponse.data?.jwt ||
                 getResponse.data?.authToken;
      
      if (jwt) {
        console.log(`🎯 Found JWT: ${jwt.substring(0, 50)}...`);
        return jwt;
      }
      
    } catch (getError) {
      // Try POST if GET fails
      try {
        const postResponse = await axios.post(endpoint, {}, { headers });
        
        console.log(`✅ POST Success: ${postResponse.status}`);
        console.log('Response data:', postResponse.data);
        
        const jwt = postResponse.data?.token || 
                   postResponse.data?.access_token || 
                   postResponse.data?.jwt ||
                   postResponse.data?.authToken;
        
        if (jwt) {
          console.log(`🎯 Found JWT: ${jwt.substring(0, 50)}...`);
          return jwt;
        }
        
      } catch (postError) {
        if (getError.response) {
          console.log(`❌ GET ${getError.response.status}: ${getError.response.statusText}`);
        }
        if (postError.response) {
          console.log(`❌ POST ${postError.response.status}: ${postError.response.statusText}`);
        }
      }
    }
  }
  
  // If no dedicated auth endpoint works, the API key itself might work as JWT
  console.log('\n🔄 Testing if API key can be used directly as JWT...');
  
  try {
    const testResponse = await axios.get('https://api.magichour.ai/v1/user', {
      headers: {
        'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API key works directly as JWT!');
    return MAGIC_HOUR_API_KEY;
    
  } catch (error) {
    console.log('❌ API key cannot be used directly as JWT');
  }
  
  console.log('\n❌ Could not get JWT token from API key');
  return null;
}

// Run the script
getJWTFromAPIKey()
  .then(jwt => {
    if (jwt) {
      console.log(`\n🎉 SUCCESS! JWT Token: ${jwt}`);
      console.log('\nNow testing image download with this JWT...');
      return testImageDownload(jwt);
    } else {
      console.log('\n❌ Failed to get JWT token');
    }
  })
  .catch(console.error);

async function testImageDownload(jwt) {
  const JOB_ID = 'cmce9sr6w13fgzk0z185b5qxb';
  
  const imageEndpoints = [
    `https://magichour.ai/api/image/${JOB_ID}`,
    `https://magichour.ai/api/v1/image/${JOB_ID}`,
    `https://api.magichour.ai/v1/image/${JOB_ID}`,
    `https://api.magichour.ai/image/${JOB_ID}`,
    `https://api.magichour.ai/v1/download/${JOB_ID}`,
    `https://magichour.ai/api/download/${JOB_ID}`
  ];
  
  for (const endpoint of imageEndpoints) {
    try {
      console.log(`\n🔄 Testing image download: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Accept': 'image/*,*/*'
        },
        responseType: 'arraybuffer',
        timeout: 10000
      });
      
      console.log(`✅ SUCCESS: ${response.status}`);
      console.log(`Content-Type: ${response.headers['content-type']}`);
      console.log(`Content-Length: ${response.headers['content-length']}`);
      
      if (response.headers['content-type']?.includes('image')) {
        const fs = require('fs');
        fs.writeFileSync('magic_hour_success.jpg', response.data);
        console.log('🎯 IMAGE DOWNLOADED SUCCESSFULLY: magic_hour_success.jpg');
        return true;
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${error.response.status}: ${error.response.statusText}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  return false;
} 