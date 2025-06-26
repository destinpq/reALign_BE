const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function testSimplePayment() {
  console.log('🧪 SIMPLE RAZORPAY PAYMENT TEST\n');
  
  try {
    // Create a test order
    console.log('1. 🛒 Creating test order...');
    const order = await razorpay.orders.create({
      amount: 19900, // ₹199 (your standard amount)
      currency: 'INR',
      receipt: `test_payment_${Date.now()}`,
      payment_capture: true,
      notes: {
        test: 'simple_payment_test',
        purpose: 'avatar_generation',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ Order created successfully!');
    console.log(`📋 Order ID: ${order.id}`);
    console.log(`💰 Amount: ₹${order.amount / 100}`);
    console.log(`🏷️  Receipt: ${order.receipt}`);
    console.log(`📊 Status: ${order.status}`);
    console.log('');
    
    // Check if order is ready for payment
    if (order.status === 'created') {
      console.log('2. ✅ ORDER IS READY FOR PAYMENT!');
      console.log('');
      console.log('🔗 PAYMENT DETAILS FOR FRONTEND:');
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Amount: ${order.amount}`);
      console.log(`   Currency: ${order.currency}`);
      console.log(`   Key ID: ${process.env.RAZORPAY_KEY_ID}`);
      console.log('');
      
      console.log('📱 FRONTEND INTEGRATION CODE:');
      console.log(`
const options = {
  key: "${process.env.RAZORPAY_KEY_ID}",
  amount: ${order.amount},
  currency: "${order.currency}",
  name: "ReAlign Avatar",
  description: "AI Avatar Generation",
  order_id: "${order.id}",
  handler: function(response) {
    console.log("Payment successful:", response);
    // Send to your backend for verification
  },
  prefill: {
    name: "Test User",
    email: "test@example.com",
    contact: "9999999999"
  },
  theme: {
    color: "#3399cc"
  }
};

const rzp = new Razorpay(options);
rzp.open();
      `);
      
      // Test fetching the order back
      console.log('3. 🔍 Verifying order can be fetched...');
      const fetchedOrder = await razorpay.orders.fetch(order.id);
      console.log(`✅ Order fetched: ${fetchedOrder.id} - ${fetchedOrder.status}`);
      
    } else {
      console.log('❌ Order creation failed or has wrong status');
    }
    
    // Check recent orders to see the pattern
    console.log('\n4. 📊 CHECKING RECENT ORDERS:');
    const recentOrders = await razorpay.orders.all({ count: 3 });
    
    for (const recentOrder of recentOrders.items) {
      console.log(`📋 ${recentOrder.id}: ₹${recentOrder.amount / 100} - ${recentOrder.status}`);
      
      // Check payments for this order
      try {
        const payments = await razorpay.orders.fetchPayments(recentOrder.id);
        if (payments.count > 0) {
          for (const payment of payments.items) {
            console.log(`   💳 Payment: ${payment.id} - ${payment.status}`);
            if (payment.amount_refunded > 0) {
              console.log(`   🚨 REFUNDED: ₹${payment.amount_refunded / 100}`);
            }
          }
        } else {
          console.log(`   ⏳ No payments yet`);
        }
      } catch (error) {
        console.log(`   ❌ Could not fetch payments`);
      }
    }
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    
    if (error.message.includes('Your account has been suspended')) {
      console.log('\n🚨 ACCOUNT SUSPENDED!');
      console.log('   - Your Razorpay account may be suspended');
      console.log('   - Contact Razorpay support immediately');
      console.log('   - Phone: +91 76788 81800');
    }
    
    if (error.message.includes('Invalid api key')) {
      console.log('\n🔑 INVALID API KEY!');
      console.log('   - Check your API keys in .env file');
      console.log('   - Regenerate keys from dashboard if needed');
    }
    
    if (error.message.includes('not activated')) {
      console.log('\n🏦 ACCOUNT NOT ACTIVATED!');
      console.log('   - Complete KYC verification');
      console.log('   - Submit required documents');
      console.log('   - Wait for approval');
    }
  }
}

async function main() {
  await testSimplePayment();
  
  console.log('\n🎯 SUMMARY:');
  console.log('- If order creation succeeded, your Razorpay is working');
  console.log('- The refund issue is likely in webhook configuration');
  console.log('- Use the order ID above to test a real payment');
  console.log('- Check Razorpay dashboard for webhook settings');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSimplePayment }; 