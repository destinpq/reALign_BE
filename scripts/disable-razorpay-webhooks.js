const Razorpay = require('razorpay');
require('dotenv').config();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function listWebhooks() {
  console.log('🔍 LISTING ALL RAZORPAY WEBHOOKS...\n');
  
  try {
    // Note: Razorpay doesn't provide a direct API to list webhooks
    // This is more of a diagnostic tool
    console.log('⚠️  Razorpay does not provide an API to list webhooks.');
    console.log('📋 You need to check the Razorpay Dashboard manually:');
    console.log('');
    console.log('1. Go to: https://dashboard.razorpay.com/app/webhooks');
    console.log('2. Look for any webhook URLs that might be causing issues');
    console.log('3. Check if any webhook is configured to trigger refunds');
    console.log('');
    console.log('🚨 COMMON PROBLEMATIC WEBHOOK PATTERNS:');
    console.log('- Webhooks pointing to external services');
    console.log('- Webhooks with "refund" in the URL');
    console.log('- Webhooks configured for payment.captured events');
    console.log('- Webhooks with incorrect response handling');
    console.log('');
    
    // Check if we can access recent events (indirect way to see webhook activity)
    console.log('🔗 Checking recent payment events...');
    
    const orders = await razorpay.orders.all({ count: 3 });
    
    for (const order of orders.items) {
      console.log(`📋 Order: ${order.id}`);
      console.log(`  Amount: ₹${order.amount / 100}`);
      console.log(`  Status: ${order.status}`);
      
      try {
        const payments = await razorpay.orders.fetchPayments(order.id);
        for (const payment of payments.items) {
          console.log(`  Payment: ${payment.id} - ${payment.status}`);
          if (payment.amount_refunded > 0) {
            console.log(`    🚨 REFUNDED: ₹${payment.amount_refunded / 100}`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Could not fetch payments`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Failed to check webhooks:', error.message);
  }
}

async function emergencyInstructions() {
  console.log('\n🚨 EMERGENCY INSTRUCTIONS TO STOP REFUNDS:\n');
  
  console.log('1. 🌐 IMMEDIATE: Go to Razorpay Dashboard');
  console.log('   URL: https://dashboard.razorpay.com/app/webhooks');
  console.log('');
  
  console.log('2. 🔍 FIND PROBLEMATIC WEBHOOKS:');
  console.log('   - Look for any webhook URLs');
  console.log('   - Check if any are failing or returning wrong responses');
  console.log('   - Disable any suspicious webhooks temporarily');
  console.log('');
  
  console.log('3. 📞 CONTACT RAZORPAY SUPPORT:');
  console.log('   - Phone: +91 76788 81800');
  console.log('   - Email: support@razorpay.com');
  console.log('   - Mention: "Emergency - All payments being auto-refunded"');
  console.log('');
  
  console.log('4. 🛠️  TEMPORARY WORKAROUND:');
  console.log('   - Disable all webhooks in dashboard');
  console.log('   - Test a small payment');
  console.log('   - If it works, gradually re-enable webhooks');
  console.log('');
  
  console.log('5. 🔧 CHECK PAYMENT SETTINGS:');
  console.log('   - Go to Settings → Payment Methods');
  console.log('   - Look for any auto-refund rules');
  console.log('   - Check Risk & Compliance settings');
  console.log('');
  
  console.log('6. 📊 MONITOR:');
  console.log('   - Use the investigation script: node scripts/fix-razorpay-refunds.js');
  console.log('   - Check backend logs after deploying webhook handler');
}

async function main() {
  console.log('🚨 RAZORPAY WEBHOOK EMERGENCY TOOL\n');
  
  await listWebhooks();
  await emergencyInstructions();
  
  console.log('\n✅ Emergency instructions provided!');
  console.log('🚨 ACT FAST - Every minute costs money in refunds!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { listWebhooks, emergencyInstructions }; 