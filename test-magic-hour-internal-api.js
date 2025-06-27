require('dotenv').config();
const axios = require('axios');

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;
const JOB_ID = 'cmce9sr6w13fgzk0z185b5qxb'; // The job ID from our test

async function testMagicHourInternalAPI() {
  console.log('🔍 TESTING MAGIC HOUR INTERNAL API ENDPOINTS');
  console.log('==============================================');
  console.log('Trying to find the actual download endpoints that the dashboard uses...');
  console.log('Job ID:', JOB_ID);
  console.log('');

  // These are the endpoints that the Magic Hour dashboard might be using internally
  const internalEndpoints = [
    // Standard API endpoints
    `https://api.magichour.ai/v1/ai-headshot-generator/${JOB_ID}`,
    `https://api.magichour.ai/v1/images/${JOB_ID}`,
    `https://api.magichour.ai/v1/jobs/${JOB_ID}`,
    `https://api.magichour.ai/v1/projects/${JOB_ID}`,
    
    // Download endpoints
    `https://api.magichour.ai/v1/ai-headshot-generator/${JOB_ID}/download`,
    `https://api.magichour.ai/v1/images/${JOB_ID}/download`,
    `https://api.magichour.ai/v1/jobs/${JOB_ID}/download`,
    `https://api.magichour.ai/v1/download/${JOB_ID}`,
    
    // Result endpoints
    `https://api.magichour.ai/v1/ai-headshot-generator/${JOB_ID}/result`,
    `https://api.magichour.ai/v1/images/${JOB_ID}/result`,
    `https://api.magichour.ai/v1/results/${JOB_ID}`,
    
    // Export endpoints
    `https://api.magichour.ai/v1/ai-headshot-generator/${JOB_ID}/export`,
    `https://api.magichour.ai/v1/images/${JOB_ID}/export`,
    `https://api.magichour.ai/v1/export/${JOB_ID}`,
    
    // File endpoints
    `https://api.magichour.ai/v1/files/${JOB_ID}`,
    `https://api.magichour.ai/v1/files/${JOB_ID}/download`,
    
    // Media endpoints
    `https://api.magichour.ai/v1/media/${JOB_ID}`,
    `https://api.magichour.ai/v1/media/${JOB_ID}/download`,
    
    // Assets endpoints
    `https://api.magichour.ai/v1/assets/${JOB_ID}`,
    `https://api.magichour.ai/v1/assets/${JOB_ID}/download`,
    
    // Generation endpoints
    `https://api.magichour.ai/v1/generations/${JOB_ID}`,
    `https://api.magichour.ai/v1/generations/${JOB_ID}/download`,
    
    // Dashboard API endpoints (what the frontend might use)
    `https://api.magichour.ai/dashboard/v1/images/${JOB_ID}`,
    `https://api.magichour.ai/dashboard/v1/projects/${JOB_ID}`,
    `https://api.magichour.ai/dashboard/api/v1/images/${JOB_ID}`,
    
    // Internal API endpoints
    `https://internal.magichour.ai/v1/images/${JOB_ID}`,
    `https://backend.magichour.ai/v1/images/${JOB_ID}`,
    
    // CDN endpoints with auth
    `https://cdn.magichour.ai/api/v1/images/${JOB_ID}`,
    `https://storage.magichour.ai/api/v1/images/${JOB_ID}`,
  ];

  for (const endpoint of internalEndpoints) {
    try {
      console.log(`🔍 Testing: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, image/*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 10000,
      });
      
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
      
      if (response.headers['content-type']?.includes('image')) {
        console.log(`🎉 FOUND IMAGE! Size: ${response.headers['content-length']} bytes`);
        console.log(`🔗 Direct image URL: ${endpoint}`);
        
        // Test if we can download it
        const imageResponse = await axios.get(endpoint, {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
          },
        });
        
        const buffer = Buffer.from(imageResponse.data);
        console.log(`📦 Downloaded image: ${buffer.length} bytes`);
        console.log(`🎯 THIS IS THE ENDPOINT WE NEED!`);
        
        return endpoint;
        
      } else if (response.headers['content-type']?.includes('json')) {
        console.log(`📄 JSON Response:`, JSON.stringify(response.data, null, 2));
        
        // Look for image URLs in the response
        const imageUrl = findImageUrlInResponse(response.data);
        if (imageUrl) {
          console.log(`🎯 Found image URL in response: ${imageUrl}`);
          
          // Try to download from the found URL
          try {
            const imageResponse = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
              headers: {
                'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
              },
            });
            
            const buffer = Buffer.from(imageResponse.data);
            console.log(`📦 Downloaded image from URL: ${buffer.length} bytes`);
            console.log(`🎯 THIS IS THE WORKING PATTERN!`);
            
            return { endpoint, imageUrl };
          } catch (downloadError) {
            console.log(`❌ Failed to download from found URL: ${downloadError.message}`);
          }
        }
      }
      
      console.log('');
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`❌ 404 Not Found`);
      } else if (error.response?.status === 401) {
        console.log(`❌ 401 Unauthorized`);
      } else if (error.response?.status === 403) {
        console.log(`❌ 403 Forbidden`);
      } else {
        console.log(`❌ Error: ${error.response?.status || error.code} ${error.response?.statusText || error.message}`);
      }
    }
  }
  
  console.log('');
  console.log('❌ No working endpoints found through standard API patterns');
  console.log('💡 Let me try some advanced techniques...');
  
  // Try with different HTTP methods
  await tryDifferentMethods(JOB_ID);
}

async function tryDifferentMethods(jobId) {
  console.log('');
  console.log('🔧 TRYING DIFFERENT HTTP METHODS...');
  
  const baseEndpoints = [
    `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}`,
    `https://api.magichour.ai/v1/images/${jobId}`,
  ];
  
  const methods = ['GET', 'POST', 'PUT', 'PATCH'];
  
  for (const endpoint of baseEndpoints) {
    for (const method of methods) {
      try {
        console.log(`🔍 ${method} ${endpoint}`);
        
        const config = {
          method: method,
          url: endpoint,
          headers: {
            'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        };
        
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          config.data = { action: 'download' };
        }
        
        const response = await axios(config);
        
        console.log(`✅ ${method} worked! Status: ${response.status}`);
        console.log(`📄 Response:`, JSON.stringify(response.data, null, 2));
        
        const imageUrl = findImageUrlInResponse(response.data);
        if (imageUrl) {
          console.log(`🎯 Found image URL: ${imageUrl}`);
          return { endpoint, method, imageUrl };
        }
        
      } catch (error) {
        if (error.response?.status !== 404 && error.response?.status !== 405) {
          console.log(`❌ ${method} failed: ${error.response?.status} ${error.response?.statusText}`);
        }
      }
    }
  }
}

function findImageUrlInResponse(data) {
  const possiblePaths = [
    'result.output_url',
    'result.image_url', 
    'result.url',
    'result.download_url',
    'result.file_url',
    'output_url',
    'image_url',
    'url',
    'download_url',
    'file_url',
    'generated_image_url',
    'final_image_url',
    'completed_image_url',
    'result_url',
    'asset_url',
    'media_url',
    'cdn_url',
  ];
  
  for (const path of possiblePaths) {
    const value = getNestedValue(data, path);
    if (value && typeof value === 'string' && (value.startsWith('http') || value.startsWith('//'))) {
      return value.startsWith('//') ? 'https:' + value : value;
    }
  }
  
  // Also check if the entire response is just a URL string
  if (typeof data === 'string' && data.startsWith('http')) {
    return data;
  }
  
  return null;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

console.log('🚀 Starting Magic Hour Internal API Discovery...');
console.log('');
testMagicHourInternalAPI(); 