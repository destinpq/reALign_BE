const axios = require('axios');

const MAGIC_HOUR_API_KEY = 'mhk_live_HscgSNfcFRf6kDgLCRiFO3fk8grvORzDihnfe2W8NoZCWc6EhURuRXSSHA9aK9VpMKx7ldljKeVqQ2f5';

async function debugMagicHour() {
  try {
    console.log('🚀 Step 1: Creating Magic Hour job...');
    
    // Step 1: Create job
    const jobResponse = await axios.post('https://api.magichour.ai/v1/ai-headshot-generator', {
      name: `Debug Test - ${new Date().toISOString()}`,
      style: {
        prompt: "professional, business attire, good posture"
      },
      assets: {
        image_file_path: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d.jpg"
      }
    }, {
      headers: {
        'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('✅ Job created successfully!');
    console.log('Job Response:', JSON.stringify(jobResponse.data, null, 2));
    
    const jobId = jobResponse.data?.id;
    if (!jobId) {
      throw new Error('No job ID returned');
    }

    console.log(`\n🔄 Step 2: Polling job ${jobId}...`);
    
    // Step 2: Try different polling endpoints
    const possibleEndpoints = [
      `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}`,
      `https://api.magichour.ai/v1/jobs/${jobId}`,
      `https://api.magichour.ai/v1/ai-headshot-generator/jobs/${jobId}`,
      `https://api.magichour.ai/v1/headshots/${jobId}`,
      `https://api.magichour.ai/v1/status/${jobId}`
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`\n🔍 Trying endpoint: ${endpoint}`);
        const pollResponse = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
          }
        });
        
        console.log(`✅ SUCCESS with ${endpoint}`);
        console.log('Poll Response:', JSON.stringify(pollResponse.data, null, 2));
        
        // If we found a working endpoint, let's poll it a few times
        if (pollResponse.data) {
          console.log('\n⏰ Polling for completion...');
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const statusResponse = await axios.get(endpoint, {
              headers: {
                'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
              }
            });
            
            console.log(`Poll ${i+1}:`, JSON.stringify(statusResponse.data, null, 2));
            
            if (statusResponse.data.status === 'completed') {
              console.log('🎉 Job completed!');
              break;
            }
          }
        }
        
        break; // If we found a working endpoint, stop trying others
        
      } catch (error) {
        console.log(`❌ Failed ${endpoint}: ${error.response?.status} - ${error.response?.statusText}`);
        if (error.response?.data) {
          console.log('Error details:', error.response.data);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

debugMagicHour(); 