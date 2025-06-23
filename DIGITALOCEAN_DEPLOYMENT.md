# DigitalOcean Deployment Guide - Replicate API Fix

## 🚨 URGENT: Fix Replicate API 401 Error

The production server is missing the Replicate API token, causing image analysis to fail.

## 📋 Quick Fix Steps

### 1. SSH into Your DigitalOcean Server
```bash
ssh root@your-droplet-ip
# or
ssh your-username@your-droplet-ip
```

### 2. Navigate to Backend Directory
```bash
cd /var/www/realign-backend
# or wherever your backend is deployed
```

### 3. Pull Latest Code
```bash
git pull origin main
npm install
npm run build
```

### 4. Update Environment Variables
```bash
nano .env
```

Add/update this line in your `.env` file:
```env
REPLICATE_API_TOKEN=your_replicate_token_here
```

**Note**: Use the same token that's in your local `.env` file (starts with `r8_`)

### 5. Restart Your Backend Service

**If using PM2:**
```bash
pm2 restart realign-backend
pm2 logs realign-backend  # Check logs
```

**If using systemd:**
```bash
systemctl restart realign-backend
systemctl status realign-backend
```

**If using Docker:**
```bash
docker-compose restart backend
docker-compose logs backend
```

### 6. Test the Fix
```bash
curl -X POST https://realign-api.destinpq.com/api/v1/photos/analyze-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"imageUrl":"https://realign-api.destinpq.com/uploads/a464dc60-a66d-482e-890c-d39cccce7312.jpg"}'
```

## 🔍 Troubleshooting

### Check Environment Variables
```bash
# In your backend directory
node -e "console.log('REPLICATE_API_TOKEN:', process.env.REPLICATE_API_TOKEN ? 'SET' : 'NOT SET')"
```

### Check Application Logs
```bash
# PM2 logs
pm2 logs realign-backend --lines 50

# Docker logs
docker-compose logs backend --tail 50

# System logs
journalctl -u realign-backend -f
```

### Test Replicate API Directly
```bash
curl -H "Authorization: Token $REPLICATE_API_TOKEN" \
  https://api.replicate.com/v1/account
```

## 🔐 Security Notes

- The Replicate API token is already configured in your local `.env` file
- Make sure your production `.env` file has the same token
- Never commit API tokens to Git repositories
- Consider using environment variable management tools like:
  - DigitalOcean App Platform environment variables
  - Docker secrets
  - Kubernetes secrets

## 📊 Expected Results

After the fix, you should see:
- ✅ Image analysis working without 401 errors
- ✅ BLIP-3 analysis completing successfully
- ✅ Structured data returned for avatar generation

## 🚀 Alternative: DigitalOcean App Platform

If you're using DigitalOcean App Platform:

1. Go to your app in the DigitalOcean control panel
2. Navigate to Settings → Environment Variables
3. Add: `REPLICATE_API_TOKEN` = `[your_token_from_local_env]`
4. Redeploy your application

## 📞 Support

If you encounter issues:
1. Check the application logs for specific error messages
2. Verify the environment variable is loaded correctly
3. Test the Replicate API token manually
4. Ensure your backend service restarted properly

---

**Status**: Ready to deploy 🚀
**Priority**: HIGH - Fixes critical image analysis functionality 