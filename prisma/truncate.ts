import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function truncateDatabase() {
  console.log('🗑️  Starting database truncation...');
  console.log('═══════════════════════════════════════');
  
  try {
    // Get current counts before truncation
    const beforeStats = {
      users: await prisma.user.count(),
      sessions: await prisma.session.count(),
      subscriptions: await prisma.subscription.count(),
      payments: await prisma.payment.count(),
      avatarGenerations: await prisma.avatarGeneration.count(),
      wearableItems: await prisma.wearableItem.count(),
      userWearableSelections: await prisma.userWearableSelection.count(),
      avatarCustomizations: await prisma.avatarCustomization.count(),
      photos: await prisma.photo.count(),
      projects: await prisma.project.count(),
      processingJobs: await prisma.processingJob.count(),
      auditLogs: await prisma.auditLog.count(),
      emailNotifications: await prisma.emailNotification.count(),
      webhookEndpoints: await prisma.webhookEndpoint.count(),
      webhookDeliveries: await prisma.webhookDelivery.count(),
      transactions: await prisma.transaction.count(),
      transactionEvents: await prisma.transactionEvent.count(),
      transactionAnalytics: await prisma.transactionAnalytics.count(),
      transactionSummaries: await prisma.transactionSummary.count(),
    };

    console.log('\n📊 Current Database State:');
    console.log('═══════════════════════════');
    Object.entries(beforeStats).forEach(([key, value]) => {
      if (value > 0) {
        console.log(`${key.padEnd(25)}: ${value.toLocaleString()} records`);
      }
    });

    if (Object.values(beforeStats).every(count => count === 0)) {
      console.log('✅ Database is already empty!');
      return;
    }

    console.log('\n🔄 Truncating tables in dependency order...');
    console.log('═══════════════════════════════════════════');

    // Delete in reverse dependency order to avoid foreign key constraints
    
    // 1. Transaction-related data (most dependent)
    console.log('🗑️  Clearing transaction events...');
    await prisma.transactionEvent.deleteMany({});
    
    console.log('🗑️  Clearing transaction analytics...');
    await prisma.transactionAnalytics.deleteMany({});
    
    console.log('🗑️  Clearing transaction summaries...');
    await prisma.transactionSummary.deleteMany({});
    
    console.log('🗑️  Clearing transactions...');
    await prisma.transaction.deleteMany({});

    // 2. Audit and notification data
    console.log('🗑️  Clearing audit logs...');
    await prisma.auditLog.deleteMany({});
    
    console.log('🗑️  Clearing email notifications...');
    await prisma.emailNotification.deleteMany({});

    // 3. Webhook data
    console.log('🗑️  Clearing webhook deliveries...');
    await prisma.webhookDelivery.deleteMany({});
    
    console.log('🗑️  Clearing webhook endpoints...');
    await prisma.webhookEndpoint.deleteMany({});

    // 4. Processing and customization data
    console.log('🗑️  Clearing avatar customizations...');
    await prisma.avatarCustomization.deleteMany({});
    
    console.log('🗑️  Clearing processing jobs...');
    await prisma.processingJob.deleteMany({});

    // 5. User-generated content
    console.log('🗑️  Clearing photos...');
    await prisma.photo.deleteMany({});
    
    console.log('🗑️  Clearing projects...');
    await prisma.project.deleteMany({});
    
    console.log('🗑️  Clearing avatar generations...');
    await prisma.avatarGeneration.deleteMany({});

    // 6. User selections and relationships
    console.log('🗑️  Clearing user wearable selections...');
    await prisma.userWearableSelection.deleteMany({});

    // 7. Wearable items (independent of users but selected by them)
    console.log('🗑️  Clearing wearable items...');
    await prisma.wearableItem.deleteMany({});

    // 8. Payment and subscription data
    console.log('🗑️  Clearing payments...');
    await prisma.payment.deleteMany({});
    
    console.log('🗑️  Clearing subscriptions...');
    await prisma.subscription.deleteMany({});

    // 9. User sessions
    console.log('🗑️  Clearing user sessions...');
    await prisma.session.deleteMany({});

    // 10. Users (most foundational - delete last)
    console.log('🗑️  Clearing users...');
    await prisma.user.deleteMany({});

    // Verify truncation
    const afterStats = {
      users: await prisma.user.count(),
      sessions: await prisma.session.count(),
      subscriptions: await prisma.subscription.count(),
      payments: await prisma.payment.count(),
      avatarGenerations: await prisma.avatarGeneration.count(),
      wearableItems: await prisma.wearableItem.count(),
      userWearableSelections: await prisma.userWearableSelection.count(),
      avatarCustomizations: await prisma.avatarCustomization.count(),
      photos: await prisma.photo.count(),
      projects: await prisma.project.count(),
      processingJobs: await prisma.processingJob.count(),
      auditLogs: await prisma.auditLog.count(),
      emailNotifications: await prisma.emailNotification.count(),
      webhookEndpoints: await prisma.webhookEndpoint.count(),
      webhookDeliveries: await prisma.webhookDelivery.count(),
      transactions: await prisma.transaction.count(),
      transactionEvents: await prisma.transactionEvent.count(),
      transactionAnalytics: await prisma.transactionAnalytics.count(),
      transactionSummaries: await prisma.transactionSummary.count(),
    };

    console.log('\n✅ Truncation Summary:');
    console.log('═══════════════════════');
    
    let totalDeleted = 0;
    Object.entries(beforeStats).forEach(([key, beforeCount]) => {
      const afterCount = afterStats[key as keyof typeof afterStats];
      const deleted = beforeCount - afterCount;
      if (deleted > 0) {
        console.log(`${key.padEnd(25)}: ${deleted.toLocaleString()} records deleted`);
        totalDeleted += deleted;
      }
    });

    if (totalDeleted === 0) {
      console.log('No records were deleted (database was already empty)');
    } else {
      console.log(`${'TOTAL'.padEnd(25)}: ${totalDeleted.toLocaleString()} records deleted`);
    }

    // Verify database is empty
    const remainingRecords = Object.values(afterStats).reduce((sum, count) => sum + count, 0);
    if (remainingRecords === 0) {
      console.log('\n🎉 Database successfully truncated!');
      console.log('✅ All tables are now empty and ready for fresh data');
    } else {
      console.log(`\n⚠️  Warning: ${remainingRecords} records remain in database`);
    }

  } catch (error) {
    console.error('❌ Error during database truncation:', error);
    throw error;
  }
}

async function confirmTruncation(): Promise<boolean> {
  // In a real environment, you might want to add interactive confirmation
  // For now, we'll add a safety check based on environment
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    console.error('🚨 DANGER: Attempting to truncate PRODUCTION database!');
    console.error('This operation is not allowed in production environment.');
    console.error('Please set NODE_ENV to "development" or "test" to proceed.');
    return false;
  }

  // Check if there's a --force flag
  const forceFlag = process.argv.includes('--force');
  if (!forceFlag) {
    console.log('⚠️  This will permanently delete ALL data in the database!');
    console.log('💡 Use --force flag to proceed: npm run db:truncate -- --force');
    return false;
  }

  return true;
}

async function main() {
  try {
    console.log('🔍 Database Truncation Tool');
    console.log('═══════════════════════════');
    
    const shouldProceed = await confirmTruncation();
    if (!shouldProceed) {
      console.log('❌ Truncation cancelled for safety');
      process.exit(0);
    }

    await truncateDatabase();
    
  } catch (error) {
    console.error('❌ Truncation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 