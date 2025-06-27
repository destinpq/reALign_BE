const axios = require('axios');

async function testMagicHourToS3Flow() {
  try {
    console.log('🚀 Testing complete Magic Hour → S3 flow...');
    
    // Step 1: Simulate Magic Hour webhook with a real image
    const webhookPayload = {
      type: "image.completed",
      payload: {
        id: "test-job-" + Date.now(),
        status: "complete",
        downloads: [
          {
            url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
          }
        ]
      }
    };
    
    console.log('📤 Sending webhook to production:', JSON.stringify(webhookPayload, null, 2));
    
    const response = await axios.post(
      'https://realign-api.destinpq.com/api/v1/magic-hour/webhook',
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Webhook Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      console.log('\n🎯 SUCCESS! Here is your S3 PROOF:');
      console.log('📁 S3 URL:', response.data.data.s3Url);
      console.log('🔗 HTTPS URL:', response.data.data.httpsUrl);
      console.log('📄 File Name:', response.data.data.fileName);
      console.log('🗂️  S3 Key:', response.data.data.s3Key);
      console.log('🆔 Job ID:', response.data.data.jobId);
      console.log('✅ Status:', response.data.data.status);
      
      return response.data.data.s3Url;
    } else {
      console.log('❌ No S3 data in response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMagicHourToS3Flow(); 