import { PrismaClient, UserRole, SubscriptionType, SubscriptionStatus, PaymentStatus, TransactionType, TransactionStatus, ProcessingType, ProcessingStatus, AuditSource, EmailStatus, CustomizationStatus, Size, Fit } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface CSVRow {
  ID: string;
  Category: string;
  'Wearable Item': string;
}

// Sample data for seeding
const SAMPLE_USERS = [
  {
    email: 'admin@realign.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    credits: 1000,
    subscriptionType: SubscriptionType.ENTERPRISE,
  },
  {
    email: 'superadmin@realign.com',
    password: 'SuperAdmin123!',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.SUPER_ADMIN,
    credits: 5000,
    subscriptionType: SubscriptionType.ENTERPRISE,
  },
  {
    email: 'john.doe@example.com',
    password: 'User123!',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    credits: 100,
    subscriptionType: SubscriptionType.BASIC,
  },
  {
    email: 'jane.smith@example.com',
    password: 'User123!',
    firstName: 'Jane',
    lastName: 'Smith',
    role: UserRole.PREMIUM,
    credits: 500,
    subscriptionType: SubscriptionType.PREMIUM,
  },
  {
    email: 'test.user@example.com',
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    credits: 50,
    subscriptionType: SubscriptionType.FREE,
  },
  {
    email: 'demo@realign.com',
    password: 'Demo123!',
    firstName: 'Demo',
    lastName: 'Account',
    role: UserRole.USER,
    credits: 200,
    subscriptionType: SubscriptionType.BASIC,
  },
];

const SAMPLE_WEARABLE_CATEGORIES = [
  'Shirts',
  'T-Shirts',
  'Hoodies',
  'Jackets',
  'Pants',
  'Jeans',
  'Shorts',
  'Dresses',
  'Skirts',
  'Shoes',
  'Sneakers',
  'Boots',
  'Accessories',
  'Hats',
  'Sunglasses',
  'Watches',
  'Jewelry',
  'Bags',
  'Belts',
  'Scarves'
];

const SAMPLE_WEARABLES = [
  { id: 'W00001', name: 'Classic White T-Shirt', category: 'T-Shirts', color: 'White', material: 'Cotton' },
  { id: 'W00002', name: 'Blue Denim Jeans', category: 'Jeans', color: 'Blue', material: 'Denim' },
  { id: 'W00003', name: 'Black Leather Jacket', category: 'Jackets', color: 'Black', material: 'Leather' },
  { id: 'W00004', name: 'Red Hoodie', category: 'Hoodies', color: 'Red', material: 'Cotton' },
  { id: 'W00005', name: 'Navy Blue Dress Shirt', category: 'Shirts', color: 'Navy', material: 'Cotton' },
  { id: 'W00006', name: 'Black Sneakers', category: 'Sneakers', color: 'Black', material: 'Synthetic' },
  { id: 'W00007', name: 'Brown Leather Boots', category: 'Boots', color: 'Brown', material: 'Leather' },
  { id: 'W00008', name: 'Summer Floral Dress', category: 'Dresses', color: 'Floral', material: 'Cotton' },
  { id: 'W00009', name: 'Khaki Shorts', category: 'Shorts', color: 'Khaki', material: 'Cotton' },
  { id: 'W00010', name: 'Baseball Cap', category: 'Hats', color: 'Black', material: 'Cotton' },
];

async function parseCSV(): Promise<CSVRow[]> {
  const csvPath = path.join(__dirname, '../../shared/10_000_Specific_Wearable_Avatar_Materials.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('⚠️ CSV file not found, using sample wearables');
    return [];
  }
  
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    
    fs.createReadStream(csvPath)
      .pipe(parse({ 
        columns: true,
        skip_empty_lines: true 
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

async function seedUsers() {
  console.log('👥 Creating sample users...');
  
  const saltRounds = 12;
  
  for (const userData of SAMPLE_USERS) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: { 
          credits: userData.credits,
          subscriptionType: userData.subscriptionType,
        },
        create: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          credits: userData.credits,
          subscriptionType: userData.subscriptionType,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });
      
      console.log(`✅ Created/updated user: ${userData.email} (${userData.role})`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error);
    }
  }
}

