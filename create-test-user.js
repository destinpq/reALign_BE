const axios = require('axios');

async function createTestUser() {
  const API_URL = 'http://localhost:8080/api/v1'; // Based on your logs
  
  console.log('👤 Creating test user...');
  
  const testUser = {
    email: 'testuser@realign.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };
  
  try {
    console.log('👤 Attempting to create user:', {
      email: testUser.email,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      password: '***' // Hidden for security
    });
    
    const response = await axios.post(`${API_URL}/auth/register`, testUser, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ User created successfully:', {
      hasAccessToken: !!response.data.accessToken,
      hasRefreshToken: !!response.data.refreshToken,
      hasUser: !!response.data.user,
      userEmail: response.data.user?.email,
      userId: response.data.user?.id
    });
    
    console.log('\n🎯 Test credentials for login:');
    console.log('📧 Email:', testUser.email);
    console.log('🔑 Password:', testUser.password);
    
  } catch (error) {
    console.error('❌ User creation failed:');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
      
      if (error.response.status === 409) {
        console.log('\n💡 User already exists - you can use these credentials for login testing:');
        console.log('📧 Email:', testUser.email);
        console.log('🔑 Password:', testUser.password);
      }
    } else if (error.request) {
      console.error('❌ No response received');
    }
  }
}

createTestUser(); 