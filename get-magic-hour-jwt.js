const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

async function getMagicHourJWT() {
  console.log('🔐 Getting Magic Hour JWT token...');
  
  // First, try to get the login page to see what we need
  try {
    const loginPageResponse = await axios.get('https://magichour.ai/sign-in', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ Got login page');
    
    // Try different login endpoints
    const loginEndpoints = [
      'https://magichour.ai/api/auth/signin',
      'https://magichour.ai/api/auth/login', 
      'https://api.magichour.ai/auth/login',
      'https://api.magichour.ai/v1/auth/login',
      'https://magichour.ai/auth/login'
    ];
    
    // You'll need Magic Hour credentials - add them to .env
    const credentials = {
      email: process.env.MAGIC_HOUR_EMAIL,
      password: process.env.MAGIC_HOUR_PASSWORD
    };
    
    if (!credentials.email || !credentials.password) {
      console.log('❌ Please add MAGIC_HOUR_EMAIL and MAGIC_HOUR_PASSWORD to your .env file');
      return null;
    }
    
    for (const endpoint of loginEndpoints) {
      try {
        console.log(`\n🔄 Trying login at: ${endpoint}`);
        
        const loginResponse = await axios.post(endpoint, credentials, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });
        
        console.log(`✅ Login successful: ${loginResponse.status}`);
        console.log('Response headers:', Object.keys(loginResponse.headers));
        
        // Look for JWT in response
        const jwt = loginResponse.data?.token || 
                   loginResponse.data?.access_token || 
                   loginResponse.data?.jwt ||
                   loginResponse.headers['authorization']?.replace('Bearer ', '') ||
                   loginResponse.headers['x-auth-token'];
        
        if (jwt) {
          console.log(`🎯 Found JWT token: ${jwt.substring(0, 50)}...`);
          return jwt;
        }
        
        // Check cookies
        const cookies = loginResponse.headers['set-cookie'];
        if (cookies) {
          console.log('🍪 Cookies found:', cookies);
          const tokenCookie = cookies.find(cookie => 
            cookie.includes('token=') || 
            cookie.includes('jwt=') || 
            cookie.includes('auth=')
          );
          if (tokenCookie) {
            const token = tokenCookie.match(/(?:token|jwt|auth)=([^;]+)/)?.[1];
            if (token) {
              console.log(`🎯 Found token in cookie: ${token.substring(0, 50)}...`);
              return token;
            }
          }
        }
        
        console.log('Response data keys:', Object.keys(loginResponse.data || {}));
        
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${error.response.status}: ${error.response.statusText}`);
          if (error.response.data) {
            console.log('Error details:', error.response.data);
          }
        } else {
          console.log(`❌ Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n❌ Could not find JWT token in any login response');
    return null;
    
  } catch (error) {
    console.log('❌ Error getting login page:', error.message);
    return null;
  }
}

// Run the script
getMagicHourJWT()
  .then(jwt => {
    if (jwt) {
      console.log(`\n🎉 SUCCESS! JWT Token: ${jwt}`);
      console.log('\nAdd this to your .env file:');
      console.log(`MAGIC_HOUR_JWT=${jwt}`);
    } else {
      console.log('\n❌ Failed to get JWT token');
    }
  })
  .catch(console.error); 