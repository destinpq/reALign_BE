#!/bin/bash

echo "🔧 FIXING PRISMA SCHEMA TO ADD AUTO-GENERATION..."

# Backup the original schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Fix all id fields to use cuid() auto-generation
sed -i '' 's/id              String           @id/id              String           @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id               String              @id/id               String              @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id                String   @id/id                String   @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id            String      @id/id            String      @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id                String         @id/id                String         @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id               String   @id/id               String   @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id                    String                 @id/id                    String                 @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id          String   @id/id          String   @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id           String   @id/id           String   @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id                     String             @id/id                     String             @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id                        String   @id/id                        String   @id @default(cuid())/g' prisma/schema.prisma
sed -i '' 's/id            String               @id/id            String               @id @default(cuid())/g' prisma/schema.prisma

# Fix all updatedAt fields to use @updatedAt
sed -i '' 's/updatedAt       DateTime/updatedAt       DateTime         @updatedAt/g' prisma/schema.prisma
sed -i '' 's/updatedAt        DateTime/updatedAt        DateTime         @updatedAt/g' prisma/schema.prisma
sed -i '' 's/updatedAt    DateTime/updatedAt    DateTime             @updatedAt/g' prisma/schema.prisma
sed -i '' 's/updatedAt DateTime/updatedAt DateTime                 @updatedAt/g' prisma/schema.prisma

echo "✅ Prisma schema fixed with auto-generation!"
echo "🔄 Regenerating Prisma client..."

npx prisma generate

echo "🚀 Schema fixes complete!" 