async function seedWearableItems() {
  console.log('🌱 Starting to seed wearable items...');
  
  try {
    // Try to parse CSV data first
    const csvData = await parseCSV();
    let wearableItems: any[] = [];

    if (csvData.length > 0) {
    console.log(`📄 Parsed ${csvData.length} items from CSV`);
      wearableItems = csvData.map(row => ({
        id: row.ID,
      name: row['Wearable Item'],
      category: row.Category,
        tags: [row.Category.toLowerCase()],
        isActive: true,
        sortOrder: 0,
      }));
    } else {
      console.log('📄 Using sample wearable items');
      wearableItems = SAMPLE_WEARABLES.map((item, index) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        tags: [item.category.toLowerCase(), item.color?.toLowerCase(), item.material?.toLowerCase()].filter(Boolean),
      isActive: true,
        sortOrder: index,
        color: item.color,
        material: item.material,
        season: 'All Season',
        occasion: 'Casual',
    }));
    }

    // Remove duplicates based on id
    const uniqueItems = Array.from(
      new Map(wearableItems.map(item => [item.id, item])).values()
    );

    console.log(`🔄 Processing ${uniqueItems.length} unique items...`);

    // Batch insert
    const batchSize = 100;
    let created = 0;

    for (let i = 0; i < uniqueItems.length; i += batchSize) {
      const batch = uniqueItems.slice(i, i + batchSize);
      
      try {
        const result = await prisma.wearableItem.createMany({
          data: batch,
          skipDuplicates: true,
        });
        
        created += result.count;
        console.log(`✅ Processed batch ${Math.ceil((i + 1) / batchSize)}: ${result.count} items created`);
      } catch (error) {
        console.error(`❌ Error in batch ${Math.ceil((i + 1) / batchSize)}:`, error);
      }
    }

    console.log(`🎉 Wearable items seeding completed! Created: ${created} items`);

  } catch (error) {
    console.error('❌ Error seeding wearable items:', error);
    throw error;
  }
}

async function seedSubscriptions() {
  console.log('💳 Creating sample subscriptions...');
  
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    if (user.subscriptionType !== SubscriptionType.FREE) {
      try {
        // Check if subscription already exists
        const existingSubscription = await prisma.subscription.findFirst({
          where: { userId: user.id }
        });
        
        if (!existingSubscription) {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              type: user.subscriptionType,
              status: SubscriptionStatus.ACTIVE,
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              creditsIncluded: user.subscriptionType === SubscriptionType.BASIC ? 100 : 
                             user.subscriptionType === SubscriptionType.PREMIUM ? 500 : 1000,
              creditsUsed: Math.floor(Math.random() * 50),
              autoRenew: true,
            },
          });
          
          console.log(`✅ Created subscription for: ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error creating subscription for ${user.email}:`, error);
      }
    }
  }
}

async function seedPayments() {
  console.log('💰 Creating sample payments...');
  
  const subscriptions = await prisma.subscription.findMany({
    include: { user: true }
  });
  
  for (const subscription of subscriptions) {
    try {
      const amount = subscription.type === SubscriptionType.BASIC ? 299 :
                    subscription.type === SubscriptionType.PREMIUM ? 599 : 999;
      
      await prisma.payment.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          razorpayPaymentId: `pay_${Math.random().toString(36).substr(2, 9)}`,
          razorpayOrderId: `order_${Math.random().toString(36).substr(2, 9)}`,
          amount: amount,
          currency: 'INR',
          status: PaymentStatus.COMPLETED,
          method: 'card',
          description: `${subscription.type} subscription payment`,
          creditsAwarded: subscription.creditsIncluded,
          metadata: {
            subscriptionType: subscription.type,
            billingCycle: 'monthly'
          },
        },
      });
      
      console.log(`✅ Created payment for: ${subscription.user.email}`);
    } catch (error) {
      console.error(`❌ Error creating payment for subscription ${subscription.id}:`, error);
    }
  }
}

