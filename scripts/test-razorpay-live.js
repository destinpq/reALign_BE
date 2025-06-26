const Razorpay = require('razorpay');
require('dotenv').config();

// Initialize Razorpay with live credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function testRazorpayLiveMode() {
  console.log('🚨 TESTING RAZORPAY LIVE MODE CONFIGURATION\n');
  
  // 1. Validate credentials
  console.log('1. 🔑 VALIDATING CREDENTIALS:');
  console.log(`   Key ID: ${process.env.RAZORPAY_KEY_ID}`);
  console.log(`   Key Secret: ${process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'MISSING'}`);
  console.log(`   Webhook Secret: ${process.env.RAZORPAY_WEBHOOK_SECRET ? 'SET' : 'MISSING'}`);
  
  // Check if using live keys
  const isLiveMode = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_');
  console.log(`   Mode: ${isLiveMode ? '🟢 LIVE' : '🟡 TEST'}`);
  
  if (!isLiveMode) {
    console.log('   ⚠️  WARNING: Using test keys, not live keys!');
  }
  
  console.log('');
  
  try {
    // 2. Test API connectivity
    console.log('2. 🌐 TESTING API CONNECTIVITY:');
    const orders = await razorpay.orders.all({ count: 1 });
    console.log('   ✅ API connection successful');
    console.log(`   📊 Total orders found: ${orders.count}`);
    console.log('');
    
    // 3. Test order creation
    console.log('3. 🛒 TESTING ORDER CREATION:');
    const testOrder = await razorpay.orders.create({
      amount: 100, // ₹1 for testing
      currency: 'INR',
      receipt: `test_${Date.now()}`,
      payment_capture: true,
      notes: {
        test: 'live_mode_validation',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('   ✅ Test order created successfully');
    console.log(`   📋 Order ID: ${testOrder.id}`);
    console.log(`   💰 Amount: ₹${testOrder.amount / 100}`);
    console.log(`   📝 Status: ${testOrder.status}`);
    console.log('');
    
    // 4. Check payment methods
    console.log('4. 💳 CHECKING PAYMENT METHODS:');
    const paymentMethods = await razorpay.methods.all();
    console.log('   Available payment methods:');
    
    if (paymentMethods.card) {
      console.log('   ✅ Cards enabled');
    }
    if (paymentMethods.netbanking) {
      console.log('   ✅ Net Banking enabled');
    }
    if (paymentMethods.wallet) {
      console.log('   ✅ Wallets enabled');
    }
    if (paymentMethods.upi) {
      console.log('   ✅ UPI enabled');
    }
    console.log('');
    
    // 5. Check recent failed payments
    console.log('5. ❌ CHECKING RECENT FAILED PAYMENTS:');
    const recentOrders = await razorpay.orders.all({ count: 5 });
    
    let failedCount = 0;
    let refundedCount = 0;
    
    for (const order of recentOrders.items) {
      try {
        const payments = await razorpay.orders.fetchPayments(order.id);
        for (const payment of payments.items) {
          if (payment.status === 'failed') {
            failedCount++;
            console.log(`   ❌ Failed: ${payment.id} - ${payment.error_description || 'Unknown error'}`);
          }
          if (payment.status === 'refunded' || payment.amount_refunded > 0) {
            refundedCount++;
            console.log(`   🔄 Refunded: ${payment.id} - ₹${payment.amount_refunded / 100}`);
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Could not fetch payments for order ${order.id}`);
      }
    }
    
    console.log(`   📊 Failed payments: ${failedCount}`);
    console.log(`   📊 Refunded payments: ${refundedCount}`);
    console.log('');
    
    // 6. Provide recommendations
    console.log('6. 💡 RECOMMENDATIONS:');
    
    if (refundedCount > 0) {
      console.log('   🚨 HIGH PRIORITY: All payments are being refunded!');
      console.log('   📞 Contact Razorpay support immediately');
      console.log('   🔧 Check webhook configuration in dashboard');
    }
    
    if (failedCount > 0) {
      console.log('   ⚠️  Multiple payment failures detected');
      console.log('   🔍 Check payment gateway settings');
    }
    
    if (!isLiveMode) {
      console.log('   🔄 Switch to live keys for production');
    }
    
    console.log('   ✅ Test order created - you can use this for testing');
    console.log(`   🔗 Test with order ID: ${testOrder.id}`);
    
  } catch (error) {
    console.error('❌ RAZORPAY TEST FAILED:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('authentication')) {
      console.log('\n🔑 AUTHENTICATION ISSUE:');
      console.log('   - Check if Razorpay keys are correct');
      console.log('   - Verify live mode is activated in dashboard');
      console.log('   - Ensure account is KYC verified');
    }
    
    if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('\n🌐 NETWORK ISSUE:');
      console.log('   - Check internet connection');
      console.log('   - Verify Razorpay API is accessible');
    }
  }
}

async function fixRazorpayLiveMode() {
  console.log('\n🛠️  RAZORPAY LIVE MODE FIX SUGGESTIONS:\n');
  
  console.log('1. 🏦 ACCOUNT ACTIVATION:');
  console.log('   - Go to: https://dashboard.razorpay.com/app/activation');
  console.log('   - Complete KYC verification');
  console.log('   - Submit required documents');
  console.log('   - Wait for approval (usually 24-48 hours)');
  console.log('');
  
  console.log('2. 🔑 API KEYS:');
  console.log('   - Go to: https://dashboard.razorpay.com/app/keys');
  console.log('   - Generate LIVE API keys (not test keys)');
  console.log('   - Update your .env file with live keys');
  console.log('');
  
  console.log('3. 💳 PAYMENT METHODS:');
  console.log('   - Go to: https://dashboard.razorpay.com/app/payment-methods');
  console.log('   - Enable required payment methods');
  console.log('   - Configure international payments if needed');
  console.log('');
  
  console.log('4. 🔗 WEBHOOKS:');
  console.log('   - Go to: https://dashboard.razorpay.com/app/webhooks');
  console.log('   - Add webhook URL: https://your-domain.com/api/v1/payments/webhook/razorpay');
  console.log('   - Enable events: payment.captured, payment.failed, refund.created');
  console.log('');
  
  console.log('5. 🚨 EMERGENCY CONTACTS:');
  console.log('   - Support: +91 76788 81800');
  console.log('   - Email: support@razorpay.com');
  console.log('   - Mention: "Live mode activation issue"');
}

async function main() {
  await testRazorpayLiveMode();
  await fixRazorpayLiveMode();
  
  console.log('\n✅ Razorpay live mode test complete!');
  console.log('🚨 If payments still fail, contact Razorpay support immediately!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testRazorpayLiveMode, fixRazorpayLiveMode }; 