require('dotenv').config();

console.log('🔍 Environment Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REPLICATE_API_TOKEN:', process.env.REPLICATE_API_TOKEN ? 'SET' : 'NOT SET');
console.log('Token length:', process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.length : 0);
console.log('Token preview:', process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.substring(0, 10) + '...' : 'N/A');

// Use built-in fetch in Node.js 18+
const fetch = globalThis.fetch;

async function testReplicateAPI() {
  try {
    console.log('\n🧪 Testing Replicate API...');
    
    const response = await fetch('https://api.replicate.com/v1/account', {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      }
    });

    console.log('📊 Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Test Success:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ API Test Failed:', errorText);
    }

    // Test image analysis endpoint
    console.log('\n🔍 Testing Image Analysis...');
    
    const analysisResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "72044dfaaa18e83ebee21d2161efe40f59303b5a087b8680aca809e5e53481d8",
        input: {
          image: "https://realign-api.destinpq.com/uploads/a464dc60-a66d-482e-890c-d39cccce7312.jpg",
          query: "What is in this image?"
        }
      })
    });

    console.log('📊 Analysis Response Status:', analysisResponse.status);
    
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      console.log('✅ Analysis Started:', analysisData);
    } else {
      const analysisError = await analysisResponse.text();
      console.log('❌ Analysis Failed:', analysisError);
    }

  } catch (error) {
    console.error('🚨 Test Error:', error.message);
  }
}

testReplicateAPI(); 