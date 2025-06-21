import { PrismaClient, UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';

const prisma = new PrismaClient();

interface CSVRow {
  ID: string;
  Category: string;
  'Wearable Item': string;
}

async function parseCSV(): Promise<CSVRow[]> {
  const csvPath = path.join(__dirname, '../../shared/10_000_Specific_Wearable_Avatar_Materials.csv');
  
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

async function seedWearableItems() {
  console.log('🌱 Starting to seed wearable items...');
  
  try {
    // Parse CSV data
    const csvData = await parseCSV();
    console.log(`📄 Parsed ${csvData.length} items from CSV`);

    // Transform CSV data to match our schema
    const wearableItems = csvData.map(row => ({
      id: row.ID, // Use CSV ID directly as per schema
      name: row['Wearable Item'],
      category: row.Category,
      isActive: true,
    }));

    // Remove duplicates based on id
    const uniqueItems = Array.from(
      new Map(wearableItems.map(item => [item.id, item])).values()
    );

    console.log(`🔄 Processing ${uniqueItems.length} unique items...`);

    // Batch insert (Prisma handles conflicts gracefully)
    const batchSize = 100;
    let created = 0;
    let skipped = 0;

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
        skipped += batch.length;
      }
    }

    console.log(`🎉 Seeding completed!`);
    console.log(`✅ Created: ${created} items`);
    console.log(`⏭️  Skipped: ${skipped} items`);

    // Show category statistics
    const categories = await prisma.wearableItem.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
      orderBy: {
        category: 'asc',
      },
    });

    console.log('\n📊 Category Statistics:');
    categories.forEach(cat => {
      console.log(`  ${cat.category}: ${cat._count.category} items`);
    });

  } catch (error) {
    console.error('❌ Error seeding wearable items:', error);
    throw error;
  }
}

async function seedUsers() {
  console.log('👥 Creating sample users...');
  
  const bcrypt = require('bcryptjs');
  const saltRounds = 12;
  
  const users = [
    {
      email: 'admin@realign.com',
      password: await bcrypt.hash('Admin123!', saltRounds),
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      credits: 1000,
      isEmailVerified: true,
    },
    {
      email: 'test@example.com',
      password: await bcrypt.hash('password123', saltRounds),
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      credits: 1000,
      isEmailVerified: true,
    },
    {
      email: 'user@example.com',
      password: await bcrypt.hash('User123!', saltRounds),
      firstName: 'Demo',
      lastName: 'User',
      role: UserRole.USER,
      credits: 50,
      isEmailVerified: true,
    },
  ];

  for (const userData of users) {
    try {
      await prisma.user.upsert({
        where: { email: userData.email },
        update: { credits: userData.credits }, // Update credits if user exists
        create: userData,
      });
      console.log(`✅ Created/updated user: ${userData.email}`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting database seeding...');
    await seedUsers();
    
    // Only seed wearables if CSV file exists
    const csvPath = path.join(__dirname, '../../shared/10_000_Specific_Wearable_Avatar_Materials.csv');
    if (fs.existsSync(csvPath)) {
      await seedWearableItems();
    } else {
      console.log('⚠️ CSV file not found, skipping wearable items seeding');
    }
    
    console.log('🎉 Database seeding completed successfully!');
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