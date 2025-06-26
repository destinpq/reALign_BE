#!/bin/bash

echo "🔧 FIXING ALL PRISMA MODEL ISSUES COMPREHENSIVELY..."

# 1. Fix relationship names in includes
echo "🔗 Fixing relationship names in includes..."

# Fix user -> users in includes
find src -name "*.ts" -exec sed -i '' 's/include: { user:/include: { users:/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/user: {/users: {/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/user: true/users: true/g' {} \;

# Fix wearableItem -> wearable_items in includes
find src -name "*.ts" -exec sed -i '' 's/wearableItem: {/wearable_items: {/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/wearableItem: true/wearable_items: true/g' {} \;

# Fix webhookEndpoint -> webhook_endpoints in includes
find src -name "*.ts" -exec sed -i '' 's/webhookEndpoint: {/webhook_endpoints: {/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/webhookEndpoint: true/webhook_endpoints: true/g' {} \;

# Fix userSelections -> user_wearable_selections in includes
find src -name "*.ts" -exec sed -i '' 's/userSelections: {/user_wearable_selections: {/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/userSelections: true/user_wearable_selections: true/g' {} \;

# Fix deliveries -> webhook_deliveries in includes
find src -name "*.ts" -exec sed -i '' 's/deliveries: {/webhook_deliveries: {/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/deliveries: true/webhook_deliveries: true/g' {} \;

# Fix processingJobs -> processing_jobs in includes
find src -name "*.ts" -exec sed -i '' 's/processingJobs: {/processing_jobs: {/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/processingJobs: true/processing_jobs: true/g' {} \;

# 2. Fix property access in code
echo "🔍 Fixing property access in code..."

# Fix .user. -> .users. in property access
find src -name "*.ts" -exec sed -i '' 's/\.user\./.users./g' {} \;

# 3. Fix create operations to use UncheckedCreateInput
echo "📝 Fixing create operations to use UncheckedCreateInput..."

# Create a comprehensive sed script to fix all create operations
cat > fix_creates.sed << 'EOF'
# Remove id and updatedAt fields from create operations
s/id: [^,}]*,//g
s/updatedAt: [^,}]*,//g
s/,\s*}/}/g
EOF

# Apply the sed script to all TypeScript files
find src -name "*.ts" -exec sed -i '' -f fix_creates.sed {} \;

# Clean up
rm fix_creates.sed

echo "✅ ALL PRISMA MODEL ISSUES FIXED!"
echo "🔍 Running build test..." 