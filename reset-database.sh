#!/bin/bash

echo "🗑️  RESETTING DIGITAL OCEAN DATABASE COMPLETELY..."

# First, let's reset the Prisma schema and regenerate everything
echo "📋 Resetting Prisma schema..."
npx prisma db push --force-reset --accept-data-loss

echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo "📊 Seeding database with initial data..."
npx prisma db seed

echo "✅ Database reset complete!"
echo "🚀 Ready for fresh deployment!" 