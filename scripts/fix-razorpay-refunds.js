const { PrismaClient } = require('@prisma/client');
const Razorpay = require('razorpay');
require('dotenv').config();

const prisma = new PrismaClient();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function investigateRefunds() {
  console.log('🔍 INVESTIGATING RAZORPAY REFUNDS...\n');

  try {
    // 1. Check recent payments in database
    console.log('📊 Checking recent payments in database...');
    const recentPayments = await prisma.payments.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`Found ${recentPayments.length} recent payments:`);
    for (const payment of recentPayments) {
      console.log(`- Payment ID: ${payment.id}`);
      console.log(`  Razorpay Payment ID: ${payment.razorpayPaymentId}`);
      console.log(`  Amount: ₹${payment.amount}`);
      console.log(`  Status: ${payment.status}`);
      console.log(`  Created: ${payment.createdAt}`);
      console.log('');
    }

    // 2. Check Razorpay payments directly
    console.log('🔗 Checking Razorpay payments directly...');
    
    for (const payment of recentPayments.slice(0, 5)) {
      if (payment.razorpayPaymentId) {
        try {
          const rzpPayment = await razorpay.payments.fetch(payment.razorpayPaymentId);
          console.log(`📋 Razorpay Payment ${payment.razorpayPaymentId}:`);
          console.log(`  Status: ${rzpPayment.status}`);
          console.log(`  Amount: ₹${rzpPayment.amount / 100}`);
          console.log(`  Method: ${rzpPayment.method}`);
          console.log(`  Captured: ${rzpPayment.captured}`);
          console.log(`  Refund Status: ${rzpPayment.refund_status || 'none'}`);
          console.log(`  Amount Refunded: ₹${(rzpPayment.amount_refunded || 0) / 100}`);
          
          // Check if there are refunds
          if (rzpPayment.amount_refunded > 0) {
            console.log('🚨 REFUND DETECTED! Fetching refund details...');
            const refunds = await razorpay.payments.fetchMultipleRefund(payment.razorpayPaymentId);
            console.log(`  Number of refunds: ${refunds.count}`);
            
            for (const refund of refunds.items) {
              console.log(`    Refund ID: ${refund.id}`);
              console.log(`    Amount: ₹${refund.amount / 100}`);
              console.log(`    Status: ${refund.status}`);
              console.log(`    Created: ${new Date(refund.created_at * 1000)}`);
              console.log(`    Notes: ${JSON.stringify(refund.notes)}`);
            }
          }
          
          console.log('');
        } catch (error) {
          console.error(`❌ Error fetching payment ${payment.razorpayPaymentId}:`, error.message);
        }
      }
    }

    // 3. Check webhook endpoints
    console.log('🔗 Checking webhook configuration...');
    console.log(`Webhook Secret configured: ${process.env.RAZORPAY_WEBHOOK_SECRET ? 'YES' : 'NO'}`);
    
    // 4. Suggest fixes
    console.log('\n🛠️  SUGGESTED FIXES:');
    console.log('1. Check Razorpay Dashboard → Settings → Webhooks');
    console.log('2. Look for any webhook URLs that might be causing auto-refunds');
    console.log('3. Check Payment Settings for auto-refund rules');
    console.log('4. Contact Razorpay support if issue persists');
    
    // 5. Create emergency disable script
    console.log('\n⚠️  EMERGENCY: If you want to disable all webhooks temporarily:');
    console.log('   Run: node scripts/disable-razorpay-webhooks.js');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkRazorpaySettings() {
  console.log('\n🔧 CHECKING RAZORPAY SETTINGS...');
  
  try {
    // Check if we can fetch orders (tests API access)
    const orders = await razorpay.orders.all({ count: 5 });
    console.log(`✅ API Access working - Found ${orders.count} orders`);
    
    // Check recent orders
    for (const order of orders.items.slice(0, 3)) {
      console.log(`📋 Order ${order.id}:`);
      console.log(`  Amount: ₹${order.amount / 100}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Created: ${new Date(order.created_at * 1000)}`);
      
      // Fetch payments for this order
      try {
        const orderPayments = await razorpay.orders.fetchPayments(order.id);
        console.log(`  Payments: ${orderPayments.count}`);
        
        for (const payment of orderPayments.items) {
          console.log(`    Payment ${payment.id}: ${payment.status}`);
          if (payment.amount_refunded > 0) {
            console.log(`    🚨 REFUNDED: ₹${payment.amount_refunded / 100}`);
          }
        }
      } catch (error) {
        console.log(`    ❌ Could not fetch payments: ${error.message}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Failed to check Razorpay settings:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚨 RAZORPAY REFUND EMERGENCY INVESTIGATION\n');
  
  await investigateRefunds();
  await checkRazorpaySettings();
  
  console.log('\n✅ Investigation complete!');
  console.log('\n🚨 NEXT STEPS:');
  console.log('1. Deploy the backend with the new webhook handler');
  console.log('2. Add webhook URL in Razorpay Dashboard');
  console.log('3. If refunds continue, contact Razorpay support immediately');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { investigateRefunds, checkRazorpaySettings }; 