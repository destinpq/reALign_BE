# ReAlign PhotoMaker Backend

A sophisticated Next.js + Nest.js application with AI-powered headshot generation, comprehensive payment integration, and complete audit logging.

## 🚀 Features

### Core Features
- **AI Headshot Generation** with Magic Hour AI integration
- **Payment Processing** with Razorpay (Indian payment gateway)
- **Credit System** with flexible pricing tiers
- **Comprehensive Audit Logging** for all system activities
- **Email Notifications** for all events
- **Webhook Management** for real-time updates
- **User Authentication** with JWT tokens
- **File Storage** with AWS S3 integration
- **Avatar Customization** with wearable items from CSV

### Security & Compliance
- **Payment Verification** before any AI generation
- **Audit Trails** for all user actions
- **Secure Webhook Handling** with signature verification
- **Rate Limiting** and request throttling
- **Input Validation** and sanitization

## 🏗️ Architecture

### Payment Flow
1. User selects credit package or custom credits
2. Razorpay order created and stored in database
3. User completes payment on frontend
4. Payment verification with signature validation
5. Credits awarded and audit logged
6. Email confirmation sent

### Headshot Generation Flow
1. **Payment Check**: Verify user has sufficient credits
2. **Credit Deduction**: Deduct 50 credits before processing
3. **Image Processing**: Upload and optimize source image
4. **API Call**: Send request to Magic Hour AI
5. **Job Tracking**: Store processing job in database
6. **Status Updates**: Monitor and update job status
7. **Email Notifications**: Send completion/failure emails
8. **Audit Logging**: Log all activities

### Webhook System
- **Razorpay Webhooks**: Payment status updates
- **Magic Hour Webhooks**: Generation status updates
- **Email Webhooks**: Delivery status tracking
- **Signature Verification**: Secure webhook processing

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- AWS S3 account
- Razorpay account
- SMTP email service
- Magic Hour AI API key

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd realign-photomaker/backend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/realign_db"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"

# AWS S3 Storage
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="realign-photomaker-bucket"

# Magic Hour AI
MAGIC_HOUR_API_KEY="mhk_live_HscgSNfcFRf6kDgLCRiFO3fk8grvORzDihnfe2W8NoZCWc6EhURuRXSSHA9aK9VpMKx7ldljKeVqQ2f5"

# Razorpay Payment Gateway
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

# Email Configuration (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@realign-photomaker.com"

# Application URLs
FRONTEND_URL="http://localhost:3001"
PORT=3000
NODE_ENV="development"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database with wearable items
npm run db:seed
```

### 4. Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## 📊 Database Schema

### Core Models

- **User**: Authentication, credits, subscriptions
- **Payment**: Razorpay integration, credit purchases
- **ProcessingJob**: Magic Hour AI job tracking
- **AuditLog**: Comprehensive activity logging
- **EmailNotification**: Email delivery tracking
- **WebhookDelivery**: Webhook event processing

### Wearable System

- **WearableItem**: 7000+ items from CSV file
- **UserWearableSelection**: User's selected items
- **AvatarCustomization**: Color and style customization

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/profile` - Get user profile

### Payments
- `POST /payments/create-order` - Create Razorpay order
- `POST /payments/verify` - Verify payment signature
- `POST /payments/webhook` - Razorpay webhook handler
- `GET /payments/history` - Payment history
- `GET /payments/pricing` - Pricing information

### Magic Hour AI
- `POST /magic-hour/headshots` - Generate headshot (requires 50 credits)
- `GET /magic-hour/headshots/:jobId/status` - Check generation status
- `GET /magic-hour/headshots` - List user's headshots
- `GET /magic-hour/stats` - User statistics

### Wearables
- `GET /wearables` - List wearable items (paginated)
- `GET /wearables/categories` - Get categories
- `POST /wearables/select` - Select multiple items
- `GET /wearables/user-selections` - Get user's selections

### Photos
- `POST /photos` - Upload photo
- `GET /photos` - List user photos
- `GET /photos/:id/url` - Get signed S3 URL

## 💳 Payment Integration

### Credit Packages

| Package | Credits | Price (INR) | Popular |
|---------|---------|-------------|---------|
| FREE | 5 | ₹0 | - |
| BASIC | 100 | ₹499 | ✅ |
| PREMIUM | 500 | ₹1,999 | - |
| ENTERPRISE | 2,000 | ₹4,999 | - |

