#!/bin/bash

echo "🔧 COMPLETE PRISMA MODEL FIXES..."

# 1. Fix all create operations to remove id and updatedAt (use UncheckedCreateInput)
echo "📝 Fixing create operations..."

# Remove id and updatedAt from all create data objects
find src -name "*.ts" -exec sed -i '' '/data: {/,/}/ {
  /id: [^,}]*,/d
  /updatedAt: [^,}]*,/d
  /createdAt: [^,}]*,/d
}' {} \;

# 2. Fix Razorpay configuration issues
echo "🔑 Fixing Razorpay configuration..."

# Fix key_ issues in Razorpay services
find src -name "*.ts" -exec sed -i '' 's/key_/key_id/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/plan_/plan_id/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/customer_/customer_id/g' {} \;

# 3. Fix controller method issues
echo "🎮 Fixing controller methods..."

# Fix missing @Post decorators and method signatures
cat > controller_fixes.sed << 'EOF'
# Fix storePaymentData method
s/async storePaymentData(/@Post('store-payment-data')\n  async storePaymentData(/g

# Fix getAvatarGeneration method  
s/async getAvatarGeneration(/@Get('avatar-generation\/:sessionId')\n  async getAvatarGeneration(/g

# Fix verifyPaymentStatus method
s/async verifyPaymentStatus(/@Get('verify\/:paymentId')\n  async verifyPaymentStatus(/g

# Fix checkPaymentStatus method
s/async checkPaymentStatus(/@Get('check-status')\n  async checkPaymentStatus(/g
EOF

find src -name "*.controller.ts" -exec sed -i '' -f controller_fixes.sed {} \;
rm controller_fixes.sed

# 4. Fix missing parameter issues in controllers
echo "🔧 Fixing parameter issues..."

# Fix missing id parameters in controllers
find src -name "*.controller.ts" -exec sed -i '' 's/@Param.*id.*: string/@Param("id") id: string/g' {} \;

# 5. Fix service method signatures
echo "⚙️ Fixing service methods..."

# Fix photos service method signatures
sed -i '' 's/async update(userId: string, updatePhotoDto: UpdatePhotoDto)/async update(userId: string, id: string, updatePhotoDto: UpdatePhotoDto)/g' src/modules/photos/photos.service.ts
sed -i '' 's/async remove(userId: string)/async remove(userId: string, id: string)/g' src/modules/photos/photos.service.ts

# Fix wearables service method signatures  
sed -i '' 's/async update(updateWearableDto: UpdateWearableDto)/async update(id: string, updateWearableDto: UpdateWearableDto)/g' src/modules/wearables/wearables.service.ts

# 6. Fix missing include relationships
echo "🔗 Fixing include relationships..."

# Fix events relationship
find src -name "*.ts" -exec sed -i '' 's/events: {/transaction_events: {/g' {} \;

echo "✅ COMPLETE PRISMA MODEL FIXES APPLIED!" 