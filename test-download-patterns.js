require('dotenv').config();
const axios = require('axios');

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;
const JOB_ID = 'cmce9sr6w13fgzk0z185b5qxb'; // From your test

async function testDownloadPatterns() {
  console.log('🔍 TESTING DOWNLOAD URL PATTERNS');
  console.log('================================');
  console.log('Job ID:', JOB_ID);
  console.log('');

  // Based on the dashboard URL pattern, try different download endpoints
  const downloadPatterns = [
    // Direct API endpoints
    `https://api.magichour.ai/v1/images/${JOB_ID}/download`,
    `https://api.magichour.ai/v1/ai-headshot-generator/${JOB_ID}/download`,
    `https://api.magichour.ai/v1/download/${JOB_ID}`,
    `https://api.magichour.ai/v1/exports/${JOB_ID}`,
    `https://api.magichour.ai/v1/results/${JOB_ID}/download`,
    
    // Dashboard-based patterns
    `https://magichour.ai/api/download/${JOB_ID}`,
    `https://magichour.ai/api/images/${JOB_ID}/download`,
    `https://magichour.ai/download/${JOB_ID}`,
    
    // CDN patterns
    `https://cdn.magichour.ai/images/${JOB_ID}.jpg`,
    `https://cdn.magichour.ai/generated/${JOB_ID}.jpg`,
    `https://cdn.magichour.ai/results/${JOB_ID}.jpg`,
    `https://cdn.magichour.ai/outputs/${JOB_ID}.jpg`,
    `https://cdn.magichour.ai/ai-headshot/${JOB_ID}.jpg`,
    
    // Storage patterns
    `https://storage.magichour.ai/images/${JOB_ID}.jpg`,
    `https://storage.magichour.ai/generated/${JOB_ID}.jpg`,
    `https://files.magichour.ai/images/${JOB_ID}.jpg`,
    
    // Alternative formats
    `https://cdn.magichour.ai/images/${JOB_ID}.png`,
    `https://cdn.magichour.ai/generated/${JOB_ID}.png`,
    
    // Dashboard internal API
    `https://magichour.ai/api/v1/images/${JOB_ID}`,
    `https://magichour.ai/api/v1/download/${JOB_ID}`,
    `https://magichour.ai/internal/download/${JOB_ID}`,
  ];

  for (const url of downloadPatterns) {
    try {
      console.log(`🔍 Trying: ${url}`);
      
      const response = await axios.head(url, {
        headers: {
          'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 10000,
      });
      
      console.log(`✅ SUCCESS! Found image at: ${url}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Content-Length: ${response.headers['content-length']}`);
      console.log('');
      
      // Try to download it
      const downloadResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 30000,
      });
      
      const buffer = Buffer.from(downloadResponse.data);
      console.log(`📦 Downloaded ${buffer.length} bytes`);
      console.log(`🎉 THIS IS THE WORKING DOWNLOAD URL PATTERN!`);
      console.log('');
      console.log('💡 Update your service to use this URL pattern:');
      console.log(`   ${url.replace(JOB_ID, '{JOB_ID}')}`);
      
      return url;
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ❌ 404 Not Found`);
      } else if (error.code === 'ENOTFOUND') {
        console.log(`   ❌ DNS lookup failed`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`   ❌ Connection refused`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`   ❌ Timeout`);
      } else {
        console.log(`   ❌ Error: ${error.response?.status || error.code || error.message}`);
      }
    }
  }
  
  console.log('');
  console.log('❌ No working download URL pattern found');
  console.log('');
  console.log('💡 Alternative approaches:');
  console.log('1. Contact Magic Hour support for correct download endpoint');
  console.log('2. Use webhooks (if they work)');
  console.log('3. Screen scrape the dashboard (not recommended)');
  console.log('4. Use a different AI service');
}

testDownloadPatterns(); 