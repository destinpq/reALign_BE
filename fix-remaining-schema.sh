#!/bin/bash

echo "🔧 FIXING REMAINING PRISMA SCHEMA ISSUES..."

# Fix updatedAt fields that don't have @updatedAt
sed -i '' 's/updatedAt         DateTime$/updatedAt         DateTime @updatedAt/g' prisma/schema.prisma
sed -i '' 's/updatedAt        DateTime$/updatedAt        DateTime @updatedAt/g' prisma/schema.prisma
sed -i '' 's/updatedAt    DateTime$/updatedAt    DateTime @updatedAt/g' prisma/schema.prisma
sed -i '' 's/updatedAt DateTime$/updatedAt DateTime @updatedAt/g' prisma/schema.prisma

echo "✅ Remaining schema fixes applied!"
echo "🔄 Regenerating Prisma client..."

npx prisma generate

echo "🚀 Schema completely fixed!" 