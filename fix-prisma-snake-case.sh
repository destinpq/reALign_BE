#!/bin/bash

echo "🔧 FIXING ALL PRISMA MODEL REFERENCES TO USE SNAKE_CASE..."

# Fix user -> users (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.user\./prismaService.users./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.user\./this.prisma.users./g' {} \;

# Fix payment -> payments (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.payment\./prismaService.payments./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.payment\./this.prisma.payments./g' {} \;

# Fix processingJob -> processing_jobs (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.processingJob\./prismaService.processing_jobs./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.processingJob\./this.prisma.processing_jobs./g' {} \;

# Fix auditLog -> audit_logs (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.auditLog\./prismaService.audit_logs./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.auditLog\./this.prisma.audit_logs./g' {} \;

# Fix avatarCustomization -> avatar_customizations (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.avatarCustomization\./prismaService.avatar_customizations./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.avatarCustomization\./this.prisma.avatar_customizations./g' {} \;

# Fix emailNotification -> email_notifications (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.emailNotification\./prismaService.email_notifications./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.emailNotification\./this.prisma.email_notifications./g' {} \;

# Fix avatarGeneration -> avatar_generations (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.avatarGeneration\./prismaService.avatar_generations./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.avatarGeneration\./this.prisma.avatar_generations./g' {} \;

# Fix subscription -> subscriptions (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.subscription\./prismaService.subscriptions./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.subscription\./this.prisma.subscriptions./g' {} \;

# Fix wearableItem -> wearable_items (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.wearableItem\./prismaService.wearable_items./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.wearableItem\./this.prisma.wearable_items./g' {} \;

# Fix userWearableSelection -> user_wearable_selections (snake_case)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.userWearableSelection\./prismaService.user_wearable_selections./g' {} \;
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.userWearableSelection\./this.prisma.user_wearable_selections./g' {} \;

# Fix photo -> photos (snake_case)
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.photo\./this.prisma.photos./g' {} \;

# Fix transaction -> transactions (snake_case)
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.transaction\./this.prisma.transactions./g' {} \;

# Fix transactionEvent -> transaction_events (snake_case)
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.transactionEvent\./this.prisma.transaction_events./g' {} \;

# Fix transactionAnalytics -> transaction_analytics (snake_case)
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.transactionAnalytics\./this.prisma.transaction_analytics./g' {} \;

# Fix webhookEndpoint -> webhook_endpoints (snake_case)
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.webhookEndpoint\./this.prisma.webhook_endpoints./g' {} \;

# Fix webhookDelivery -> webhook_deliveries (snake_case)
find src -name "*.ts" -exec sed -i '' 's/this\.prisma\.webhookDelivery\./this.prisma.webhook_deliveries./g' {} \;

echo "✅ ALL PRISMA MODEL REFERENCES FIXED TO USE SNAKE_CASE!"
echo "🔍 Verifying no camelCase references remain..."

# Check for any remaining camelCase references
if grep -r "prismaService\.\|this\.prisma\." src/ | grep -E "(\.user\.|\.payment\.|\.processingJob\.|\.auditLog\.|\.avatarCustomization\.|\.emailNotification\.|\.avatarGeneration\.|\.subscription\.|\.wearableItem\.|\.userWearableSelection\.|\.photo\.|\.transaction\.|\.transactionEvent\.|\.transactionAnalytics\.|\.webhookEndpoint\.|\.webhookDelivery\.)"; then
    echo "❌ Found remaining camelCase references!"
else
    echo "✅ No camelCase references found!"
fi

echo "🎉 SNAKE_CASE PRISMA MODEL FIX COMPLETE!" 