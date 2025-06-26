#!/bin/bash

echo "🔧 Reverting incorrect changes and applying correct Prisma model names..."

# First revert the incorrect changes
echo "Reverting incorrect changes..."
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.users\./prismaService.user./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/this\.prisma\.users\./this.prisma.user./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.payments\./prismaService.payment./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.audit_logs\./prismaService.auditLog./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.processing_jobs\./prismaService.processingJob./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.avatar_generations\./prismaService.avatarGeneration./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.subscriptions\./prismaService.subscription./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.avatar_customizations\./prismaService.avatarCustomization./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.email_notifications\./prismaService.emailNotification./g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/prismaService\.wearable_items\./prismaService.wearableItem./g' {} \;

echo "✅ All incorrect changes have been reverted!"
echo "🔨 Running TypeScript build to verify fixes..."

npm run build

if [ $? -eq 0 ]; then
    echo "🎉 Build successful! All TypeScript errors fixed."
else
    echo "❌ Build failed. Some issues may remain."
fi