async function seedAvatarGenerations() {
  console.log('🎨 Creating sample avatar generations...');
  
  const users = await prisma.user.findMany({
    where: { role: { in: [UserRole.USER, UserRole.PREMIUM] } }
  });
  
  const wearables = await prisma.wearableItem.findMany({ take: 10 });
  
  for (let i = 0; i < Math.min(users.length, 5); i++) {
    const user = users[i];
    const selectedWearables = wearables.slice(0, 3).map(w => ({
      id: w.id,
      name: w.name,
      category: w.category
    }));
    
    try {
      await prisma.avatarGeneration.create({
        data: {
          sessionId: `session_${user.id}_${Date.now()}`,
          userImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...', // Sample base64
          selectedWearables: selectedWearables,
          selectedScenery: 'Modern Office',
          userDetails: {
            gender: 'male',
            eyeColor: 'brown',
            hairColor: 'black',
            skinTone: 'medium',
            age: 25 + i
          },
          generatedPrompt: `Professional headshot of a ${25 + i} year old person with brown eyes and black hair, wearing ${selectedWearables[0].name}, in a modern office setting`,
          status: i < 3 ? 'COMPLETED' : 'PENDING_PAYMENT',
          generatedImageUrl: i < 3 ? `https://example.com/generated-avatar-${i}.jpg` : null,
          metadata: {
            processingTime: Math.floor(Math.random() * 30) + 10,
            model: 'realign-v1.0',
            quality: 'high'
          }
        },
      });
      
      console.log(`✅ Created avatar generation for: ${user.email}`);
    } catch (error) {
      console.error(`❌ Error creating avatar generation for ${user.email}:`, error);
    }
  }
}

async function seedTransactions() {
  console.log('📊 Creating sample transactions...');
  
  const payments = await prisma.payment.findMany({
    include: { user: true }
  });
  
  for (const payment of payments) {
    try {
      await prisma.transaction.create({
        data: {
          transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          amount: payment.amount.toNumber(),
          currency: payment.currency,
          userId: payment.userId,
          entityType: 'Payment',
          entityId: payment.id,
          paymentGateway: 'RAZORPAY',
          gatewayOrderId: payment.razorpayOrderId,
          gatewayPaymentId: payment.razorpayPaymentId,
          description: payment.description,
          creditsAwarded: payment.creditsAwarded,
          platformFee: payment.amount.toNumber() * 0.02, // 2% platform fee
          gatewayFee: payment.amount.toNumber() * 0.025, // 2.5% gateway fee
          netAmount: payment.amount.toNumber() * 0.955, // After fees
          source: 'WEB',
          channel: 'DIRECT',
          processedAt: new Date(),
          completedAt: new Date(),
    },
      });
      
      console.log(`✅ Created transaction for payment: ${payment.id}`);
    } catch (error) {
      console.error(`❌ Error creating transaction for payment ${payment.id}:`, error);
    }
  }
}

async function seedProcessingJobs() {
  console.log('⚙️ Creating sample processing jobs...');
  
  const users = await prisma.user.findMany({ take: 3 });
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    try {
      await prisma.processingJob.create({
        data: {
          userId: user.id,
          type: ProcessingType.HEADSHOT_GENERATION,
          status: i === 0 ? ProcessingStatus.COMPLETED : 
                  i === 1 ? ProcessingStatus.PROCESSING : ProcessingStatus.PENDING,
          externalId: `job_${Math.random().toString(36).substr(2, 9)}`,
          inputData: {
            userImage: 'base64_image_data',
            preferences: {
              style: 'professional',
              background: 'office'
            }
          },
          outputData: i === 0 ? {
            generatedImageUrl: 'https://example.com/generated-headshot.jpg',
            processingTime: 45
          } : undefined,
          creditsUsed: 10,
          startedAt: new Date(),
          completedAt: i === 0 ? new Date() : null,
    },
      });
      
      console.log(`✅ Created processing job for: ${user.email}`);
    } catch (error) {
      console.error(`❌ Error creating processing job for ${user.email}:`, error);
    }
  }
}

async function seedAuditLogs() {
  console.log('📋 Creating sample audit logs...');
  
  const users = await prisma.user.findMany({ take: 5 });
  
  const auditEvents = [
    { action: 'user.login', entityType: 'User' },
    { action: 'user.profile_update', entityType: 'User' },
    { action: 'user.registration', entityType: 'User' },
    { action: 'user.password_change', entityType: 'User' },
    { action: 'system.maintenance', entityType: 'System' },
    { action: 'user.logout', entityType: 'User' },
    { action: 'user.email_verified', entityType: 'User' },
    { action: 'system.backup', entityType: 'System' },
  ];

  for (let i = 0; i < 10; i++) {
    const user = users[i % users.length];
    const event = auditEvents[i % auditEvents.length];
    
    try {
      // Create audit logs without foreign key relationships to avoid conflicts
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityType === 'User' ? user.id : null, // Only reference user IDs to avoid FK conflicts
          metadata: {
            timestamp: new Date().toISOString(),
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            source: 'web',
            sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
            actionDetails: event.action.includes('system') ? 'Automated system action' : 'User initiated action'
          },
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: `Mozilla/5.0 (${['Windows NT 10.0', 'Macintosh; Intel Mac OS X 10_15_7', 'X11; Linux x86_64'][i % 3]}) AppleWebKit/537.36`,
          source: AuditSource.API,
        },
      });
    } catch (error) {
      console.error(`❌ Error creating audit log for ${event.action}:`, error.message);
    }
  }
  
  console.log('✅ Created sample audit logs');
}

