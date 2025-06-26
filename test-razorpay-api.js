const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: 'rzp_live_ucdum2OBq7AJin',
  key_secret: 'tBp82IXZX3Ca015ya2sqEhjk',
});

console.log('🔑 Testing Razorpay API Connection...');
console.log('Key ID:', 'rzp_live_ucdum2OBq7AJin');
console.log('Using LIVE mode');

async function testRazorpayAPI() {
  try {
    // Test 1: Create a simple order
    console.log('\n📝 Test 1: Creating test order...');
    const order = await razorpay.orders.create({
      amount: 100, // ₹1
      currency: 'INR',
      receipt: 'test_' + Date.now(),
      payment_capture: true,
      notes: {
        test: 'API connectivity test'
      }
    });
    
    console.log('✅ Order created successfully!');
    console.log('Order ID:', order.id);
    console.log('Order Status:', order.status);
    console.log('Order Amount:', order.amount / 100, 'INR');
    
    // Test 2: Fetch the order back
    console.log('\n📋 Test 2: Fetching order details...');
    const fetchedOrder = await razorpay.orders.fetch(order.id);
    console.log('✅ Order fetched successfully!');
    console.log('Fetched Order Status:', fetchedOrder.status);
    
    // Test 3: List recent orders
    console.log('\n📊 Test 3: Listing recent orders...');
    const orders = await razorpay.orders.all({ count: 5 });
    console.log('✅ Listed orders successfully!');
    console.log('Recent orders count:', orders.items.length);
    
    console.log('\n🎉 All Razorpay API tests PASSED!');
    console.log('The 500 error is likely from Razorpay\'s checkout frontend, not our API.');
    
  } catch (error) {
    console.error('\n❌ Razorpay API Test FAILED:');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.error?.code);
    console.error('Error Description:', error.error?.description);
    console.error('HTTP Status:', error.statusCode);
    
    if (error.error?.field) {
      console.error('Problem Field:', error.error.field);
    }
    
    console.log('\n🔍 Possible causes:');
    console.log('1. Razorpay API is down');
    console.log('2. Invalid API credentials');
    console.log('3. Account suspended or restricted');
    console.log('4. Network connectivity issues');
  }
}

testRazorpayAPI(); 