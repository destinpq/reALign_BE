#!/bin/bash

echo "🔧 Fixing ALL Prisma model references..."

# Fix user -> users
find src -name "*.ts" -exec sed -i '' 's/prismaService\.user\./prismaService.users./g' {} \;

# Fix payment -> payments  
find src -name "*.ts" -exec sed -i '' 's/prismaService\.payment\./prismaService.payments./g' {} \;

# Fix processingJob -> processing_jobs
find src -name "*.ts" -exec sed -i '' 's/prismaService\.processingJob\./prismaService.processing_jobs./g' {} \;

# Fix auditLog -> audit_logs
find src -name "*.ts" -exec sed -i '' 's/prismaService\.auditLog\./prismaService.audit_logs./g' {} \;

# Fix avatarCustomization -> avatar_customizations
find src -name "*.ts" -exec sed -i '' 's/prismaService\.avatarCustomization\./prismaService.avatar_customizations./g' {} \;

# Fix emailNotification -> email_notifications
find src -name "*.ts" -exec sed -i '' 's/prismaService\.emailNotification\./prismaService.email_notifications./g' {} \;

# Fix avatarGeneration -> avatar_generations
find src -name "*.ts" -exec sed -i '' 's/prismaService\.avatarGeneration\./prismaService.avatar_generations./g' {} \;

# Fix subscription -> subscriptions
find src -name "*.ts" -exec sed -i '' 's/prismaService\.subscription\./prismaService.subscriptions./g' {} \;

# Fix wearableItem -> wearable_items
find src -name "*.ts" -exec sed -i '' 's/prismaService\.wearableItem\./prismaService.wearable_items./g' {} \;

# Fix sceneryItem -> scenery_items
find src -name "*.ts" -exec sed -i '' 's/prismaService\.sceneryItem\./prismaService.scenery_items./g' {} \;

# Fix userSubscription -> user_subscriptions
find src -name "*.ts" -exec sed -i '' 's/prismaService\.userSubscription\./prismaService.user_subscriptions./g' {} \;

# Fix photoUpload -> photo_uploads
find src -name "*.ts" -exec sed -i '' 's/prismaService\.photoUpload\./prismaService.photo_uploads./g' {} \;

echo "✅ All Prisma model references fixed!"
echo "🔍 Checking for any remaining issues..."

# Check for any remaining incorrect model names
echo "Remaining 'user.' references:"
grep -r "prismaService\.user\." src/ || echo "None found ✅"

echo "Remaining 'payment.' references:"
grep -r "prismaService\.payment\." src/ || echo "None found ✅"

echo "Remaining 'processingJob.' references:"
grep -r "prismaService\.processingJob\." src/ || echo "None found ✅"

echo "Remaining 'auditLog.' references:"
grep -r "prismaService\.auditLog\." src/ || echo "None found ✅"

echo "🎉 Prisma model fix complete!" 