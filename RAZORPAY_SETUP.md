# Razorpay Setup Guide - Prevent Auto-Refunds

This guide helps you configure Razorpay properly to prevent automatic refunds and enable CLI payments.

## 🚨 Problem: Auto-Refunds

Razorpay automatically refunds payments when:
- Webhooks are not properly configured
- Payment capture is not enabled
- Webhook signature verification fails
- Settlement is not confirmed within timeout period

## ✅ Solution: Proper Configuration

### 1. Webhook Configuration

Add the following webhook URL to your Razorpay Dashboard:

```
https://realign-api.destinpq.com/api/v1/webhooks/razorpay
```

**Enable these webhook events:**
- ✅ `payment.authorized`
- ✅ `payment.captured`
- ✅ `payment.failed`
- ✅ `refund.created`

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Payment Gateway - LIVE MODE
RAZORPAY_KEY_ID="rzp_live_ucdum2OBq7AJin"
RAZORPAY_KEY_SECRET="tBp82IXZX3Ca015ya2sqEhjk"
RAZORPAY_WEBHOOK_SECRET="5d8ec398d64f9e6f7f5a9f1e5eca4f4e6a8e4978b0b8654ecaa8725a9451f81e"

PAYMENT_MODE="live"
PAYMENT_AUTO_CAPTURE="true"
PAYMENT_TIMEOUT="300"
```

### 3. Razorpay Dashboard Settings

**Go to Razorpay Dashboard → Settings → Webhooks:**

1. **Add Webhook Endpoint:**
   - URL: `https://realign-api.destinpq.com/api/v1/webhooks/razorpay`
   - Secret: `5d8ec398d64f9e6f7f5a9f1e5eca4f4e6a8e4978b0b8654ecaa8725a9451f81e`
   - Status: Active

2. **Enable Events:**
   ```
   payment.authorized
   payment.captured
   payment.failed
   refund.created
   ```

3. **Payment Settings:**
   - Auto-capture: **ENABLED** ✅
   - Payment timeout: **5 minutes**
   - Refund policy: **Manual only**

### 4. Test Configuration

Run the configuration script:

```bash
cd reALign_BE
node configure-razorpay.js
```

This will:
- ✅ Test Razorpay connection
- ✅ Create test orders
- ✅ Verify webhook signatures
- ✅ Display configuration status

### 5. CLI Payment Testing

**Test Cards (Razorpay Test Mode):**
- Card: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date
- Name: Any name

**Test Scenarios:**
1. **Success:** Use test card above
2. **Failure:** Use card `4000 0000 0000 0002`
3. **Timeout:** Use card `4000 0000 0000 0069`

### 6. Webhook Verification

Test webhook signature verification:

```bash
curl -X POST https://realign-api.destinpq.com/api/v1/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test_signature" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "amount": 19900,
          "currency": "INR",
          "status": "captured"
        }
      }
    }
  }'
```

## 🔧 Troubleshooting

### Auto-Refunds Still Happening

1. **Check Webhook Status:**
   ```bash
   # Check if webhooks are being received
   tail -f logs/webhook.log
   ```

2. **Verify Signature:**
   ```bash
   # Test signature verification
   node -e "
   const crypto = require('crypto');
   const payload = 'test_payload';
   const secret = '5d8ec398d64f9e6f7f5a9f1e5eca4f4e6a8e4978b0b8654ecaa8725a9451f81e';
   const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
   console.log('Signature:', signature);
   "
   ```

3. **Check Payment Capture:**
   ```bash
   # Verify auto-capture is enabled
   grep -r "payment_capture" src/
   ```

### Webhook Failures

1. **Invalid Signature:**
   - Update `RAZORPAY_WEBHOOK_SECRET` in `.env`
   - Restart the backend server
   - Update webhook secret in Razorpay dashboard

2. **Network Issues:**
   - Check firewall settings
   - Verify SSL certificate
   - Test webhook URL accessibility

3. **Database Errors:**
   - Check database connection
   - Verify payment table schema
   - Check database logs

### Payment Processing Issues

1. **Authentication Errors:**
   - Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
   - Check if using correct live/test keys
   - Verify key permissions in Razorpay dashboard

2. **Order Creation Failures:**
   - Check amount format (should be in paise)
   - Verify currency code (`INR`)
   - Check receipt format

3. **Capture Failures:**
   - Ensure `payment_capture: true` in order creation
   - Check payment timeout settings
   - Verify webhook event handling

## 📊 Monitoring

### Payment Status Tracking

```sql
-- Check recent payments
SELECT 
  id,
  razorpayPaymentId,
  amount,
  status,
  createdAt,
  updatedAt
FROM payments 
WHERE createdAt > NOW() - INTERVAL 1 DAY
ORDER BY createdAt DESC;
```

### Webhook Delivery Status

```sql
-- Check webhook deliveries
SELECT 
  eventType,
  status,
  attempts,
  createdAt
FROM webhook_deliveries 
WHERE createdAt > NOW() - INTERVAL 1 DAY
ORDER BY createdAt DESC;
```

## 🚀 Production Checklist

- [ ] Webhook URL added to Razorpay dashboard
- [ ] Webhook secret configured in `.env`
- [ ] All required events enabled
- [ ] Auto-capture enabled
- [ ] Payment timeout set to 5 minutes
- [ ] SSL certificate valid
- [ ] Database schema updated
- [ ] Webhook signature verification working
- [ ] Test payments successful
- [ ] Monitoring and logging enabled

## 📞 Support

If auto-refunds continue:

1. **Check Razorpay Dashboard:**
   - Go to Payments → Refunds
   - Check refund reasons
   - Verify webhook delivery status

2. **Contact Razorpay Support:**
   - Provide webhook URL
   - Share payment IDs
   - Explain auto-refund issue

3. **Debug Logs:**
   ```bash
   # Enable debug logging
   LOG_LEVEL=debug npm start
   
   # Check webhook logs
   grep -r "razorpay" logs/
   ```

---

**Last Updated:** $(date)
**Configuration Script:** `configure-razorpay.js`
**Webhook URL:** `https://realign-api.destinpq.com/api/v1/webhooks/razorpay` 