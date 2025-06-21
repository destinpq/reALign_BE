# Admin System Setup Guide

This guide explains how to set up and use the comprehensive admin system for ReAlign PhotoMaker.

## Overview

The admin system provides:
- **Complete system monitoring** - Users, payments, headshots, content moderation
- **Content moderation** - Automatic screening for explicit content with risk scoring
- **User management** - Account status, credit awards, violation tracking
- **Analytics & reporting** - Payment analytics, system health, audit logs
- **Security controls** - Role-based access, comprehensive audit trails

## Setup Instructions

### 1. Database Migration

The admin system requires new database tables. Run the migration:

```bash
cd backend
npm run db:migrate
```

This adds the following tables:
- `AuditLog` - Complete activity tracking
- `EmailNotification` - Email delivery tracking
- `WebhookDelivery` - Webhook event tracking
- `WebhookEndpoint` - Webhook configuration

### 2. Create Initial Admin Account

Run the admin creation script:

```bash
cd backend
npm run admin:create
```

This creates a super admin account with:
- **Email**: `admin@realign-photomaker.com`
- **Password**: `AdminPassword123!`
- **Role**: `SUPER_ADMIN`
- **Credits**: 10,000

**⚠️ IMPORTANT**: Change the default password immediately after first login!

### 3. Environment Variables

Ensure these environment variables are set in your `.env` file:

```env
# Magic Hour API
MAGIC_HOUR_API_KEY=mhk_live_HscgSNfcFRf6kDgLCRiFO3fk8grvORzDihnfe2W8NoZCWc6EhURuRXSSHA9aK9VpMKx7ldljKeVqQ2f5

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@realign-photomaker.com

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

### 4. Start the Application

```bash
cd backend
npm run start:dev
```

The admin endpoints will be available at:
- **Base URL**: `http://localhost:3000/api/admin`
- **Swagger Docs**: `http://localhost:3000/api/docs`

## Admin Account Management

### Create Additional Admins

Use the API endpoint (requires SUPER_ADMIN role):

```bash
curl -X POST http://localhost:3000/api/admin/create-admin \
  -H "Authorization: Bearer <super_admin_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new-admin@realign-photomaker.com",
    "password": "SecurePassword123!",
    "firstName": "New",
    "lastName": "Admin",
    "role": "ADMIN"
  }'
```

### List All Admins

```bash
cd backend
npm run admin:list
```

### Create Test Admin

For development/testing:

```bash
cd backend
npm run admin:create-test
```

## Content Moderation System

### Automatic Content Screening

All headshot generation requests are automatically screened for:

**Blocked Content Types:**
- Explicit or sexual content
- Nudity or revealing clothing requests
- Inappropriate or suggestive prompts
- Violence or harmful content
- Discriminatory content

**Risk Scoring:**
- **0-25**: Low risk, content allowed
- **26-49**: Medium risk, content allowed with monitoring
- **50-79**: High risk, content blocked
- **80-100**: Critical risk, content blocked + user flagged

**Flagged Keywords:**
The system monitors for inappropriate keywords in:
- Style prompts
- Image descriptions
- User-generated content

### Violation Consequences

1. **First violation**: Warning email to user
2. **Multiple violations**: Account review
3. **High-risk violations**: Immediate admin notification
4. **Critical violations**: Account suspension

### Admin Content Review

Access flagged content through these endpoints:

```bash
# Get flagged content
GET /admin/content/flagged?page=1&limit=50

# Get moderation statistics
GET /admin/content/moderation-stats?startDate=2024-01-01&endDate=2024-12-31

# Get user violation history
GET /admin/users/{userId}/violations

# Get prompts that need review
GET /admin/prompts/review?riskScore=50
```

## System Monitoring

### Dashboard Metrics

```bash
GET /admin/dashboard
```

Returns:
- New users today vs yesterday
- Payments today vs yesterday
- Headshots generated today vs yesterday
- System health status

### System Statistics

```bash
GET /admin/system-stats
```

Returns comprehensive stats:
- Total users, active users
- Payment totals and revenue
- Headshot generation statistics
- Credit purchase/consumption
- Email delivery statistics

### Recent Activity

```bash
GET /admin/activity/recent?limit=100
```

