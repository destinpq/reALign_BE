const axios = require('axios');

async function testLogin() {
  const API_URL = 'http://localhost:8080/api/v1'; // Based on your logs
  
  console.log('🧪 Testing login functionality...');
  console.log('🧪 API URL:', API_URL);
  
  // Test credentials - using the same as in create-test-user.js
  const testCredentials = {
    email: 'testuser@realign.com',
    password: 'TestPassword123!'
  };
  
  try {
    console.log('🧪 Attempting login with credentials:', {
      email: testCredentials.email,
      password: '***' // Hidden for security
    });
    
    // First try the debug endpoint
    const debugResponse = await axios.post(`${API_URL}/auth/debug-login`, testCredentials, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Debug login response:', debugResponse.data);
    
    // Now try the regular login endpoint
    const loginResponse = await axios.post(`${API_URL}/auth/login`, testCredentials, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Regular login response:', {
      hasAccessToken: !!loginResponse.data.accessToken,
      hasRefreshToken: !!loginResponse.data.refreshToken,
      hasUser: !!loginResponse.data.user,
      userEmail: loginResponse.data.user?.email
    });
    
  } catch (error) {
    console.error('❌ Login test failed:');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
    } else if (error.request) {
      console.error('❌ No response received');
      console.error('❌ Request details:', error.request);
    }
  }
}

// Also test if the server is reachable
async function testServerHealth() {
  const API_URL = 'http://localhost:8080/api/v1';
  
  try {
    console.log('🩺 Testing server health...');
    const healthResponse = await axios.get(`${API_URL}/health`, {
      timeout: 5000
    });
    console.log('✅ Server is healthy:', healthResponse.data);
    return true;
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting login diagnostics...\n');
  
  // First check if server is up
  const serverUp = await testServerHealth();
  
  if (serverUp) {
    console.log('\n');
    await testLogin();
  }
  
  console.log('\n🏁 Diagnostics complete');
  console.log('\n📝 INSTRUCTIONS:');
  console.log('1. Replace the email/password in testCredentials with actual values');
  console.log('2. Make sure your backend is running on port 8080');
  console.log('3. Check the backend logs for detailed error information');
}

main(); 