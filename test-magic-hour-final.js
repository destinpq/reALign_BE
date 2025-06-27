const fetch = require('node-fetch');
require('dotenv').config();

async function finalMagicHourTest() {
  const apiKey = process.env.MAGIC_HOUR_API_KEY;
  
  if (!apiKey) {
    console.error('❌ MAGIC_HOUR_API_KEY not found in environment');
    return;
  }
  
  console.log('🔑 Using API key:', apiKey.substring(0, 15) + '...');
  
  // Test with some older job IDs from previous tests
  const testJobIds = [
    'cmce8atz512xhzk0zymust50r',
    'cmce85seq0gps2u0z1wkvsj0k',
    'cmce7s4lx12swzk0zzdcn3xtn'
  ];
  
  console.log('🔍 Testing both endpoints with multiple job IDs...\n');
  
  for (const jobId of testJobIds) {
    console.log(`\n📊 Testing Job ID: ${jobId}`);
    console.log('=' + '='.repeat(50));
    
    // Test both endpoints
    const endpoints = [
      { name: 'OLD (ai-headshot-generator)', url: `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}` },
      { name: 'NEW (images)', url: `https://api.magichour.ai/v1/images/${jobId}` }
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n🔗 Testing ${endpoint.name}:`);
      console.log(`   URL: ${endpoint.url}`);
      
      try {
        const response = await fetch(endpoint.url, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        
        console.log(`   📡 Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('   🎉 SUCCESS! Response:');
          console.log('   ' + JSON.stringify(data, null, 2).split('\n').join('\n   '));
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Error: ${errorText}`);
        }
      } catch (error) {
        console.log(`   💥 Network Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🎯 FINAL TEST RESULTS:');
  console.log('If BOTH endpoints return 404 for ALL job IDs,');
  console.log('then the issue is NOT the endpoint URL but something else:');
  console.log('1. Jobs may take longer to be available via API');
  console.log('2. Magic Hour API might have changed their structure');
  console.log('3. There might be a different endpoint we need to use');
  console.log('='.repeat(70));
}

finalMagicHourTest(); 