Returns recent system activity from audit logs.

## User Management

### Search and Filter Users

```bash
GET /admin/users?search=john@example.com&role=USER&isActive=true&page=1&limit=20
```

### Get User Details

```bash
GET /admin/users/{userId}
```

Returns complete user profile with:
- Account information
- Payment history
- Processing jobs
- Violation history

### Update User Status

```bash
PUT /admin/users/status
{
  "userId": "user_id_here",
  "isActive": false,
  "reason": "Policy violation"
}
```

### Award Credits

```bash
POST /admin/users/award-credits
{
  "userId": "user_id_here",
  "credits": 100,
  "reason": "Compensation for service issue"
}
```

## Payment Analytics

### Get Payment Analytics

```bash
GET /admin/payments/analytics?startDate=2024-01-01&endDate=2024-12-31&status=COMPLETED
```

Returns:
- Total payments and revenue
- Average payment amount
- Payments by status
- Payment trends over time
- Top spending users

## Audit Logging

### View Audit Logs

```bash
GET /admin/audit-logs?page=1&limit=100&userId=user_id&action=payment.completed&startDate=2024-01-01
```

### Logged Actions

The system logs all activities:
- User authentication and authorization
- Payment transactions
- Content generation requests
- Content moderation decisions
- Admin actions
- System errors and exceptions

### Data Retention

- User activity logs: 2 years
- Payment logs: 7 years
- Content moderation logs: 5 years
- System logs: 1 year

## Email Notifications

### Admin Notification Types

Admins receive notifications for:
- **High-Risk Content Violations** - Risk score ≥ 80
- **System Error Alerts** - Critical system issues
- **Payment Dispute Notifications** - Payment disputes

### User Notification Types

Users receive emails for:
- Welcome and verification emails
- Payment confirmations/failures
- Headshot generation completion/failure
- Content violation warnings
- Account status updates
- Credit awards and low balance warnings

### Email Statistics

```bash
GET /admin/emails/stats
```

Returns email delivery statistics and success rates.

## API Security

### Role-Based Access Control

- **USER**: Standard user permissions
- **ADMIN**: User management, content moderation, analytics
- **SUPER_ADMIN**: All admin permissions + admin creation

### Rate Limiting

- **General API**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **Payment**: 20 requests per minute per user
- **Headshot Generation**: 5 requests per minute per user

### JWT Authentication

All admin endpoints require valid JWT tokens with appropriate roles.

## Troubleshooting

### Common Issues

1. **Admin Creation Fails**
   - Check if admin already exists: `npm run admin:list`
   - Verify database connection
   - Check environment variables

2. **Content Moderation Not Working**
   - Verify ContentModerationService is imported in MagicHourModule
   - Check audit logs for moderation attempts
   - Review flagged keywords configuration

3. **Email Notifications Not Sending**
   - Verify SMTP configuration
   - Check email service logs
   - Test email credentials

4. **Payment Webhooks Failing**
   - Verify Razorpay webhook secret
   - Check webhook endpoint accessibility
   - Review webhook delivery logs

### Log Files

Check application logs for detailed error information:
- Application logs: Console output
- Audit logs: Database `AuditLog` table
- Email logs: Database `EmailNotification` table
- Webhook logs: Database `WebhookDelivery` table

## Production Deployment

### Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT secrets
- [ ] Configure HTTPS
- [ ] Set up proper CORS policies
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Regular security audits

### Monitoring Setup

1. **System Health Monitoring**
   ```bash
   GET /admin/system/health
   ```

2. **Database Performance**
   - Monitor query performance
   - Set up connection pooling
   - Regular database maintenance

3. **Email Delivery Monitoring**
   - Monitor bounce rates
   - Track delivery success rates
   - Set up retry mechanisms

### Backup Strategy

- **Database Backups**: Daily automated backups
- **File Storage**: S3 cross-region replication
- **Configuration**: Version-controlled environment configs
- **Audit Logs**: Long-term archival storage

## Support

For issues or questions:
- **Email**: support@realign-photomaker.com
- **Documentation**: See `API_REFERENCE.md` for complete API documentation
- **Status Page**: Monitor system status and incidents

---

*Last updated: January 2024* 