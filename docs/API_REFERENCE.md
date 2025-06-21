# ReAlign PhotoMaker - Complete API Reference

This document provides a comprehensive list of all API endpoints available in the ReAlign PhotoMaker system.

## Base URL
```
Development: http://localhost:3000/api
Production: https://api.realign-photomaker.com
```

## Authentication
Most endpoints require JWT Bearer token authentication:
```
Authorization: Bearer <jwt_token>
```

## Admin Endpoints (Requires ADMIN or SUPER_ADMIN role)

### Admin Management
- `POST /admin/create-admin` - Create new admin user (SUPER_ADMIN only)
- `GET /admin/dashboard` - Get admin dashboard metrics
- `GET /admin/system-stats` - Get comprehensive system statistics

### User Management
- `GET /admin/users` - Get users with filtering and pagination
- `GET /admin/users/:userId` - Get detailed user information
- `PUT /admin/users/status` - Update user active status
- `POST /admin/users/award-credits` - Award credits to a user
- `GET /admin/users/:userId/violations` - Get user violation history

### Payment Analytics
- `GET /admin/payments/analytics` - Get payment analytics and insights

### Content Moderation
- `GET /admin/content/flagged` - Get flagged content for review
- `POST /admin/content/flag` - Flag content as inappropriate
- `GET /admin/content/moderation-stats` - Get content moderation statistics
- `GET /admin/prompts/review` - Get prompts that need review
- `GET /admin/images/review` - Get images that need review

### System Monitoring
- `GET /admin/activity/recent` - Get recent system activity
- `GET /admin/processing-jobs` - Get all processing jobs with status
- `GET /admin/emails/stats` - Get email delivery statistics
- `GET /admin/webhooks/deliveries` - Get webhook delivery logs
- `GET /admin/audit-logs` - Get comprehensive audit logs
- `GET /admin/system/health` - Get system health status

### Credit Management
- `GET /admin/credits/transactions` - Get all credit transactions
- `GET /admin/subscriptions/overview` - Get subscription overview

### User Analytics (NEW)
- `GET /admin/analytics/user/:userId` - Get detailed user activity analytics
- `GET /admin/analytics/system-overview` - Get system-wide user activity overview
- `GET /admin/analytics/user/:userId/timeline` - Get user activity timeline
- `GET /admin/analytics/top-users/:metric` - Get top users by metric (logins/payments/headshots/violations)
- `GET /admin/analytics/activity-heatmap` - Get user activity heatmap data
- `GET /admin/analytics/user-segments` - Get user segmentation analytics
- `GET /admin/analytics/conversion-funnel` - Get user conversion funnel analytics
- `GET /admin/analytics/revenue-analytics` - Get detailed revenue analytics

## Authentication Endpoints

