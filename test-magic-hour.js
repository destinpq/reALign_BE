const fetch = require('node-fetch');
require('dotenv').config();

async function testMagicHourAPI() {
  const apiKey = process.env.MAGIC_HOUR_API_KEY;
  
  if (!apiKey) {
    console.error('❌ MAGIC_HOUR_API_KEY not found in environment');
    return;
  }
  
  console.log('🔑 Using API key:', apiKey.substring(0, 15) + '...');
  
  // Step 1: Submit a job
  const requestBody = {
    name: `Test Headshot - ${new Date().toISOString()}`,
    style: {
      prompt: "professional business headshot, corporate attire, good lighting"
    },
    assets: {
      image_file_path: "https://realign.s3.amazonaws.com/test-image.jpg"
    }
  };
  
  console.log('📤 Submitting job to Magic Hour API...');
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch('https://api.magichour.ai/v1/ai-headshot-generator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Magic Hour API error:', errorText);
      return;
    }

    const jobResult = await response.json();
    console.log('✅ Job submitted successfully!');
    console.log('📊 Full job response:', JSON.stringify(jobResult, null, 2));
    
    if (jobResult.id) {
      console.log('\n🔄 Now testing CORRECT status check endpoint...');
      
      // Step 2: Check job status using the CORRECT endpoint
      const statusUrl = `https://api.magichour.ai/v1/images/${jobResult.id}`;
      console.log('🔍 Checking status at CORRECT endpoint:', statusUrl);
      
      const statusResponse = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      console.log('📡 Status response:', statusResponse.status, statusResponse.statusText);
      
      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        console.log('📊 Full status response:', JSON.stringify(statusResult, null, 2));
        
        // Show what fields are available
        console.log('\n🔍 Available fields in status response:');
        console.log('- status:', statusResult.status);
        console.log('- result:', statusResult.result);
        console.log('- output_url:', statusResult.output_url);
        console.log('- image_url:', statusResult.image_url);
        console.log('- url:', statusResult.url);
        console.log('- file_url:', statusResult.file_url);
        console.log('- download_url:', statusResult.download_url);
        
        if (statusResult.result) {
          console.log('- result.output_url:', statusResult.result.output_url);
          console.log('- result.image_url:', statusResult.result.image_url);
          console.log('- result.url:', statusResult.result.url);
          console.log('- result.file_url:', statusResult.result.file_url);
          console.log('- result.download_url:', statusResult.result.download_url);
        }
        
        // Look for any URL that might be the actual image
        console.log('\n🎯 Searching for actual image URLs...');
        const findUrls = (obj, path = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (typeof value === 'string' && (value.includes('http') || value.includes('s3'))) {
              console.log(`- ${currentPath}: ${value}`);
            } else if (typeof value === 'object' && value !== null) {
              findUrls(value, currentPath);
            }
          }
        };
        findUrls(statusResult);
        
      } else {
        const errorText = await statusResponse.text();
        console.error('❌ Status check failed:', errorText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMagicHourAPI(); 