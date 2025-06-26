#!/bin/bash

echo "🔧 FIXING PRISMA MODEL REFERENCES WITH CORRECT NAMES..."

# Revert the wrong snake_case changes back to camelCase
echo "🔄 Reverting incorrect snake_case changes..."

# Fix users -> user (correct camelCase)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.users\./prismaService.user./g' {} \;

# Fix payments -> payment (correct camelCase)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.payments\./prismaService.payment./g' {} \;

# Fix processing_jobs -> processingJob (correct camelCase)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.processing_jobs\./prismaService.processingJob./g' {} \;

# Fix audit_logs -> auditLog (correct camelCase)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.audit_logs\./prismaService.auditLog./g' {} \;

# Fix avatar_customizations -> avatarCustomization (correct camelCase)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.avatar_customizations\./prismaService.avatarCustomization./g' {} \;

# Fix email_notifications -> emailNotification (correct camelCase)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.email_notifications\./prismaService.emailNotification./g' {} \;

# Fix avatar_generations -> avatarGeneration (correct camelCase)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.avatar_generations\./prismaService.avatarGeneration./g' {} \;

# Fix subscriptions -> subscription (correct camelCase)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.subscriptions\./prismaService.subscription./g' {} \;

# Fix wearable_items -> wearableItem (correct camelCase)
find src -name "*.ts" -exec sed -i '' 's/prismaService\.wearable_items\./prismaService.wearableItem./g' {} \;

echo "✅ All Prisma model references fixed with correct camelCase names!"
echo "🔍 Verifying fixes..."

# Verify no incorrect references remain
echo "Checking for any remaining incorrect references..."
grep -r "prismaService\." src/ | grep -E "(users\.|payments\.|processing_jobs\.|audit_logs\.|avatar_customizations\.|email_notifications\.|avatar_generations\.|subscriptions\.|wearable_items\.)" || echo "✅ No incorrect references found!"

echo "🎉 Prisma model fix complete with correct camelCase names!" 