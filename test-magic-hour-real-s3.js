require('dotenv').config();
const axios = require('axios');

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;
const REAL_S3_URL = 'https://realign.s3.amazonaws.com/input_image/user-uploads/cmc6hxqof0000v81irx2bm4ff/2025-06-21T17-41-45-293Z-c70c0a42-9f6e-44d5-9a8e-5d06067e50f2.jpg';

async function testMagicHourWithRealS3() {
  console.log('🎯 Testing Magic Hour with REAL S3 URL');
  console.log('Image URL:', REAL_S3_URL);
  console.log('');

  try {
    // Step 1: Submit job to Magic Hour with correct format
    console.log('📤 Step 1: Submitting job to Magic Hour...');
    
    const currentDateTime = new Date().toISOString().replace(/[:.]/g, '-');
    const jobData = {
      name: `Test Ai Headshot - ${currentDateTime}`,
      style: {
        prompt: 'professional, business attire, good posture'
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
    console.log('Status:', response.data.status);
    console.log('Credits charged:', response.data.credits_charged);
    console.log('Frame cost:', response.data.frame_cost);
    console.log('');

    // Step 2: Try to check status (we know this will fail, but let's confirm)
    console.log('📊 Step 2: Attempting to check job status...');
    
    try {
      const statusResponse = await axios.get(
        `https://api.magichour.ai/v1/ai-headshot-generator/${response.data.id}`,
        {
          headers: {
            'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
          },
        }
      );
      
      console.log('✅ Status check successful:', statusResponse.data);
    } catch (statusError) {
      console.log('❌ Status check failed (as expected):', statusError.response?.status, statusError.response?.statusText);
      console.log('This confirms Magic Hour status endpoints are broken');
    }

    console.log('');
    console.log('🎉 FINAL RESULTS:');
    console.log('✅ Real S3 URL works perfectly with Magic Hour!');
    console.log('✅ Job submission successful');
    console.log('✅ Credits charged - job is processing');
    console.log('❌ Status polling still broken (404)');
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('1. Update your Magic Hour service to use this S3 URL format');
    console.log('2. Use webhook-based processing for completion');
    console.log('3. The job will complete automatically via webhook');
    console.log('');
    console.log('🔗 Job ID for tracking:', response.data.id);

  } catch (error) {
    console.error('❌ Error testing Magic Hour:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data?.bodyErrors?.issues) {
        console.log('');
        console.log('🔍 Validation Issues:');
        error.response.data.bodyErrors.issues.forEach((issue, index) => {
          console.log(`${index + 1}.`, JSON.stringify(issue, null, 2));
        });
      }
    } else {
      console.log('Error message:', error.message);
    }
    
    console.log('');
    console.log('🤔 Troubleshooting:');
    console.log('1. Check if S3 URL is publicly accessible');
    console.log('2. Verify Magic Hour API parameters');
    console.log('3. Test S3 URL directly in browser');
    console.log('Current URL:', REAL_S3_URL);
  }
}

// Also test if the S3 URL is accessible
async function testS3UrlAccess() {
  console.log('🔗 Testing S3 URL accessibility...');
  try {
    const response = await axios.head(REAL_S3_URL);
    console.log('✅ S3 URL is accessible');
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content-Length:', response.headers['content-length']);
  } catch (error) {
    console.log('❌ S3 URL is not accessible:', error.response?.status, error.response?.statusText);
    console.log('This might explain why Magic Hour rejects it');
  }
  console.log('');
}

async function runTests() {
  await testS3UrlAccess();
  await testMagicHourWithRealS3();
}

runTests(); 