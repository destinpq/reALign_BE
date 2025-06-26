const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: 'rzp_live_ucdum2OBq7AJin',
  key_secret: 'tBp82IXZX3Ca015ya2sqEhjk',
});

console.log('🔑 Testing Razorpay Order Creation...');
console.log('Key ID:', 'rzp_live_ucdum2OBq7AJin');
console.log('Using LIVE mode');

async function testOrderCreation() {
  try {
    console.log('\n📝 Creating test order...');
    
    const order = await razorpay.orders.create({
      amount: 19900, // ₹199
      currency: 'INR',
      receipt: `test_order_${Date.now()}`,
      payment_capture: true,
      notes: {
        userId: 'test_user',
        service: 'AI Avatar Generation',
        test: 'true'
      },
      partial_payment: false,
    });
    
    console.log('✅ Order created successfully!');
    console.log('Order ID:', order.id);
    console.log('Order Status:', order.status);
    console.log('Order Amount:', order.amount / 100, 'INR');
    console.log('Full Order:', JSON.stringify(order, null, 2));
    
    console.log('\n🎉 Razorpay order creation is WORKING!');
    console.log('The 500 error is likely from Razorpay\'s checkout frontend, not order creation.');
    
    // Test order fetch
    console.log('\n📋 Fetching order details...');
    const fetchedOrder = await razorpay.orders.fetch(order.id);
    console.log('✅ Order fetched successfully!');
    console.log('Fetched Order Status:', fetchedOrder.status);
    
  } catch (error) {
    console.error('\n❌ Razorpay Order Creation FAILED:');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.error?.code);
    console.error('Error Description:', error.error?.description);
    console.error('HTTP Status:', error.statusCode);
    console.error('Full Error:', JSON.stringify(error, null, 2));
    
    if (error.error?.field) {
      console.error('Problem Field:', error.error.field);
    }
    
    console.log('\n🔍 Possible causes:');
    console.log('1. Invalid API credentials');
    console.log('2. Account suspended or restricted');
    console.log('3. Invalid order parameters');
    console.log('4. Network connectivity issues');
  }
}

testOrderCreation(); 