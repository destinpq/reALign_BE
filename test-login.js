const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testing login functionality...');
    
    const response = await axios.post('http://localhost:1001/api/v1/auth/login', {
      email: 'admin@realign.com',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Login failed:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('Error:', error.message);
  }
}

async function testPublicStats() {
  try {
    console.log('📊 Testing public stats endpoint...');
    
    const response = await axios.get('http://localhost:1001/api/v1/admin/stats/public');
    
    console.log('✅ Public stats successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Public stats failed:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('Error:', error.message);
  }
}

// Run tests
testLogin();
testPublicStats(); 