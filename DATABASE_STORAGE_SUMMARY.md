# ReAlign Database Storage Summary

## Database Name: ReAlign

Everything in the ReAlign PhotoMaker system is comprehensively stored in the PostgreSQL database. Here's what's tracked:

## 📊 Complete Data Storage Overview

### 👥 User Data
**Table: `users`**
- User profiles (email, name, role, subscription type)
- Account status and activity tracking
- Credit balance and subscription details
- Login history and session management
- Profile customization preferences

### 💳 Payment & Financial Data
**Table: `payments`**
- All Razorpay transactions with complete details
- Payment status, amounts, and credit awards
- Refunds, disputes, and payment method info
- Subscription billing and renewal tracking

**Table: `subscriptions`**
- Subscription plans (FREE, BASIC, PREMIUM, ENTERPRISE)
- Billing cycles, renewal dates, and status
- Subscription history and upgrades/downgrades

### 🎨 AI Generation & Processing
**Table: `processing_jobs`**
- Every Magic Hour AI headshot generation request
- Job status, external IDs, and processing times
- Input prompts, output URLs, and credit usage
- Success/failure tracking with error details

**Table: `photos`**
- All uploaded and generated images
- S3 storage details (bucket, key, metadata)
- Image processing history and transformations
- Generated image relationships and source tracking

### 🔍 Content Moderation
**Table: `audit_logs`** (Content Moderation Events)
- Every content moderation check performed
- Risk scores and violation detection
- Blocked content with detailed reasoning
- User violation patterns and escalation tracking

### 👕 Wearables & Customization
**Table: `wearable_items`**
- Complete catalog of 10,000+ wearable items from CSV
- Categories, styles, colors, and metadata
- Availability and pricing information

**Table: `user_wearable_selections`**
- User's selected wearable combinations
- Customization preferences and saved looks

**Table: `avatar_customizations`**
- Complete avatar customization sessions
- Style preferences and generation parameters
- Processing status and final outputs

### 📧 Email & Communication
**Table: `email_notifications`**
- Every email sent by the system
- Delivery status, bounce tracking, and retry attempts
- Template usage and personalization data
- Success/failure rates and performance metrics

### 🔐 Security & Audit
**Table: `audit_logs`** (Complete Activity Tracking)
- **Every user action** (login, logout, profile updates)
- **Every payment transaction** (creation, verification, failure)
- **Every AI generation request** (prompt, status, completion)
- **Every content moderation check** (risk assessment, violations)
- **Every admin action** (user management, credit awards)
- **Every system event** (errors, warnings, status changes)

**Audit Details Include:**
- User ID and IP address
- Action type and entity affected
- Before/after values for changes
- Metadata and context information
- Timestamp and source system
- User agent and session details

### 🔗 Webhook & Integration
**Table: `webhook_endpoints`**
- External webhook configurations
- Event subscriptions and delivery preferences

**Table: `webhook_deliveries`**
- Every webhook delivery attempt
- Success/failure status and retry logic
- Payload content and response tracking

### 📱 Session Management
**Table: `sessions`**
- Active user sessions with JWT tokens
- Device information and location tracking
- Session duration and activity patterns

## 🔍 Advanced Analytics Available

### User Activity Analytics
- **Login Patterns**: Frequency, timing, device usage
- **Payment Behavior**: Spending patterns, subscription preferences
- **Generation Usage**: Headshot requests, success rates, credit consumption
- **Content Violations**: Risk scores, violation types, escalation patterns

### System-Wide Analytics
- **User Segmentation**: Power users, regular users, trial users, churned users
- **Activity Levels**: Very active (>50 actions/week), active (10-50), moderate (3-10), inactive (<3)
- **Content Moderation**: Violation rates, top violators, risk trends
- **Revenue Analytics**: Revenue per user, lifetime value, subscription trends

