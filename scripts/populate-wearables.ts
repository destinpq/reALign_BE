import { PrismaClient } from '@prisma/client';
import { WearableImageMapperService } from '../src/services/wearable-image-mapper.service';
import { DatabaseModule } from '../src/database/database.module';
import { PrismaService } from '../src/database/prisma.service';

async function main() {
  console.log('🚀 Starting wearable database population...');
  
  const prisma = new PrismaClient();
  const prismaService = new PrismaService();
  const mapperService = new WearableImageMapperService(prismaService);

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Populate wearables with image mappings
    await mapperService.populateWearableDatabase();
    console.log('✅ Wearables populated successfully');

    // Get and display statistics
    const stats = await mapperService.getWearableStats();
    console.log('\n📊 Wearable Database Statistics:');
    console.log(`Total Items: ${stats.totalItems}`);
    console.log(`Items with Images: ${stats.itemsWithImages}`);
    console.log(`Items without Images: ${stats.itemsWithoutImages}`);
    console.log(`Image Match Rate: ${stats.imageMatchRate}`);
    
    console.log('\n📋 Category Breakdown:');
    stats.categoryBreakdown.forEach((cat: any) => {
      console.log(`  ${cat.category}: ${cat.count} items`);
    });

    // Show some sample mappings
    const mappings = await mapperService.mapWearablesToImages();
    const highConfidenceMappings = mappings.filter(m => m.matchConfidence >= 70);
    
    console.log(`\n🎯 High Confidence Mappings (${highConfidenceMappings.length} items):`);
    highConfidenceMappings.slice(0, 10).forEach(mapping => {
      console.log(`  ${mapping.csvItemName} → ${mapping.imageFileName} (${mapping.matchConfidence}% ${mapping.mappingType})`);
    });

    console.log('\n🎉 Database population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error populating database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 