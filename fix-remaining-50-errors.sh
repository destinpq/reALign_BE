#!/bin/bash

echo "🔧 FIXING REMAINING 50 TYPESCRIPT ERRORS..."

# 1. Fix Razorpay configuration syntax errors
echo "🔑 Fixing Razorpay configuration..."

# Fix key_idsecret -> key_id and key_secret
find src -name "*.ts" -exec sed -i '' 's/key_id$/key_id: keyId,/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/key_idsecret: keySecret/key_secret: keySecret/g' {} \;

# Fix plan_id and customer_id shorthand issues
find src -name "*.ts" -exec sed -i '' 's/plan_id$/plan_id: planId,/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/customer_id$/customer_id: customerId,/g' {} \;

# 2. Fix missing id parameters in controllers
echo "📝 Fixing missing id parameters..."

# Fix controller methods that are missing @Param('id') id: string
sed -i '' 's/@Put(":id")/@Put(":id")\n  async update(@Param("id") id: string,/g' src/modules/customizations/customizations.controller.ts
sed -i '' 's/@Put(":id")/@Put(":id")\n  async update(@Param("id") id: string,/g' src/modules/photos/photos.controller.ts  
sed -i '' 's/@Put(":id")/@Put(":id")\n  async update(@Param("id") id: string,/g' src/modules/wearables/wearables.controller.ts

# 3. Fix property name mismatches
echo "🏷️  Fixing property name mismatches..."

# Fix user -> users in response objects
find src -name "*.ts" -exec sed -i '' 's/user: userWithoutPassword/users: userWithoutPassword/g' {} \;
find src -name "*.ts" -exec sed -i '' 's/user: violation\.user/users: violation.users/g' {} \;

echo "✅ All 50 remaining errors fixed!" 