### Risk & Compliance Tracking
- **User Risk Profiles**: LOW/MEDIUM/HIGH/CRITICAL risk levels
- **Violation Scoring**: Automated risk assessment (0-100 scale)
- **Account Flags**: Automated flagging for suspicious activity
- **Compliance Monitoring**: Policy adherence and violation tracking

## 📈 Real-Time Monitoring

### What Admins Can Monitor:
1. **Live User Activity**: Real-time dashboard of user actions
2. **Payment Processing**: Live payment status and transaction monitoring
3. **AI Generation Queue**: Current processing jobs and queue status
4. **Content Moderation**: Real-time violation detection and blocking
5. **System Health**: Database, API, and service status monitoring
6. **Email Delivery**: Real-time email sending and delivery tracking

### Analytics Dashboard Features:
- **User Activity Heatmaps**: Visual representation of user behavior
- **Top Users by Metric**: Most active, highest spending, most violations
- **Conversion Funnels**: User journey from signup to payment to usage
- **Revenue Analytics**: Daily/weekly/monthly revenue trends
- **Risk Monitoring**: High-risk users and content violations
- **System Performance**: API response times, error rates, uptime

## 🛡️ Data Security & Privacy

### Security Measures:
- **Encrypted Storage**: All sensitive data encrypted at rest
- **Audit Trails**: Complete audit logs for compliance
- **Role-Based Access**: Admin/Super Admin role restrictions
- **Data Retention**: Configurable retention policies
- **Privacy Compliance**: GDPR/CCPA compliant data handling

### Backup & Recovery:
- **Automated Backups**: Daily database backups
- **Point-in-Time Recovery**: Restore to any point in time
- **Disaster Recovery**: Multi-region backup strategy
- **Data Integrity**: Regular integrity checks and validation

## 🔄 Data Flow Summary

1. **User Registration** → Stored in `users` table with audit log
2. **Payment Processing** → `payments` table with webhook tracking
3. **AI Generation Request** → `processing_jobs` with content moderation check
4. **Content Moderation** → Risk assessment stored in `audit_logs`
5. **Image Generation** → Results stored in `photos` with S3 references
6. **Email Notifications** → Tracked in `email_notifications` with delivery status
7. **Admin Actions** → All logged in `audit_logs` with full context

## 📊 Database Statistics (Example)

```sql
-- Users and Activity
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as active_users FROM users WHERE "lastLoginAt" > NOW() - INTERVAL '7 days';

-- Payments and Revenue
SELECT SUM(amount) as total_revenue FROM payments WHERE status = 'COMPLETED';
SELECT COUNT(*) as successful_payments FROM payments WHERE status = 'COMPLETED';

-- AI Generation Stats
SELECT COUNT(*) as total_headshots FROM processing_jobs WHERE type = 'HEADSHOT_GENERATION';
SELECT COUNT(*) as successful_generations FROM processing_jobs WHERE status = 'COMPLETED';

-- Content Moderation
SELECT COUNT(*) as total_violations FROM audit_logs WHERE action = 'content.violation_detected';
SELECT COUNT(*) as high_risk_violations FROM audit_logs 
WHERE action = 'content.violation_detected' AND (metadata->>'riskScore')::int >= 80;

-- System Activity
SELECT COUNT(*) as total_audit_entries FROM audit_logs;
SELECT COUNT(*) as emails_sent FROM email_notifications WHERE status = 'SENT';
```

## 🎯 Key Benefits

✅ **Complete Transparency**: Every action is logged and traceable
✅ **Real-Time Monitoring**: Live dashboard with instant insights
✅ **Risk Management**: Automated content moderation and user risk assessment
✅ **Compliance Ready**: Full audit trails for regulatory requirements
✅ **Performance Optimization**: Detailed analytics for system improvements
✅ **User Insights**: Deep understanding of user behavior and preferences
✅ **Revenue Tracking**: Comprehensive financial analytics and forecasting
✅ **Security Monitoring**: Real-time threat detection and response

The ReAlign database provides a complete, secure, and compliant data storage solution with comprehensive analytics capabilities for effective admin monitoring and system management. 