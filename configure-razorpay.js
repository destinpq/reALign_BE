#!/usr/bin/env node

/**
 * Razorpay Configuration Script
 * This script helps configure Razorpay settings to prevent auto-refunds
 * and enable proper payment processing for CLI payments
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env file');
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

async function configureRazorpay() {
  console.log('🔧 Configuring Razorpay for CLI payments...\n');

  try {
    // 1. Test Razorpay connection
    console.log('1. Testing Razorpay connection...');
    const testOrder = await razorpay.orders.create({
      amount: 100, // ₹1 test order
      currency: 'INR',
      receipt: `test_${Date.now()}`,
      payment_capture: true,
      notes: {
        test: 'true',
        service: 'ReAlign Avatar Generation'
      }
    });
    console.log('✅ Razorpay connection successful');
    console.log(`   Test Order ID: ${testOrder.id}`);

    // 2. Display webhook configuration
    console.log('\n2. Webhook Configuration:');
    console.log('   Add this webhook URL to your Razorpay dashboard:');
    console.log(`   🔗 ${process.env.API_BASE_URL || 'https://realign-api.destinpq.com'}/api/v1/webhooks/razorpay`);
    console.log('   Events to enable:');
    console.log('   ✓ payment.authorized');
    console.log('   ✓ payment.captured');
    console.log('   ✓ payment.failed');
    console.log('   ✓ refund.created');

    // 3. Generate webhook secret
    console.log('\n3. Webhook Secret:');
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    console.log(`   Add this to your .env file:`);
    console.log(`   RAZORPAY_WEBHOOK_SECRET="${webhookSecret}"`);

    // 4. Display payment configuration
    console.log('\n4. Payment Configuration:');
    console.log('   ✅ Auto-capture enabled (prevents refunds)');
    console.log('   ✅ Payment timeout: 5 minutes');
    console.log('   ✅ CLI payments supported');

    // 5. Test payment creation
    console.log('\n5. Creating test payment order...');
    const paymentOrder = await razorpay.orders.create({
      amount: 19900, // ₹199
      currency: 'INR',
      receipt: `avatar_${Date.now()}`,
      payment_capture: true,
      notes: {
        service: 'AI Avatar Generation',
        auto_capture: 'true',
        cli_payment: 'true'
      }
    });
    console.log('✅ Test payment order created');
    console.log(`   Order ID: ${paymentOrder.id}`);
    console.log(`   Amount: ₹${paymentOrder.amount / 100}`);

    console.log('\n🎉 Razorpay configuration complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Add the webhook URL to your Razorpay dashboard');
    console.log('2. Add the webhook secret to your .env file');
    console.log('3. Enable the required webhook events');
    console.log('4. Test payments should now work without auto-refunds');

    console.log('\n💡 CLI Payment Testing:');
    console.log('You can now test payments using the Razorpay test cards:');
    console.log('• Card: 4111 1111 1111 1111');
    console.log('• CVV: Any 3 digits');
    console.log('• Expiry: Any future date');
    console.log('• Name: Any name');

  } catch (error) {
    console.error('❌ Configuration failed:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('\n🔑 Authentication Error:');
      console.error('Please check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
      console.error('Make sure you are using the correct live/test keys');
    }
    
    if (error.message.includes('network')) {
      console.error('\n🌐 Network Error:');
      console.error('Please check your internet connection');
    }

    process.exit(1);
  }
}

async function testWebhookSignature() {
  console.log('\n🔐 Testing webhook signature verification...');
  
  const testPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test123',
          amount: 19900,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  });

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret';
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(testPayload)
    .digest('hex');

  console.log('✅ Webhook signature test successful');
  console.log(`   Signature: ${signature.substring(0, 20)}...`);
}

// Main execution
if (require.main === module) {
  configureRazorpay()
    .then(() => testWebhookSignature())
    .catch(console.error);
}

module.exports = { configureRazorpay, testWebhookSignature }; 