### Custom Credits
- **Price**: ₹5 per credit
- **Minimum**: 10 credits
- **Maximum**: 1000 credits per transaction

### Headshot Generation Cost
- **50 credits** per headshot
- **Payment required** before generation
- **Automatic refund** if generation fails

## 🔗 Webhook Setup

### Razorpay Webhooks

1. **Login to Razorpay Dashboard**
2. **Go to Settings → Webhooks**
3. **Add Webhook URL**: `https://yourdomain.com/payments/webhook`
4. **Select Events**:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
5. **Copy Webhook Secret** to environment variables

### Magic Hour Webhooks

Configure webhook URL in Magic Hour dashboard:
- **URL**: `https://yourdomain.com/magic-hour/webhook`
- **Events**: All generation events

## 📧 Email Templates

Email templates are stored in `src/modules/email/templates/`:

- `welcome.hbs` - Welcome email for new users
- `payment-confirmation.hbs` - Payment success notification
- `payment-failed.hbs` - Payment failure notification
- `headshot-generated.hbs` - Headshot completion notification
- `headshot-failed.hbs` - Headshot failure notification
- `credit-low-warning.hbs` - Low credits warning
- `subscription-expiring.hbs` - Subscription expiry warning

## 🔍 Audit Logging

All system activities are logged with:

- **User Actions**: Login, logout, profile updates
- **Payment Events**: Order creation, payment verification, failures
- **Generation Events**: Headshot requests, completions, failures
- **System Events**: Webhook deliveries, email sends

### Audit Log Fields

```typescript
{
  userId: string;
  action: string; // e.g., "payment.completed"
  entityType: string; // e.g., "Payment"
  entityId: string;
  oldValues: object;
  newValues: object;
  metadata: object;
  ipAddress: string;
  userAgent: string;
  source: 'API' | 'WEBHOOK' | 'SYSTEM';
  createdAt: Date;
}
```

## 🚀 Deployment

### Production Environment

1. **Set NODE_ENV=production**
2. **Configure production database**
3. **Set up SSL certificates**
4. **Configure production SMTP**
5. **Set webhook URLs to production domains**

### Docker Deployment

```bash
# Build production image
docker build -t realign-backend .

# Run with environment variables
docker run -p 3000:3000 --env-file .env realign-backend
```

### Health Checks

- **Health Endpoint**: `GET /health`
- **Database**: Connection status
- **Redis**: Connection status
- **S3**: Bucket access
- **Email**: SMTP connection

## 📈 Monitoring

### Key Metrics

- **Payment Success Rate**
- **Headshot Generation Success Rate**
- **Email Delivery Rate**
- **API Response Times**
- **Error Rates by Endpoint**

### Logging

- **Winston Logger** with multiple transports
- **Structured Logging** with JSON format
- **Log Levels**: error, warn, info, debug
- **Audit Trail** for compliance

## 🔧 Development

### Running Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```

### Database Management

```bash
# Reset database
npm run db:migrate:reset

# View database
npm run db:studio

# Deploy migrations
npm run db:migrate:deploy
```

### API Documentation

- **Swagger UI**: `http://localhost:3000/api`
- **OpenAPI Spec**: Auto-generated from decorators
- **Postman Collection**: Available in `/docs`

## 🐛 Troubleshooting

### Common Issues

1. **Payment Verification Fails**
   - Check Razorpay webhook secret
   - Verify signature calculation
   - Check timestamp tolerance

2. **Headshot Generation Fails**
   - Verify Magic Hour API key
   - Check image URL accessibility
   - Ensure sufficient credits

3. **Email Delivery Issues**
   - Check SMTP credentials
   - Verify sender email authentication
   - Check spam filters

### Debug Mode

```bash
npm run start:debug
```

Access debugger at `chrome://inspect`

## 📞 Support

For issues and questions:

- **Email**: support@realign-photomaker.com
- **Documentation**: `/docs`
- **API Status**: `GET /health`

## 🔐 Security

- **JWT Authentication** with refresh tokens
- **Rate Limiting** (100 requests/minute)
- **Input Validation** with class-validator
- **SQL Injection Protection** with Prisma
- **XSS Protection** with helmet
- **CSRF Protection** for webhooks
- **Audit Logging** for compliance

## 📄 License

Private License - All Rights Reserved 