const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;
const BASE_URL = 'https://api.magichour.ai';

// Test job ID from previous successful submission
const TEST_JOB_ID = 'cmce9sr6w13fgzk0z185b5qxb';

async function testMagicHourImageRetrieval() {
  console.log('🔍 Testing Magic Hour Image Retrieval');
  console.log(`Job ID: ${TEST_JOB_ID}`);
  
  const headers = {
    'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
    'Content-Type': 'application/json'
  };

  // Test different possible endpoints to get the image
  const endpoints = [
    `/v1/images/${TEST_JOB_ID}`,
    `/v1/jobs/${TEST_JOB_ID}`,
    `/v1/ai-headshot-generator/${TEST_JOB_ID}`,
    `/v1/ai-headshot-generator/${TEST_JOB_ID}/status`,
    `/v1/ai-headshot-generator/${TEST_JOB_ID}/result`,
    `/v1/ai-headshot-generator/${TEST_JOB_ID}/download`,
    `/v1/results/${TEST_JOB_ID}`,
    `/v1/generations/${TEST_JOB_ID}`,
    `/v1/outputs/${TEST_JOB_ID}`,
    `/jobs/${TEST_JOB_ID}`,
    `/images/${TEST_JOB_ID}`,
    `/results/${TEST_JOB_ID}`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔄 Testing: ${BASE_URL}${endpoint}`);
      
      const response = await axios.get(`${BASE_URL}${endpoint}`, { headers });
      
      console.log(`✅ SUCCESS: Status ${response.status}`);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Check if response contains image URL
      const responseStr = JSON.stringify(response.data);
      if (responseStr.includes('http') && (responseStr.includes('.jpg') || responseStr.includes('.png') || responseStr.includes('image'))) {
        console.log('🎯 FOUND POTENTIAL IMAGE URL IN RESPONSE!');
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${error.response.status}: ${error.response.statusText}`);
        if (error.response.data) {
          console.log('Error data:', JSON.stringify(error.response.data, null, 2));
        }
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  // Try with different HTTP methods
  console.log('\n🔄 Testing POST methods...');
  
  const postEndpoints = [
    `/v1/ai-headshot-generator/${TEST_JOB_ID}/export`,
    `/v1/jobs/${TEST_JOB_ID}/export`,
    `/v1/images/${TEST_JOB_ID}/export`,
  ];

  for (const endpoint of postEndpoints) {
    try {
      console.log(`\n🔄 Testing POST: ${BASE_URL}${endpoint}`);
      
      const response = await axios.post(`${BASE_URL}${endpoint}`, {}, { headers });
      
      console.log(`✅ SUCCESS: Status ${response.status}`);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${error.response.status}: ${error.response.statusText}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
}

// Run the test
testMagicHourImageRetrieval().catch(console.error); 