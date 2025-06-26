#!/bin/bash

echo "🔧 Fixing Prisma model names throughout the codebase..."

# Fix user -> users
echo "Fixing user -> users..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.user\./prismaService.users./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/this\.prisma\.user\./this.prisma.users./g' {} \;

# Fix payment -> payments
echo "Fixing payment -> payments..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.payment\./prismaService.payments./g' {} \;

# Fix auditLog -> audit_logs
echo "Fixing auditLog -> audit_logs..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.auditLog\./prismaService.audit_logs./g' {} \;

# Fix processingJob -> processing_jobs
echo "Fixing processingJob -> processing_jobs..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.processingJob\./prismaService.processing_jobs./g' {} \;

# Fix avatarGeneration -> avatar_generations
echo "Fixing avatarGeneration -> avatar_generations..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.avatarGeneration\./prismaService.avatar_generations./g' {} \;

# Fix subscription -> subscriptions
echo "Fixing subscription -> subscriptions..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.subscription\./prismaService.subscriptions./g' {} \;

# Fix avatarCustomization -> avatar_customizations
echo "Fixing avatarCustomization -> avatar_customizations..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.avatarCustomization\./prismaService.avatar_customizations./g' {} \;

# Fix emailNotification -> email_notifications
echo "Fixing emailNotification -> email_notifications..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.emailNotification\./prismaService.email_notifications./g' {} \;

# Fix wearableItem -> wearable_items
echo "Fixing wearableItem -> wearable_items..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.wearableItem\./prismaService.wearable_items./g' {} \;

echo "✅ All Prisma model names have been fixed!"
echo "�� Running TypeScript build to verify fixes..."

npm run build

if [ $? -eq 0 ]; then
    echo "🎉 Build successful! All TypeScript errors fixed."
else
    echo "❌ Build failed. Some issues may remain."
fi
