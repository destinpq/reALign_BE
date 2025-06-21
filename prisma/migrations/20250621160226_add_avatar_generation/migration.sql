-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'PREMIUM', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');

-- CreateEnum
CREATE TYPE "Fit" AS ENUM ('SLIM', 'REGULAR', 'LOOSE');

-- CreateEnum
CREATE TYPE "CustomizationStatus" AS ENUM ('DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingType" AS ENUM ('HEADSHOT_GENERATION', 'AVATAR_GENERATION', 'AVATAR_CUSTOMIZATION', 'BACKGROUND_REMOVAL', 'IMAGE_ENHANCEMENT');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('API', 'WEBHOOK', 'ADMIN_PANEL', 'SYSTEM', 'CRON_JOB');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PAYMENT', 'REFUND', 'PARTIAL_REFUND', 'CREDIT_PURCHASE', 'CREDIT_USAGE', 'CREDIT_REFUND', 'CREDIT_TRANSFER', 'CREDIT_EXPIRY', 'BONUS_CREDIT', 'REFERRAL_BONUS', 'PROMOTIONAL_CREDIT', 'ADMIN_CREDIT_ADJUSTMENT', 'SUBSCRIPTION', 'SUBSCRIPTION_RENEWAL', 'SUBSCRIPTION_UPGRADE', 'SUBSCRIPTION_DOWNGRADE', 'SUBSCRIPTION_REFUND', 'SUBSCRIPTION_PRORATION', 'HEADSHOT_GENERATION', 'AVATAR_CUSTOMIZATION', 'PREMIUM_FEATURE', 'BULK_PROCESSING', 'PLATFORM_FEE', 'GATEWAY_FEE', 'SERVICE_FEE', 'PROCESSING_FEE', 'ADJUSTMENT', 'CORRECTION', 'RECONCILIATION', 'CHARGEBACK', 'DISPUTE', 'DISPUTE_RESOLUTION', 'SETTLEMENT', 'PAYOUT', 'WITHDRAWAL', 'TRANSFER', 'GIFT_CARD', 'VOUCHER', 'CASHBACK', 'LOYALTY_POINTS', 'AFFILIATE_COMMISSION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'QUEUED', 'PROCESSING', 'AUTHORIZING', 'AUTHORIZED', 'AUTHORIZATION_FAILED', 'CAPTURING', 'CAPTURED', 'CAPTURE_FAILED', 'COMPLETED', 'SETTLED', 'CONFIRMED', 'FAILED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'TIMEOUT', 'REJECTED', 'ABANDONED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REFUND_PENDING', 'REFUND_FAILED', 'DISPUTED', 'CHARGEBACK', 'CHARGEBACK_RESOLVED', 'UNDER_REVIEW', 'FLAGGED', 'APPROVED', 'BLOCKED', 'PENDING_SETTLEMENT', 'SETTLEMENT_FAILED', 'RETRY', 'RETRY_FAILED', 'ON_HOLD', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TransactionEventType" AS ENUM ('INITIATED', 'SUBMITTED', 'QUEUED', 'STARTED', 'AUTHORIZED', 'CAPTURED', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'VALIDATION_STARTED', 'VALIDATION_PASSED', 'VALIDATION_FAILED', 'FRAUD_CHECK_STARTED', 'FRAUD_CHECK_PASSED', 'FRAUD_CHECK_FAILED', 'PAYMENT_PROCESSING', 'GATEWAY_REQUEST_SENT', 'GATEWAY_RESPONSE_RECEIVED', 'STATUS_UPDATED', 'AMOUNT_UPDATED', 'METADATA_UPDATED', 'REFUND_INITIATED', 'REFUND_PROCESSED', 'REFUND_COMPLETED', 'REFUND_FAILED', 'DISPUTE_CREATED', 'DISPUTE_UPDATED', 'CHARGEBACK_RECEIVED', 'DISPUTE_RESOLVED', 'SETTLEMENT_INITIATED', 'SETTLEMENT_COMPLETED', 'SETTLEMENT_FAILED', 'PAYOUT_PROCESSED', 'WEBHOOK_SENT', 'WEBHOOK_RECEIVED', 'NOTIFICATION_SENT', 'EMAIL_SENT', 'SMS_SENT', 'RETRY_ATTEMPTED', 'RETRY_SCHEDULED', 'RETRY_FAILED', 'MAX_RETRIES_REACHED', 'ADMIN_REVIEW_STARTED', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'ADMIN_NOTE_ADDED', 'MANUAL_INTERVENTION', 'SYSTEM_ERROR', 'TIMEOUT_OCCURRED', 'CONNECTION_FAILED', 'RATE_LIMIT_HIT', 'USER_ACTION', 'USER_CANCELLED', 'USER_ABANDONED', 'THIRD_PARTY_CALLBACK', 'API_REQUEST', 'API_RESPONSE', 'DATA_EXPORTED', 'REPORT_GENERATED', 'COMPLIANCE_CHECK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "credits" INTEGER NOT NULL DEFAULT 0,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "subscriptionType" "SubscriptionType" NOT NULL DEFAULT 'FREE',
    "subscriptionEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SubscriptionType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethod" TEXT,
    "razorpaySubscriptionId" TEXT,
    "creditsIncluded" INTEGER NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpayOrderId" TEXT,
    "razorpaySignature" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "description" TEXT,
    "failureReason" TEXT,
    "creditsAwarded" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar_generations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userImage" TEXT NOT NULL,
    "selectedWearables" JSONB NOT NULL,
    "selectedScenery" TEXT NOT NULL,
    "userDetails" JSONB NOT NULL,
    "generatedPrompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentId" TEXT,
    "generatedImageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatar_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wearable_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "hasImage" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "style" TEXT,
    "color" TEXT,
    "material" TEXT,
    "season" TEXT,
    "occasion" TEXT,
    "size" TEXT NOT NULL DEFAULT 'ONE_SIZE',
    "fit" TEXT NOT NULL DEFAULT 'REGULAR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wearable_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_wearable_selections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wearableItemId" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_wearable_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar_customizations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "colorName" TEXT,
    "size" "Size",
    "fit" "Fit",
    "customAttributes" JSONB,
    "status" "CustomizationStatus" NOT NULL DEFAULT 'DRAFT',
    "processingJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatar_customizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageBlob" BYTEA,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "generatedFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ProcessingType" NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "inputData" JSONB,
    "outputData" JSONB,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" "AuditSource" NOT NULL DEFAULT 'API',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "templateData" JSONB,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "webhookEndpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "httpStatus" INTEGER,
    "response" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "userId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "paymentGateway" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "gatewaySignature" TEXT,
    "gatewayResponse" JSONB,
    "description" TEXT,
    "notes" JSONB,
    "metadata" JSONB,
    "internalNotes" TEXT,
    "creditsAwarded" INTEGER DEFAULT 0,
    "creditsUsed" INTEGER DEFAULT 0,
    "creditBalance" INTEGER,
    "creditPackage" TEXT,
    "platformFee" DOUBLE PRECISION DEFAULT 0,
    "gatewayFee" DOUBLE PRECISION DEFAULT 0,
    "taxes" DOUBLE PRECISION DEFAULT 0,
    "gst" DOUBLE PRECISION DEFAULT 0,
    "serviceTax" DOUBLE PRECISION DEFAULT 0,
    "processingFee" DOUBLE PRECISION DEFAULT 0,
    "netAmount" DOUBLE PRECISION,
    "refundAmount" DOUBLE PRECISION DEFAULT 0,
    "refundReason" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundedBy" TEXT,
    "parentTransactionId" TEXT,
    "isRefundable" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionId" TEXT,
    "subscriptionPeriod" TEXT,
    "subscriptionCycle" INTEGER,
    "source" TEXT,
    "channel" TEXT,
    "campaign" TEXT,
    "medium" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "location" JSONB,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "processedAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "errorCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "riskScore" DOUBLE PRECISION,
    "fraudFlags" TEXT[],
    "isHighRisk" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "supportTicketId" TEXT,
    "customerNotes" TEXT,
    "disputeId" TEXT,
    "disputeReason" TEXT,
    "disputeStatus" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_events" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "eventType" "TransactionEventType" NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "source" TEXT,
    "triggeredBy" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_analytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hour" INTEGER,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "successfulTransactions" INTEGER NOT NULL DEFAULT 0,
    "failedTransactions" INTEGER NOT NULL DEFAULT 0,
    "pendingTransactions" INTEGER NOT NULL DEFAULT 0,
    "cancelledTransactions" INTEGER NOT NULL DEFAULT 0,
    "refundedTransactions" INTEGER NOT NULL DEFAULT 0,
    "disputedTransactions" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successfulAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disputedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "razorpayTransactions" INTEGER NOT NULL DEFAULT 0,
    "razorpayAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "razorpayFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stripeTransactions" INTEGER NOT NULL DEFAULT 0,
    "stripeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stripeFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGatewayFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPlatformFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTaxes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProcessingFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditsAwarded" INTEGER NOT NULL DEFAULT 0,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "creditTransactions" INTEGER NOT NULL DEFAULT 0,
    "creditRefunds" INTEGER NOT NULL DEFAULT 0,
    "bonusCreditsAwarded" INTEGER NOT NULL DEFAULT 0,
    "subscriptionPayments" INTEGER NOT NULL DEFAULT 0,
    "subscriptionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "renewalSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "upgrades" INTEGER NOT NULL DEFAULT 0,
    "downgrades" INTEGER NOT NULL DEFAULT 0,
    "cancellations" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "returningUsers" INTEGER NOT NULL DEFAULT 0,
    "highValueUsers" INTEGER NOT NULL DEFAULT 0,
    "domesticTransactions" INTEGER NOT NULL DEFAULT 0,
    "internationalTransactions" INTEGER NOT NULL DEFAULT 0,
    "topCountries" JSONB,
    "topStates" JSONB,
    "averageTransactionTime" DOUBLE PRECISION,
    "successRate" DOUBLE PRECISION,
    "failureRate" DOUBLE PRECISION,
    "averageTransactionValue" DOUBLE PRECISION,
    "highRiskTransactions" INTEGER NOT NULL DEFAULT 0,
    "fraudAttempts" INTEGER NOT NULL DEFAULT 0,
    "blockedTransactions" INTEGER NOT NULL DEFAULT 0,
    "reviewedTransactions" INTEGER NOT NULL DEFAULT 0,
    "webTransactions" INTEGER NOT NULL DEFAULT 0,
    "mobileTransactions" INTEGER NOT NULL DEFAULT 0,
    "apiTransactions" INTEGER NOT NULL DEFAULT 0,
    "adminTransactions" INTEGER NOT NULL DEFAULT 0,
    "desktopTransactions" INTEGER NOT NULL DEFAULT 0,
    "mobileDeviceTransactions" INTEGER NOT NULL DEFAULT 0,
    "tabletTransactions" INTEGER NOT NULL DEFAULT 0,
    "peakHour" INTEGER,
    "peakHourVolume" INTEGER,
    "offPeakVolume" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentCount" INTEGER NOT NULL DEFAULT 0,
    "paymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundCount" INTEGER NOT NULL DEFAULT 0,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditCount" INTEGER NOT NULL DEFAULT 0,
    "creditAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageTransactionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "largestTransaction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "smallestTransaction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_razorpaySubscriptionId_key" ON "subscriptions"("razorpaySubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayPaymentId_key" ON "payments"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayOrderId_key" ON "payments"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "avatar_generations_sessionId_key" ON "avatar_generations"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_wearable_selections_userId_wearableItemId_key" ON "user_wearable_selections"("userId", "wearableItemId");

-- CreateIndex
CREATE UNIQUE INDEX "avatar_customizations_processingJobId_key" ON "avatar_customizations"("processingJobId");

-- CreateIndex
CREATE UNIQUE INDEX "photos_s3Key_key" ON "photos"("s3Key");

-- CreateIndex
CREATE UNIQUE INDEX "processing_jobs_externalId_key" ON "processing_jobs"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transactionId_key" ON "transactions"("transactionId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_transactionId_idx" ON "transactions"("transactionId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_paymentGateway_idx" ON "transactions"("paymentGateway");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_processedAt_idx" ON "transactions"("processedAt");

-- CreateIndex
CREATE INDEX "transactions_amount_idx" ON "transactions"("amount");

-- CreateIndex
CREATE INDEX "transactions_currency_idx" ON "transactions"("currency");

-- CreateIndex
CREATE INDEX "transactions_source_idx" ON "transactions"("source");

-- CreateIndex
CREATE INDEX "transactions_country_idx" ON "transactions"("country");

-- CreateIndex
CREATE INDEX "transactions_riskScore_idx" ON "transactions"("riskScore");

-- CreateIndex
CREATE INDEX "transactions_isHighRisk_idx" ON "transactions"("isHighRisk");

-- CreateIndex
CREATE INDEX "transactions_subscriptionId_idx" ON "transactions"("subscriptionId");

-- CreateIndex
CREATE INDEX "transactions_parentTransactionId_idx" ON "transactions"("parentTransactionId");

-- CreateIndex
CREATE INDEX "transaction_events_transactionId_idx" ON "transaction_events"("transactionId");

-- CreateIndex
CREATE INDEX "transaction_events_eventType_idx" ON "transaction_events"("eventType");

-- CreateIndex
CREATE INDEX "transaction_events_createdAt_idx" ON "transaction_events"("createdAt");

-- CreateIndex
CREATE INDEX "transaction_events_status_idx" ON "transaction_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_analytics_date_key" ON "transaction_analytics"("date");

-- CreateIndex
CREATE INDEX "transaction_analytics_date_idx" ON "transaction_analytics"("date");

-- CreateIndex
CREATE INDEX "transaction_analytics_hour_idx" ON "transaction_analytics"("hour");

-- CreateIndex
CREATE INDEX "transaction_summaries_userId_idx" ON "transaction_summaries"("userId");

-- CreateIndex
CREATE INDEX "transaction_summaries_period_idx" ON "transaction_summaries"("period");

-- CreateIndex
CREATE INDEX "transaction_summaries_startDate_idx" ON "transaction_summaries"("startDate");

-- CreateIndex
CREATE INDEX "transaction_summaries_endDate_idx" ON "transaction_summaries"("endDate");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wearable_selections" ADD CONSTRAINT "user_wearable_selections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wearable_selections" ADD CONSTRAINT "user_wearable_selections_wearableItemId_fkey" FOREIGN KEY ("wearableItemId") REFERENCES "wearable_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avatar_customizations" ADD CONSTRAINT "avatar_customizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avatar_customizations" ADD CONSTRAINT "avatar_customizations_processingJobId_fkey" FOREIGN KEY ("processingJobId") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_payment_fkey" FOREIGN KEY ("entityId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_processing_job_fkey" FOREIGN KEY ("entityId") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_transaction_fkey" FOREIGN KEY ("entityId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transaction_payment_fkey" FOREIGN KEY ("entityId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_summaries" ADD CONSTRAINT "transaction_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
