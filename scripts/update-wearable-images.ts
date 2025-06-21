import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clothing-specific image mappings
const clothingImages: Record<string, string> = {
  // Jackets & Outerwear
  'Y2K Metallic Jacket': 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400&h=400&fit=crop&crop=center&q=80',
  'Grunge Flannel Set': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center&q=80',
  'Biker Jacket with Chains': 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=400&h=400&fit=crop&crop=center&q=80',
  'Leather Jacket': 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop&crop=center&q=80',
  
  // Suits & Formal
  'Minimalist Monochrome Suit': 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop&crop=center&q=80',
  'Business Suit': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=center&q=80',
  'Formal Suit': 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=400&h=400&fit=crop&crop=center&q=80',
  
  // Dresses & Gowns
  'Royalcore Embellished Gown': 'https://images.unsplash.com/photo-1566479179817-c7c3d4e3b2f8?w=400&h=400&fit=crop&crop=center&q=80',
  'Cottagecore Apron Skirt': 'https://images.unsplash.com/photo-1583544180469-ad3aa31e98a3?w=400&h=400&fit=crop&crop=center&q=80',
  'Evening Gown': 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400&h=400&fit=crop&crop=center&q=80',
  'Cocktail Dress': 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=400&fit=crop&crop=center&q=80',
  
  // Casual & Streetwear
  'Hip-Hop Graphic Overalls': 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop&crop=center&q=80',
  'Streetwear Hoodie': 'https://images.unsplash.com/photo-1556821840-3a9fbc4e1b84?w=400&h=400&fit=crop&crop=center&q=80',
  'Graphic Tee': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center&q=80',
  'Ripped Jeans': 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=400&fit=crop&crop=center&q=80',
  
  // Gothic & Alternative
  'Cyber Goth Full Body Gear': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center&q=80',
  'Gothic Dress': 'https://images.unsplash.com/photo-1585838894006-33fb18cb8577?w=400&h=400&fit=crop&crop=center&q=80',
  'Dark Academia Coat': 'https://images.unsplash.com/photo-1559563458-527cfc780e2c?w=400&h=400&fit=crop&crop=center&q=80',
  
  // Accessories
  'Gold Chain Necklace': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop&crop=center&q=80',
  'Designer Sunglasses': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop&crop=center&q=80',
  'Leather Boots': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop&crop=center&q=80',
  'Sneakers': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop&crop=center&q=80',
};

// Category-based fallback images
const categoryImages: Record<string, string> = {
  'Fashion Styles': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop&crop=center&q=80',
  'Tops': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center&q=80',
  'Bottoms': 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=400&fit=crop&crop=center&q=80',
  'Full Outfits': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop&crop=center&q=80',
  'Footwear': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop&crop=center&q=80',
  'Jewelry': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop&crop=center&q=80',
  'Face Accessories': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop&crop=center&q=80',
  'Arm & Hand Accessories': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop&crop=center&q=80',
  'Back & Body Accessories': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center&q=80',
  'Cultural / Cosplay': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center&q=80',
};

function getImageForWearable(name: string, category: string): string {
  // First try exact name match
  if (clothingImages[name]) {
    return clothingImages[name];
  }
  
  // Try partial name matching
  for (const [key, url] of Object.entries(clothingImages)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
      return url;
    }
  }
  
  // Fallback to category image
  if (categoryImages[category]) {
    return categoryImages[category];
  }
  
  // Ultimate fallback
  return 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop&crop=center&q=80';
}

async function updateWearableImages() {
  try {
    console.log('🔄 Connecting to database...');
    await prisma.$connect();
    
    console.log('📊 Fetching all wearables...');
    const wearables = await prisma.wearableItem.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true, imageUrl: true }
    });
    
    console.log(`📊 Found ${wearables.length} wearables to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const wearable of wearables) {
      const newImageUrl = getImageForWearable(wearable.name, wearable.category);
      
      // Only update if image is null or uses the generic/broken image
      const needsUpdate = !wearable.imageUrl || 
                         wearable.imageUrl.includes('txt=E%20Girl%20Mesh%20Layered%20Fit') ||
                         wearable.imageUrl === 'null' ||
                         wearable.imageUrl.includes('placeholder');
      
      if (needsUpdate) {
        try {
          await prisma.wearableItem.update({
            where: { id: wearable.id },
            data: { imageUrl: newImageUrl }
          });
          
          console.log(`✅ Updated ${wearable.name} (${wearable.category}) with new image`);
          updated++;
        } catch (error) {
          console.error(`❌ Error updating ${wearable.name}:`, error);
        }
      } else {
        console.log(`⏭️  Skipped ${wearable.name} (already has proper image)`);
        skipped++;
      }
    }
    
    console.log(`\n🎉 Update complete!`);
    console.log(`✅ Updated: ${updated} wearables`);
    console.log(`⏭️  Skipped: ${skipped} wearables`);
    console.log(`📊 Total: ${wearables.length} wearables`);
    
    // Show some examples of updated items
    const sampleUpdated = await prisma.wearableItem.findMany({
      where: { 
        isActive: true,
        imageUrl: { not: null }
      },
      select: { name: true, category: true, imageUrl: true },
      take: 5
    });
    
    console.log('\n🖼️  Sample updated wearables:');
    sampleUpdated.forEach(item => {
      console.log(`  ${item.name} (${item.category}) → ${item.imageUrl?.substring(0, 60)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error updating wearable images:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateWearableImages(); 