### User Authentication
- `POST /auth/register` - Register new user account
- `POST /auth/login` - Login with email and password
- `POST /auth/logout` - Logout current user
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/verify-email` - Verify email address
- `POST /auth/resend-verification` - Resend email verification

### Profile Management
- `GET /auth/profile` - Get current user profile
- `PUT /auth/profile` - Update user profile
- `POST /auth/change-password` - Change user password

## Payment Endpoints

### Razorpay Integration
- `POST /payments/create-order` - Create Razorpay payment order
- `POST /payments/verify` - Verify payment completion
- `POST /payments/webhook` - Handle Razorpay webhooks
- `GET /payments/history` - Get user payment history
- `GET /payments/subscription-status` - Get current subscription status
- `GET /payments/pricing` - Get available pricing plans

### Credit Management
- `GET /payments/credits/balance` - Get current credit balance
- `GET /payments/credits/history` - Get credit usage history

## Magic Hour AI Endpoints

### Headshot Generation
- `POST /magic-hour/generate` - Generate AI headshot
- `GET /magic-hour/status/:jobId` - Check headshot generation status
- `GET /magic-hour/headshots` - List user's headshots with pagination
- `GET /magic-hour/stats` - Get user's generation statistics

### Content Moderation (Integrated)
All headshot generation requests are automatically screened for:
- Explicit content keywords
- Inappropriate prompts
- Policy violations
- Risk assessment (0-100 score)

## Photo Management Endpoints

### Photo Upload and Management
- `POST /photos/upload` - Upload photo to S3
- `GET /photos` - List user's photos
- `GET /photos/:photoId` - Get specific photo details
- `DELETE /photos/:photoId` - Delete photo
- `PUT /photos/:photoId` - Update photo metadata

### Photo Processing
- `POST /photos/process` - Process photo for avatar generation
- `GET /photos/processing-status/:jobId` - Check processing status

## Wearables Endpoints

### Wearable Items
- `GET /wearables` - Get all available wearable items
- `GET /wearables/categories` - Get wearable categories
- `GET /wearables/:wearableId` - Get specific wearable details
- `GET /wearables/search` - Search wearables by criteria

### User Wearable Selections
- `POST /wearables/select` - Select wearable for user
- `GET /wearables/selected` - Get user's selected wearables
- `DELETE /wearables/selected/:selectionId` - Remove wearable selection

## Customization Endpoints

### Avatar Customization
- `POST /customizations` - Create new avatar customization
- `GET /customizations` - Get user's customizations
- `GET /customizations/:customizationId` - Get specific customization
- `PUT /customizations/:customizationId` - Update customization
- `DELETE /customizations/:customizationId` - Delete customization

### Customization Templates
- `GET /customizations/templates` - Get available templates
- `POST /customizations/templates` - Create custom template

## Health Check Endpoints

### System Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health status

## Email Notification Types

The system sends the following email notifications:

### User Notifications
- **Welcome Email** - Sent on user registration
- **Email Verification** - Sent for email address verification
- **Password Reset** - Sent for password reset requests
- **Payment Confirmation** - Sent after successful payment
- **Payment Failed** - Sent when payment fails
- **Headshot Generated** - Sent when AI headshot is ready
- **Headshot Failed** - Sent when headshot generation fails
- **Credit Low Warning** - Sent when credits are running low
- **Subscription Expiring** - Sent before subscription expires
- **Monthly Usage Report** - Sent monthly with usage statistics
- **Content Violation Warning** - Sent for policy violations
- **Account Status Update** - Sent when account is activated/deactivated
- **Credits Awarded** - Sent when admin awards credits

### Admin Notifications
- **High-Risk Content Violation Alert** - Sent to admins for serious violations
- **System Error Alerts** - Sent for critical system issues
- **Payment Dispute Notifications** - Sent for payment disputes

## Webhook Endpoints

### Razorpay Webhooks
- `POST /payments/webhook` - Handle payment status updates
- Supported events: `payment.captured`, `payment.failed`, `subscription.charged`

### Magic Hour Webhooks (if available)
- `POST /magic-hour/webhook` - Handle generation status updates

## Rate Limiting

All endpoints are rate-limited:
- **General API**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **Payment**: 20 requests per minute per user
- **Headshot Generation**: 5 requests per minute per user

## Error Responses

All endpoints return standardized error responses:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

## Content Moderation Policy

### Blocked Content Types
- Explicit or sexual content
- Nudity or revealing clothing requests
- Inappropriate or suggestive prompts
- Violence or harmful content
- Discriminatory content

### Risk Scoring
- **0-25**: Low risk, content allowed
- **26-49**: Medium risk, content allowed with monitoring
- **50-79**: High risk, content blocked
- **80-100**: Critical risk, content blocked + user flagged

### Flagged Keywords
The system monitors for inappropriate keywords and phrases in:
- Style prompts
- Image descriptions
- User-generated content

### Violation Consequences
- **First violation**: Warning email
- **Multiple violations**: Account review
- **High-risk violations**: Immediate admin notification
- **Critical violations**: Account suspension

## Credit System

### Credit Costs
- **AI Headshot Generation**: 50 credits per headshot
- **Photo Processing**: 10 credits per photo
- **Premium Features**: Variable credits

### Credit Packages
- **FREE**: 5 credits (new users)
- **BASIC**: 100 credits - ₹299
- **PREMIUM**: 500 credits - ₹1,299
- **ENTERPRISE**: 2000 credits - ₹4,999

### Credit Management
- Credits are deducted before processing
- Failed operations refund credits
- Credits expire after 1 year
- Admin can award bonus credits

## Subscription Types

### Subscription Tiers
- **FREE**: Limited features, 5 credits
- **BASIC**: Standard features, 100 credits/month
- **PREMIUM**: Advanced features, 500 credits/month
- **ENTERPRISE**: All features, 2000 credits/month

### Subscription Features
- **FREE**: Basic headshot generation
- **BASIC**: Multiple styles, basic support
- **PREMIUM**: Priority processing, advanced styles
- **ENTERPRISE**: Custom styles, dedicated support

## Audit Logging

All system activities are logged for compliance:

### Logged Actions
- User authentication and authorization
- Payment transactions
- Content generation requests
- Content moderation decisions
- Admin actions
- System errors and exceptions
- API access and usage

### Audit Data Retention
- User activity logs: 2 years
- Payment logs: 7 years
- Content moderation logs: 5 years
- System logs: 1 year

## Data Privacy and Security

### Data Protection
- All data encrypted in transit and at rest
- PII data is anonymized in logs
- GDPR compliance for EU users
- Regular security audits

### Data Retention
- User accounts: Until deletion requested
- Generated content: 1 year after creation
- Payment data: 7 years (legal requirement)
- Audit logs: As specified above

## API Versioning

- Current version: v1
- Version specified in URL: `/api/v1/endpoint`
- Backward compatibility maintained for 1 year
- Deprecation notices sent 6 months in advance

## Support and Documentation

### API Documentation
- Swagger/OpenAPI documentation available at `/api/docs`
- Interactive API explorer included
- Example requests and responses provided

### Support Channels
- Email: support@realign-photomaker.com
- Documentation: https://docs.realign-photomaker.com
- Status Page: https://status.realign-photomaker.com

---

*This documentation is automatically updated with each release. Last updated: January 2024* 