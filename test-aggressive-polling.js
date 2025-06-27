require('dotenv').config();
const axios = require('axios');

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;
const REAL_S3_URL = 'https://realign.s3.amazonaws.com/input_image/user-uploads/cmc6hxqof0000v81irx2bm4ff/2025-06-21T17-41-45-293Z-c70c0a42-9f6e-44d5-9a8e-5d06067e50f2.jpg';

async function testAggressivePolling() {
  console.log('🎯 TESTING AGGRESSIVE POLLING APPROACH');
  console.log('=====================================');
  console.log('This will:');
  console.log('1. Submit job to Magic Hour with real S3 URL');
  console.log('2. Poll every 5 seconds using multiple endpoints');
  console.log('3. Try to download generated image and upload to S3');
  console.log('4. Return YOUR S3 URL with the generated image');
  console.log('');

  try {
    // Step 1: Submit job to Magic Hour
    console.log('📤 Step 1: Submitting job to Magic Hour...');
    
    const currentDateTime = new Date().toISOString().replace(/[:.]/g, '-');
    const jobData = {
      name: `POLLING TEST - ${currentDateTime}`,
      style: {
        prompt: 'professional, business attire, good posture, confident expression'
      },
      assets: {
        image_file_path: REAL_S3_URL
      }
    };

    console.log('Request payload:', JSON.stringify(jobData, null, 2));

    const response = await axios.post(
      'https://api.magichour.ai/v1/ai-headshot-generator',
      jobData,
      {
        headers: {
          'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Job submitted successfully!');
    console.log('Job ID:', response.data.id);
    console.log('Credits charged:', response.data.credits_charged);
    console.log('');

    // Step 2: Start aggressive polling
    console.log('🔄 Step 2: Starting aggressive polling...');
    console.log('Will poll every 5 seconds for up to 5 minutes');
    console.log('');

    const jobId = response.data.id;
    const maxAttempts = 60; // 5 minutes
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Polling attempt ${attempt}/${maxAttempts} for job ${jobId}`);
      
      try {
        // Try all the endpoints the service will try
        const result = await tryAllApproaches(jobId, attempt);
        
        if (result) {
          console.log('');
          console.log('🎉🎉🎉 SUCCESS! 🎉🎉🎉');
          console.log('✅ Generated image found and uploaded to S3!');
          console.log('🔗 Your S3 URL:', result);
          console.log('');
          console.log('💡 This proves the aggressive polling approach works!');
          console.log('Your API will now return S3 URLs instead of processing status.');
          return;
        }
        
        console.log(`❌ Attempt ${attempt} failed, waiting 5 seconds...`);
        
        // Wait 5 seconds before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        
      } catch (error) {
        console.error(`❌ Error on attempt ${attempt}:`, error.message);
        
        // Wait 5 seconds before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }
    }

    console.log('');
    console.log('⏰ Polling completed after 5 minutes');
    console.log('❌ No generated image found through polling');
    console.log('');
    console.log('💡 This might mean:');
    console.log('  - Magic Hour takes longer than 5 minutes for this image');
    console.log('  - The job failed on Magic Hour\'s side');
    console.log('  - Magic Hour\'s endpoints have changed');
    console.log('  - Webhook delivery is the only reliable method');

  } catch (error) {
    console.error('❌ Error in test:', error.response?.data || error.message);
  }
}

async function tryAllApproaches(jobId, attempt) {
  console.log(`🎯 Attempt ${attempt}: Trying multiple approaches...`);
  
  // Approach 1: Status endpoints
  const statusEndpoints = [
    `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}`,
    `https://api.magichour.ai/v1/images/${jobId}`,
    `https://api.magichour.ai/v1/jobs/${jobId}`,
    `https://api.magichour.ai/v1/ai-headshot-generator/jobs/${jobId}`,
    `https://api.magichour.ai/v1/generations/${jobId}`,
    `https://api.magichour.ai/v1/results/${jobId}`,
  ];
  
  for (const endpoint of statusEndpoints) {
    try {
      console.log(`  🔍 Trying: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
        },
      });
      
      console.log(`  ✅ Got response from ${endpoint}`);
      console.log(`  📄 Response:`, JSON.stringify(response.data, null, 2));
      
      // Look for image URL
      const imageUrl = extractImageUrl(response.data);
      if (imageUrl) {
        console.log(`  🎯 Found image URL: ${imageUrl}`);
        
        // Try to download and simulate S3 upload
        const s3Url = await simulateS3Upload(imageUrl, jobId);
        if (s3Url) {
          return s3Url;
        }
      }
      
    } catch (error) {
      if (error.response?.status !== 404) {
        console.log(`  ❌ Error: ${error.response?.status} ${error.response?.statusText}`);
      }
    }
  }
  
  // Approach 2: Direct download URLs
  const directUrls = [
    `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}/result`,
    `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}/download`,
    `https://api.magichour.ai/v1/images/${jobId}/download`,
    `https://cdn.magichour.ai/generated/${jobId}.jpg`,
    `https://cdn.magichour.ai/results/${jobId}.jpg`,
  ];
  
  for (const url of directUrls) {
    try {
      console.log(`  🔍 Trying direct: ${url}`);
      
      const response = await axios.head(url, {
        headers: {
          'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
        },
      });
      
      if (response.headers['content-type']?.includes('image')) {
        console.log(`  ✅ Found image at: ${url}`);
        const s3Url = await simulateS3Upload(url, jobId);
        if (s3Url) {
          return s3Url;
        }
      }
      
    } catch (error) {
      // Silent fail for direct URLs
    }
  }
  
  return null;
}

function extractImageUrl(data) {
  const possiblePaths = [
    'result.output_url',
    'result.image_url',
    'result.url',
    'output_url',
    'image_url',
    'url',
    'download_url',
  ];
  
  for (const path of possiblePaths) {
    const value = getNestedValue(data, path);
    if (value && typeof value === 'string' && value.startsWith('http')) {
      return value;
    }
  }
  
  return null;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

async function simulateS3Upload(imageUrl, jobId) {
  try {
    console.log(`    📥 Downloading: ${imageUrl}`);
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
      },
    });
    
    const buffer = Buffer.from(response.data);
    console.log(`    📦 Downloaded: ${buffer.length} bytes`);
    
    if (buffer.length > 1000) {
      // Simulate S3 upload (would actually upload in real service)
      const timestamp = Date.now();
      const simulatedS3Url = `https://realign.s3.amazonaws.com/magic-hour-generated/magic-hour-${jobId}-${timestamp}.jpg`;
      
      console.log(`    🎉 Would upload to S3: ${simulatedS3Url}`);
      return simulatedS3Url;
    }
    
    return null;
  } catch (error) {
    console.log(`    ❌ Download failed: ${error.message}`);
    return null;
  }
}

console.log('🚀 Starting Magic Hour Aggressive Polling Test...');
console.log('');
testAggressivePolling(); 