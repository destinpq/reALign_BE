# Admin Analytics System - User Activity Monitoring

## 🎯 Overview

The ReAlign PhotoMaker system now includes comprehensive user analytics for admin dashboard monitoring. Every user action is tracked and stored in the **ReAlign** PostgreSQL database with detailed analytics capabilities.

## 📊 New Analytics Endpoints

### 1. Individual User Analytics
```http
GET /api/admin/analytics/user/{userId}
```
**Provides complete user profile including:**
- User information (email, name, role, subscription, credits)
- Activity statistics (logins, payments, headshots, violations)
- Recent activity timeline (last 50 actions)
- Risk profile assessment (LOW/MEDIUM/HIGH/CRITICAL)
- Account flags and violation scoring

### 2. System-Wide Activity Overview
```http
GET /api/admin/analytics/system-overview
```
**Provides system-wide insights:**
- Total and active user counts
- New user registrations today
- Top 10 most active users
- User activity segmentation (very active, active, moderate, inactive)
- Content moderation statistics with violation rates
- Top violators list

### 3. User Activity Timeline
```http
GET /api/admin/analytics/user/{userId}/timeline?days=30
```
**Provides day-by-day activity breakdown:**
- Chronological activity log
- Action types and timestamps
- IP addresses and user agents
- Entity details and metadata
- Customizable time range (default 30 days)

### 4. Top Users by Metrics
```http
GET /api/admin/analytics/top-users/{metric}?limit=10
```
**Available metrics:**
- `logins` - Most frequent login users
- `payments` - Highest spending users
- `headshots` - Most AI generation usage
- `violations` - Users with most policy violations

### 5. Additional Analytics Endpoints
- `GET /analytics/activity-heatmap` - Visual activity patterns
- `GET /analytics/user-segments` - User behavior segmentation
- `GET /analytics/conversion-funnel` - User journey analysis
- `GET /analytics/revenue-analytics` - Financial performance metrics

## 🔍 What's Being Tracked

### User Actions Monitored:
✅ **Authentication Events**
- Login/logout activities
- Token refresh and session management
- Password changes and security events

✅ **Payment Activities**
- Order creation and payment processing
- Credit purchases and usage
- Subscription changes and renewals

✅ **AI Generation Usage**
- Headshot generation requests
- Processing status and completion
- Credit consumption and success rates

✅ **Content Interactions**
- Content moderation checks
- Policy violations and risk scoring
- Image uploads and processing

✅ **Profile Management**
- Profile updates and customizations
- Wearable selections and avatar changes
- Preference modifications

✅ **Admin Actions**
- User management activities
- Credit awards and account modifications
- System configuration changes

## 📈 Analytics Features

### Real-Time Monitoring
- **Live Activity Feed**: Real-time user action streaming
- **System Health Dashboard**: Current system status and performance
- **Active User Tracking**: Currently online users and their activities

### User Segmentation
- **Power Users**: High activity (>50 actions/week) + high spending
- **Regular Users**: Moderate activity (10-50 actions/week) + some spending
- **Trial Users**: Low activity (<10 actions/week) + no spending
- **Churned Users**: No activity in 30+ days
- **At-Risk Users**: Declining activity patterns

### Risk Assessment
- **Automated Risk Scoring**: 0-100 scale based on violations
- **Risk Levels**: LOW/MEDIUM/HIGH/CRITICAL classifications
- **Account Flags**: Automated flagging for suspicious behavior
- **Violation Tracking**: Content policy violation history

### Performance Metrics
- **User Engagement**: Activity frequency and session duration
- **Conversion Rates**: Registration to payment conversion
- **Revenue Analytics**: Revenue per user and lifetime value
- **Content Success**: AI generation success/failure rates

## 🛡️ Security & Privacy

### Data Protection
- **Encrypted Storage**: All analytics data encrypted at rest
- **Role-Based Access**: Only ADMIN/SUPER_ADMIN roles can access
- **Audit Logging**: All admin analytics access is logged
- **Data Retention**: Configurable retention policies

### Privacy Compliance
- **Anonymization Options**: Personal data can be anonymized
- **GDPR Compliance**: Right to deletion and data portability
- **Access Controls**: Granular permission system
- **Data Minimization**: Only necessary data is collected

## 📊 Database Schema

### Key Tables for Analytics:
```sql
-- Complete audit trail
audit_logs (id, userId, action, entityType, metadata, ipAddress, createdAt)

-- User information
users (id, email, firstName, lastName, role, credits, subscriptionType)

-- Payment tracking
payments (id, userId, amount, status, razorpayOrderId, createdAt)

-- AI generation jobs
processing_jobs (id, userId, type, status, creditsUsed, createdAt)

-- Email notifications
email_notifications (id, userId, template, status, sentAt)

-- Content moderation
audit_logs WHERE action = 'content.violation_detected'
```

## 🎯 Admin Dashboard Capabilities

### User Management
- **Individual User Deep Dive**: Complete user activity analysis
- **Bulk User Operations**: Mass user management with analytics
- **Risk-Based Monitoring**: Focus on high-risk users
- **Behavior Pattern Detection**: Identify unusual activity patterns

### System Monitoring
- **Real-Time Activity**: Live feed of all user actions
- **Performance Tracking**: System response times and error rates
- **Usage Analytics**: Feature adoption and user engagement
- **Revenue Monitoring**: Financial performance and trends

### Content Moderation
- **Violation Tracking**: Real-time policy violation monitoring
- **Risk Assessment**: Automated content risk scoring
- **User Violation History**: Complete violation timeline per user
- **Moderation Statistics**: System-wide moderation effectiveness

## 🚀 Benefits for Admins

### Operational Efficiency
- **Proactive Monitoring**: Identify issues before they escalate
- **Data-Driven Decisions**: Analytics-backed administrative actions
- **Automated Alerts**: Real-time notifications for critical events
- **Performance Optimization**: Identify and resolve bottlenecks

### User Experience
- **Personalized Support**: Understand individual user needs
- **Behavior Analysis**: Optimize features based on usage patterns
- **Risk Mitigation**: Prevent abuse and policy violations
- **Quality Assurance**: Monitor and improve service quality

### Business Intelligence
- **Revenue Optimization**: Identify high-value user segments
- **Growth Analytics**: Track user acquisition and retention
- **Market Insights**: Understand user preferences and trends
- **Competitive Analysis**: Benchmark performance metrics

## 📋 Implementation Status

✅ **Completed:**
- UserAnalyticsService with comprehensive analytics methods
- Admin controller endpoints for all analytics features
- Database schema with complete audit logging
- Real-time activity tracking and risk assessment
- User segmentation and behavior analysis
- Top users identification by various metrics

✅ **Ready for Use:**
- All analytics endpoints are functional
- Database stores all required tracking data
- Admin dashboard can access detailed user insights
- Real-time monitoring capabilities active
- Content moderation analytics integrated

## 🔧 Usage Examples

### Get User Activity Summary
```bash
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/api/admin/analytics/user/user123
```

### Monitor System Activity
```bash
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/api/admin/analytics/system-overview
```

### Track Top Spenders
```bash
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/api/admin/analytics/top-users/payments?limit=10
```

The ReAlign admin analytics system provides comprehensive user activity monitoring with real-time insights, risk assessment, and detailed behavioral analytics for effective system administration and user management. 