async function seedEmailNotifications() {
  console.log('📧 Creating sample email notifications...');
  
  const users = await prisma.user.findMany({ take: 3 });
  
  const emailTemplates = [
    { template: 'welcome', subject: 'Welcome to ReAlign!' },
    { template: 'payment_confirmation', subject: 'Payment Confirmation' },
    { template: 'avatar_ready', subject: 'Your Avatar is Ready!' },
  ];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const emailTemplate = emailTemplates[i % emailTemplates.length];
    
    try {
      await prisma.emailNotification.create({
        data: {
          userId: user.id,
          to: user.email,
          from: 'noreply@realign.com',
          subject: emailTemplate.subject,
          template: emailTemplate.template,
          templateData: {
            firstName: user.firstName,
            lastName: user.lastName,
          },
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });
      
      console.log(`✅ Created email notification for: ${user.email}`);
    } catch (error) {
      console.error(`❌ Error creating email notification for ${user.email}:`, error);
    }
  }
}

async function seedUserWearableSelections() {
  console.log('👔 Creating sample user wearable selections...');
  
  const users = await prisma.user.findMany({
    where: { role: { in: [UserRole.USER, UserRole.PREMIUM] } },
    take: 3
  });
  
  const wearables = await prisma.wearableItem.findMany({ take: 15 });
  
  for (const user of users) {
    // Select 3-5 random wearables for each user
    const selectedWearables = wearables
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 3);
    
    for (const wearable of selectedWearables) {
      try {
        await prisma.userWearableSelection.create({
          data: {
            userId: user.id,
            wearableItemId: wearable.id,
          },
        });
      } catch (error) {
        // Skip if already exists (unique constraint)
        if (!error.message.includes('Unique constraint')) {
          console.error(`❌ Error creating wearable selection:`, error);
        }
      }
    }
    
    console.log(`✅ Created wearable selections for: ${user.email}`);
  }
}

async function generateStatistics() {
  console.log('📊 Generating database statistics...');
  
  const stats = {
    users: await prisma.user.count(),
    wearableItems: await prisma.wearableItem.count(),
    subscriptions: await prisma.subscription.count(),
    payments: await prisma.payment.count(),
    avatarGenerations: await prisma.avatarGeneration.count(),
    transactions: await prisma.transaction.count(),
    processingJobs: await prisma.processingJob.count(),
    auditLogs: await prisma.auditLog.count(),
    emailNotifications: await prisma.emailNotification.count(),
    userWearableSelections: await prisma.userWearableSelection.count(),
  };
  
  console.log('\n📈 Database Statistics:');
  console.log('═══════════════════════');
  Object.entries(stats).forEach(([key, value]) => {
    console.log(`${key.padEnd(25)}: ${value.toLocaleString()}`);
  });
  
  // Show category statistics for wearables
  const categories = await prisma.wearableItem.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { category: 'asc' },
  });
  
  console.log('\n👕 Wearable Categories:');
  console.log('═══════════════════════');
  categories.forEach(cat => {
    console.log(`${cat.category.padEnd(20)}: ${cat._count.category} items`);
  });
}

async function main() {
  try {
    console.log('🚀 Starting comprehensive database seeding...');
    console.log('═══════════════════════════════════════════');
    
    // Core data
    await seedUsers();
    await seedWearableItems();
    await seedUserWearableSelections();
    
    // Business data
    await seedSubscriptions();
    await seedPayments();
    await seedAvatarGenerations();
    await seedTransactions();
    
    // System data
    await seedProcessingJobs();
    await seedAuditLogs();
    await seedEmailNotifications();
    
    // Generate statistics
    await generateStatistics();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('═══════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
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