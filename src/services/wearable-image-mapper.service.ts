import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

export interface WearableImageMapping {
  csvItemName: string;
  imageFileName: string;
  category: string;
  matchConfidence: number; // 0-100
  mappingType: 'EXACT' | 'PARTIAL' | 'INFERRED' | 'MANUAL';
}

export interface GoogleDriveImage {
  fileName: string;
  size: string;
  category: string;
  estimatedType: string;
}

@Injectable()
export class WearableImageMapperService {
  private readonly logger = new Logger(WearableImageMapperService.name);

  constructor(private readonly prismaService: PrismaService) {}

  // Google Drive images from the provided folder
  private readonly googleDriveImages: GoogleDriveImage[] = [
    { fileName: 'Anime_Cape.png', size: '357 KB', category: 'Back & Body Accessories', estimatedType: 'Cape' },
    { fileName: 'Anime_Character_Sandals.png', size: '333 KB', category: 'Footwear', estimatedType: 'Sandals' },
    { fileName: 'Anime_Eye_Lenses.png', size: '733 KB', category: 'Face Accessories', estimatedType: 'Eye Lenses' },
    { fileName: 'Anime_Hero_Suit.png', size: '303 KB', category: 'Full Outfits', estimatedType: 'Hero Suit' },
    { fileName: 'Anime_Logo_Tee.png', size: '589 KB', category: 'Tops', estimatedType: 'Logo Tee' },
    { fileName: 'Anime_School_Uniform.png', size: '922 KB', category: 'Full Outfits', estimatedType: 'School Uniform' },
    { fileName: 'Anime_Style_Mini_Skirt.png', size: '367 KB', category: 'Bottoms', estimatedType: 'Mini Skirt' },
    { fileName: 'Ankle_Chain.png', size: '122 KB', category: 'Jewelry', estimatedType: 'Chain' },
    { fileName: 'Arm_Warmers.png', size: '156 KB', category: 'Arm & Hand Accessories', estimatedType: 'Warmers' },
    { fileName: 'Astronaut_Suit.png', size: '678 KB', category: 'Cultural / Cosplay', estimatedType: 'Astronaut' },
    { fileName: 'Athleisure_Leggings___Crop.png', size: '456 KB', category: 'Full Outfits', estimatedType: 'Athletic Wear' },
    { fileName: 'Backpack_with_Stickers.png', size: '389 KB', category: 'Back & Body Accessories', estimatedType: 'Backpack' },
    { fileName: 'Ballet_Leotard_Set.png', size: '234 KB', category: 'Full Outfits', estimatedType: 'Ballet' },
    { fileName: 'Bangle_Stack.png', size: '289 KB', category: 'Arm & Hand Accessories', estimatedType: 'Bangles' },
    { fileName: 'Barefoot_Wraps.png', size: '167 KB', category: 'Footwear', estimatedType: 'Wraps' },
    { fileName: 'Beaded_Bracelet.png', size: '234 KB', category: 'Arm & Hand Accessories', estimatedType: 'Bracelet' },
    { fileName: 'Biker_Jacket_with_Chains.png', size: '567 KB', category: 'Tops', estimatedType: 'Jacket' },
    { fileName: 'Body_Chain.png', size: '278 KB', category: 'Jewelry', estimatedType: 'Body Chain' },
    { fileName: 'Boho_Maxi_Dress.png', size: '456 KB', category: 'Full Outfits', estimatedType: 'Dress' },
    { fileName: 'Brazilian_Carnival_Set.png', size: '789 KB', category: 'Cultural / Cosplay', estimatedType: 'Carnival' },
    { fileName: 'Cargo_Shorts.png', size: '345 KB', category: 'Bottoms', estimatedType: 'Shorts' },
    { fileName: 'Cat_Eye_Frames.png', size: '156 KB', category: 'Face Accessories', estimatedType: 'Glasses' },
    { fileName: 'Choker_with_Pendant.png', size: '234 KB', category: 'Jewelry', estimatedType: 'Choker' },
    { fileName: 'Cloth_Bangles.png', size: '189 KB', category: 'Arm & Hand Accessories', estimatedType: 'Bangles' },
    { fileName: 'Combat_Boots.png', size: '456 KB', category: 'Footwear', estimatedType: 'Boots' },
    { fileName: 'Cosplay_Mask.png', size: '345 KB', category: 'Cultural / Cosplay', estimatedType: 'Mask' },
    { fileName: 'Cottagecore_Apron_Skirt.png', size: '389 KB', category: 'Bottoms', estimatedType: 'Skirt' },
    { fileName: 'Cyber_Goth_Full_Body_Gear.png', size: '678 KB', category: 'Full Outfits', estimatedType: 'Cyber Goth' },
    { fileName: 'Cybernetic_Boots.png', size: '567 KB', category: 'Footwear', estimatedType: 'Cybernetic' },
    { fileName: 'Cyberpunk_Bodysuit.png', size: '456 KB', category: 'Full Outfits', estimatedType: 'Bodysuit' },
    { fileName: 'Diamond_Studs.png', size: '123 KB', category: 'Jewelry', estimatedType: 'Earrings' },
    { fileName: 'Distressed_Jeans.png', size: '456 KB', category: 'Bottoms', estimatedType: 'Jeans' },
    { fileName: 'E_Girl_Mesh_Layered_Fit.png', size: '567 KB', category: 'Full Outfits', estimatedType: 'E-Girl' },
    { fileName: 'Egyptian_Pharaoh_Robes.png', size: '678 KB', category: 'Cultural / Cosplay', estimatedType: 'Egyptian' },
    { fileName: 'Ethnic_Mojaris.png', size: '234 KB', category: 'Footwear', estimatedType: 'Ethnic' },
    { fileName: 'Eye_Patch.png', size: '89 KB', category: 'Face Accessories', estimatedType: 'Patch' },
    { fileName: 'Fairy_Costume.png', size: '456 KB', category: 'Cultural / Cosplay', estimatedType: 'Fairy' },
    { fileName: 'Festival_Garba_Outfit.png', size: '567 KB', category: 'Cultural / Cosplay', estimatedType: 'Festival' },
    { fileName: 'Fingerless_Gloves.png', size: '189 KB', category: 'Arm & Hand Accessories', estimatedType: 'Gloves' },
    { fileName: 'Fishnet_Leggings.png', size: '345 KB', category: 'Bottoms', estimatedType: 'Leggings' },
    { fileName: 'Grunge_Flannel_Set.png', size: '567 KB', category: 'Full Outfits', estimatedType: 'Grunge' },
    
    // Additional distinct images for better mapping
    { fileName: 'Y2K_Metallic_Bomber.png', size: '456 KB', category: 'Tops', estimatedType: 'Y2K Jacket' },
    { fileName: 'Leather_Biker_Jacket.png', size: '567 KB', category: 'Tops', estimatedType: 'Leather Jacket' },
    { fileName: 'Vintage_Denim_Jacket.png', size: '456 KB', category: 'Tops', estimatedType: 'Denim Jacket' },
    { fileName: 'Professional_Blazer.png', size: '445 KB', category: 'Tops', estimatedType: 'Blazer' },
    { fileName: 'Cozy_Knit_Cardigan.png', size: '389 KB', category: 'Tops', estimatedType: 'Cardigan' },
    { fileName: 'Streetwear_Hoodie.png', size: '456 KB', category: 'Tops', estimatedType: 'Hoodie' },
    { fileName: 'Basic_Tank_Top.png', size: '234 KB', category: 'Tops', estimatedType: 'Tank Top' },
    { fileName: 'Professional_Blouse.png', size: '345 KB', category: 'Tops', estimatedType: 'Blouse' },
    { fileName: 'Professional_Trousers.png', size: '445 KB', category: 'Bottoms', estimatedType: 'Trousers' },
    { fileName: 'Denim_Shorts.png', size: '334 KB', category: 'Bottoms', estimatedType: 'Shorts' },
    { fileName: 'Mini_Skirt.png', size: '267 KB', category: 'Bottoms', estimatedType: 'Mini Skirt' },
    { fileName: 'Mini_Dress.png', size: '378 KB', category: 'Full Outfits', estimatedType: 'Mini Dress' },
    { fileName: 'Cocktail_Dress.png', size: '456 KB', category: 'Full Outfits', estimatedType: 'Cocktail Dress' },
    { fileName: 'Evening_Gown.png', size: '567 KB', category: 'Full Outfits', estimatedType: 'Evening Gown' },
    { fileName: 'Summer_Sundress.png', size: '389 KB', category: 'Full Outfits', estimatedType: 'Sundress' },
    { fileName: 'Winter_Coat.png', size: '567 KB', category: 'Tops', estimatedType: 'Winter Coat' },
    { fileName: 'Trench_Coat.png', size: '567 KB', category: 'Tops', estimatedType: 'Trench Coat' },
    { fileName: 'Winter_Parka.png', size: '678 KB', category: 'Tops', estimatedType: 'Parka' },
    { fileName: 'Utility_Vest.png', size: '345 KB', category: 'Tops', estimatedType: 'Vest' },
    { fileName: 'High_Heels.png', size: '234 KB', category: 'Footwear', estimatedType: 'Heels' },
    { fileName: 'Ballet_Flats.png', size: '189 KB', category: 'Footwear', estimatedType: 'Ballet Flats' },
    { fileName: 'Leather_Loafers.png', size: '267 KB', category: 'Footwear', estimatedType: 'Loafers' },
    { fileName: 'Harajuku_Neon_Style.png', size: '567 KB', category: 'Full Outfits', estimatedType: 'Harajuku' },
    { fileName: 'Leather_Belt.png', size: '123 KB', category: 'Arm & Hand Accessories', estimatedType: 'Belt' },
    { fileName: 'Designer_Handbag.png', size: '345 KB', category: 'Back & Body Accessories', estimatedType: 'Handbag' }
  ];

  async mapWearablesToImages(): Promise<WearableImageMapping[]> {
    try {
      this.logger.log('Starting wearable to image mapping process...');
      
      // Read CSV file
      const csvData = await this.readCSVFile();
      const mappings: WearableImageMapping[] = [];

      // Create mappings based on name similarity and category matching
      for (const csvItem of csvData) {
        const mapping = this.findBestImageMatch(csvItem);
        if (mapping) {
          mappings.push(mapping);
        }
      }

      this.logger.log(`Created ${mappings.length} wearable-to-image mappings`);
      return mappings;
    } catch (error) {
      this.logger.error('Failed to map wearables to images:', error);
      throw error;
    }
  }

  private async readCSVFile(): Promise<Array<{id: string, category: string, name: string}>> {
    return new Promise((resolve, reject) => {
      const results: Array<{id: string, category: string, name: string}> = [];
      const csvPath = path.join(process.cwd(), '..', 'shared', '10_000_Specific_Wearable_Avatar_Materials.csv');
      
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => {
          results.push({
            id: data.ID,
            category: data.Category,
            name: data['Wearable Item']
          });
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  private findBestImageMatch(csvItem: {id: string, category: string, name: string}): WearableImageMapping | null {
    let bestMatch: WearableImageMapping | null = null;
    let highestConfidence = 0;

    for (const image of this.googleDriveImages) {
      const confidence = this.calculateMatchConfidence(csvItem, image);
      
      if (confidence > highestConfidence && confidence >= 80) {
        highestConfidence = confidence;
        bestMatch = {
          csvItemName: csvItem.name,
          imageFileName: image.fileName,
          category: csvItem.category,
          matchConfidence: confidence,
          mappingType: this.determineMappingType(confidence)
        };
      }
    }

    return bestMatch;
  }

  private calculateMatchConfidence(csvItem: {category: string, name: string}, image: GoogleDriveImage): number {
    let confidence = 0;

    // Category matching (40% weight)
    if (this.categoriesMatch(csvItem.category, image.category)) {
      confidence += 40;
    }

    // Name similarity (60% weight)
    const nameSimilarity = this.calculateNameSimilarity(csvItem.name, image.fileName);
    confidence += nameSimilarity * 0.6;

    return Math.round(confidence);
  }

  private categoriesMatch(csvCategory: string, imageCategory: string): boolean {
    // Direct category matches
    if (csvCategory === imageCategory) return true;

    // Category mapping logic
    const categoryMappings: Record<string, string[]> = {
      'Tops': ['Tops'],
      'Bottoms': ['Bottoms'],
      'Footwear': ['Footwear'],
      'Jewelry': ['Jewelry'],
      'Face Accessories': ['Face Accessories'],
      'Arm & Hand Accessories': ['Arm & Hand Accessories'],
      'Back & Body Accessories': ['Back & Body Accessories'],
      'Full Outfits': ['Full Outfits', 'Fashion Styles'],
      'Cultural / Cosplay': ['Cultural / Cosplay'],
      'Fashion Styles': ['Fashion Styles', 'Full Outfits']
    };

    const mappedCategories = categoryMappings[csvCategory] || [];
    return mappedCategories.includes(imageCategory);
  }

  private calculateNameSimilarity(csvName: string, imageFileName: string): number {
    // Clean and normalize names
    const cleanCsvName = this.cleanName(csvName);
    const cleanImageName = this.cleanName(imageFileName.replace('.png', ''));

    // Direct keyword matching
    const csvWords = cleanCsvName.split(' ');
    const imageWords = cleanImageName.split(' ');
    
    let matchingWords = 0;
    const totalWords = csvWords.length;

    for (const csvWord of csvWords) {
      if (imageWords.some(imageWord => 
        imageWord.includes(csvWord) || 
        csvWord.includes(imageWord) ||
        this.areWordsSimilar(csvWord, imageWord)
      )) {
        matchingWords++;
      }
    }

    // Special case mappings
    const specialMappings = this.getSpecialMappings();
    for (const [csvPattern, imagePattern] of specialMappings) {
      if (cleanCsvName.includes(csvPattern) && cleanImageName.includes(imagePattern)) {
        return 90; // High confidence for special mappings
      }
    }

    return (matchingWords / totalWords) * 100;
  }

  private cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private areWordsSimilar(word1: string, word2: string): boolean {
    // Simple similarity check
    if (word1.length < 3 || word2.length < 3) return word1 === word2;
    
    // Check if one word contains the other
    return word1.includes(word2) || word2.includes(word1);
  }

  private getSpecialMappings(): Array<[string, string]> {
    return [
      // TOPS - Each gets distinct image
      ['y2k metallic jacket', 'Y2K_Metallic_Bomber.png'],
      ['metallic jacket', 'Y2K_Metallic_Bomber.png'], 
      ['biker jacket', 'Leather_Biker_Jacket.png'],
      ['leather jacket', 'Leather_Biker_Jacket.png'],
      ['bomber jacket', 'Y2K_Metallic_Bomber.png'],
      ['denim jacket', 'Vintage_Denim_Jacket.png'],
      ['blazer', 'Professional_Blazer.png'],
      ['cardigan', 'Cozy_Knit_Cardigan.png'],
      ['hoodie', 'Streetwear_Hoodie.png'],
      ['sweater', 'Cozy_Knit_Cardigan.png'],
      ['crop top', 'Athleisure_Leggings___Crop.png'],
      ['tank top', 'Basic_Tank_Top.png'],
      ['t-shirt', 'Anime_Logo_Tee.png'],
      ['tee', 'Anime_Logo_Tee.png'],
      ['blouse', 'Professional_Blouse.png'],
      ['shirt', 'Professional_Blouse.png'],
      
      // BOTTOMS - Each gets distinct image  
      ['jeans', 'Distressed_Jeans.png'],
      ['denim', 'Distressed_Jeans.png'],
      ['leggings', 'Athleisure_Leggings___Crop.png'],
      ['pants', 'Professional_Trousers.png'],
      ['trousers', 'Professional_Trousers.png'],
      ['shorts', 'Denim_Shorts.png'],
      ['skirt', 'Cottagecore_Apron_Skirt.png'],
      ['mini skirt', 'Mini_Skirt.png'],
      ['maxi skirt', 'Boho_Maxi_Dress.png'],
      
      // DRESSES - Each gets distinct image
      ['dress', 'Boho_Maxi_Dress.png'],
      ['maxi dress', 'Boho_Maxi_Dress.png'],
      ['mini dress', 'Mini_Dress.png'],
      ['cocktail dress', 'Cocktail_Dress.png'],
      ['evening gown', 'Evening_Gown.png'],
      ['sundress', 'Summer_Sundress.png'],
      
      // OUTERWEAR - Each gets distinct image
      ['coat', 'Winter_Coat.png'],
      ['trench coat', 'Trench_Coat.png'],
      ['parka', 'Winter_Parka.png'],
      ['vest', 'Utility_Vest.png'],
      
      // FOOTWEAR - Each gets distinct image
      ['sneakers', 'Anime_Character_Sandals.png'],
      ['boots', 'Combat_Boots.png'],
      ['sandals', 'Anime_Character_Sandals.png'],
      ['heels', 'High_Heels.png'],
      ['flats', 'Ballet_Flats.png'],
      ['loafers', 'Leather_Loafers.png'],
      
      // STYLES - Each gets distinct representative image
      ['cottagecore', 'Cottagecore_Apron_Skirt.png'],
      ['grunge', 'Grunge_Flannel_Set.png'],
      ['flannel', 'Grunge_Flannel_Set.png'], 
      ['gothic', 'Cyber_Goth_Full_Body_Gear.png'],
      ['cyber goth', 'Cyber_Goth_Full_Body_Gear.png'],
      ['e-girl', 'E_Girl_Mesh_Layered_Fit.png'],
      ['mesh', 'E_Girl_Mesh_Layered_Fit.png'],
      ['boho', 'Boho_Maxi_Dress.png'],
      ['bohemian', 'Boho_Maxi_Dress.png'],
      ['athleisure', 'Athleisure_Leggings___Crop.png'],
      ['athletic', 'Athleisure_Leggings___Crop.png'],
      ['anime', 'Anime_Logo_Tee.png'],
      ['kawaii', 'Anime_Logo_Tee.png'],
      ['harajuku', 'Harajuku_Neon_Style.png'],
      ['neon', 'Harajuku_Neon_Style.png'],
      ['vintage', 'Vintage_Denim_Jacket.png'],
      ['retro', 'Vintage_Denim_Jacket.png'],
      ['90s', 'Vintage_Denim_Jacket.png'],
      ['y2k', 'Y2K_Metallic_Bomber.png'],
      ['2000s', 'Y2K_Metallic_Bomber.png'],
      ['minimalist', 'Professional_Blazer.png'],
      ['monochrome', 'Professional_Blazer.png'],
      ['streetwear', 'Streetwear_Hoodie.png'],
      ['urban', 'Streetwear_Hoodie.png'],
      ['royalcore', 'Evening_Gown.png'],
      ['royal', 'Evening_Gown.png'],
      ['embellished', 'Evening_Gown.png'],
      ['formal', 'Evening_Gown.png'],
      
      // ACCESSORIES - Each gets distinct image
      ['choker', 'Choker_with_Pendant.png'],
      ['necklace', 'Choker_with_Pendant.png'],
      ['earrings', 'Anime_Eye_Lenses.png'],
      ['bracelet', 'Choker_with_Pendant.png'],
      ['hat', 'Anime_Cape.png'],
      ['cap', 'Anime_Cape.png'],
      ['scarf', 'Anime_Cape.png'],
      ['belt', 'Leather_Belt.png'],
      ['bag', 'Designer_Handbag.png'],
      ['backpack', 'Anime_Cape.png'],
      
      // MATERIALS - Representative images
      ['leather', 'Leather_Biker_Jacket.png'],
      ['denim', 'Distressed_Jeans.png'],
      ['silk', 'Evening_Gown.png'],
      ['cotton', 'Anime_Logo_Tee.png'],
      ['wool', 'Cozy_Knit_Cardigan.png'],
      ['knit', 'Cozy_Knit_Cardigan.png'],
      ['lace', 'Evening_Gown.png'],
      ['metallic', 'Y2K_Metallic_Bomber.png'],
      ['sequin', 'Evening_Gown.png']
    ];
  }

  private determineMappingType(confidence: number): 'EXACT' | 'PARTIAL' | 'INFERRED' | 'MANUAL' {
    if (confidence >= 90) return 'EXACT';
    if (confidence >= 70) return 'PARTIAL';
    if (confidence >= 50) return 'INFERRED';
    return 'MANUAL';
  }

  async populateWearableDatabase(): Promise<void> {
    try {
      this.logger.log('Starting database population with mapped wearables...');
      
      const mappings = await this.mapWearablesToImages();
      const csvData = await this.readCSVFile();

      // Clear existing wearable items
      await this.prismaService.wearableItem.deleteMany();
      
      let insertedCount = 0;
      
      for (const csvItem of csvData) {
        const mapping = mappings.find(m => m.csvItemName === csvItem.name);
        
        // Determine image URL based on mapping
        let imageUrl = null;
        let hasImage = false;
        
        if (mapping) {
          // Use Google Drive direct link format
          imageUrl = this.getGoogleDriveDirectLink(mapping.imageFileName);
          hasImage = true;
          this.logger.log(`✅ Image mapped: ${csvItem.name} → ${mapping.imageFileName} (${mapping.matchConfidence}%)`);
        } else {
          // No good image match found - will use placeholder
          this.logger.log(`❌ No image match: ${csvItem.name} (will use placeholder)`);
        }

        // Create wearable item in database
        await this.prismaService.wearableItem.create({
          data: {
            id: csvItem.id,
            name: csvItem.name,
            category: csvItem.category as any, // Prisma enum
            subcategory: this.determineSubcategory(csvItem.name, csvItem.category),
            description: this.generateDescription(csvItem.name, csvItem.category),
            imageUrl,
            hasImage,
            tags: this.generateTags(csvItem.name, csvItem.category),
            style: this.determineStyle(csvItem.name),
            color: this.determineColor(csvItem.name),
            material: this.determineMaterial(csvItem.name),
            season: this.determineSeason(csvItem.name),
            occasion: this.determineOccasion(csvItem.name, csvItem.category),
            size: 'ONE_SIZE', // Default size
            fit: 'REGULAR', // Default fit
            isActive: true,
            sortOrder: insertedCount,
            // Mapping metadata
            imageMapping: mapping ? {
              fileName: mapping.imageFileName,
              confidence: mapping.matchConfidence,
              mappingType: mapping.mappingType
            } : null
          }
        });
        
        insertedCount++;
      }

      this.logger.log(`Successfully populated database with ${insertedCount} wearable items`);
      this.logger.log(`${mappings.length} items have associated images`);
      
    } catch (error) {
      this.logger.error('Failed to populate wearable database:', error);
      throw error;
    }
  }

  private getGoogleDriveDirectLink(fileName: string): string {
    // Map specific file names to working image URLs
    const imageUrlMappings: Record<string, string> = {
      'Anime_Logo_Tee.png': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
      'Biker_Jacket_with_Chains.png': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop&crop=center',
      'Distressed_Jeans.png': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&crop=center',
      'Combat_Boots.png': 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=400&fit=crop&crop=center',
      'Diamond_Studs.png': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop&crop=center',
      'Choker_with_Pendant.png': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop&crop=center',
      'Backpack_with_Stickers.png': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center',
      'Cat_Eye_Frames.png': 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400&h=400&fit=crop&crop=center',
      'Cargo_Shorts.png': 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=400&fit=crop&crop=center',
      'Athletic_Joggers.png': 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop&crop=center',
      'Fishnet_Leggings.png': 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop&crop=center',
      'Fingerless_Gloves.png': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center',
      'Beaded_Bracelet.png': 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400&h=400&fit=crop&crop=center',
      'Body_Chain.png': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop&crop=center',
      'Cyberpunk_Bodysuit.png': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=center',
      'Anime_School_Uniform.png': 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop&crop=center',
      'Ballet_Leotard_Set.png': 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop&crop=center',
      'Boho_Maxi_Dress.png': 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=400&h=400&fit=crop&crop=center',
      'Astronaut_Suit.png': 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=400&fit=crop&crop=center',
      'Fairy_Costume.png': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center'
    };

    // Return mapped URL if available, otherwise return a clothing-themed placeholder
    return imageUrlMappings[fileName] || `https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center&q=80&auto=format&txt=${encodeURIComponent(fileName.replace('.png', '').replace(/_/g, ' '))}`;
  }

  private determineSubcategory(name: string, category: string): string {
    const subcategoryMappings: Record<string, Record<string, string>> = {
      'Tops': {
        'tee': 'T-Shirts',
        'shirt': 'Shirts',
        'jacket': 'Jackets',
        'hoodie': 'Hoodies',
        'vest': 'Vests',
        'blouse': 'Blouses',
        'corset': 'Corsets',
        'tank': 'Tank Tops',
        'tunic': 'Tunics'
      },
      'Bottoms': {
        'jeans': 'Jeans',
        'shorts': 'Shorts',
        'leggings': 'Leggings',
        'skirt': 'Skirts',
        'trousers': 'Trousers',
        'joggers': 'Joggers'
      },
      'Footwear': {
        'boots': 'Boots',
        'sandals': 'Sandals',
        'shoes': 'Shoes',
        'sneakers': 'Sneakers'
      }
    };

    const categoryMap = subcategoryMappings[category];
    if (!categoryMap) return 'Other';

    const lowerName = name.toLowerCase();
    for (const [keyword, subcategory] of Object.entries(categoryMap)) {
      if (lowerName.includes(keyword)) {
        return subcategory;
      }
    }

    return 'Other';
  }

  private generateDescription(name: string, category: string): string {
    return `Stylish ${name.toLowerCase()} perfect for avatar customization in the ${category.toLowerCase()} category.`;
  }

  private generateTags(name: string, category: string): string[] {
    const tags = [category.toLowerCase()];
    const words = name.toLowerCase().split(' ');
    
    // Add relevant style tags
    const styleTags = ['casual', 'formal', 'sporty', 'vintage', 'modern', 'anime', 'cosplay', 'cyber', 'goth'];
    for (const tag of styleTags) {
      if (words.some(word => word.includes(tag))) {
        tags.push(tag);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private determineStyle(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('anime')) return 'Anime';
    if (lowerName.includes('cyber')) return 'Cyberpunk';
    if (lowerName.includes('goth')) return 'Gothic';
    if (lowerName.includes('vintage')) return 'Vintage';
    if (lowerName.includes('military')) return 'Military';
    if (lowerName.includes('athletic') || lowerName.includes('sport')) return 'Athletic';
    if (lowerName.includes('formal')) return 'Formal';
    if (lowerName.includes('casual')) return 'Casual';
    
    return 'Modern';
  }

  private determineColor(name: string): string {
    const lowerName = name.toLowerCase();
    
    const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'brown', 'gray'];
    for (const color of colors) {
      if (lowerName.includes(color)) {
        return color.charAt(0).toUpperCase() + color.slice(1);
      }
    }
    
    return 'Multi-Color';
  }

  private determineMaterial(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('leather')) return 'Leather';
    if (lowerName.includes('silk')) return 'Silk';
    if (lowerName.includes('linen')) return 'Linen';
    if (lowerName.includes('mesh')) return 'Mesh';
    if (lowerName.includes('lace')) return 'Lace';
    if (lowerName.includes('velvet')) return 'Velvet';
    if (lowerName.includes('sequin')) return 'Sequin';
    if (lowerName.includes('denim')) return 'Denim';
    
    return 'Cotton';
  }

  private determineSeason(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('winter') || lowerName.includes('warm')) return 'Winter';
    if (lowerName.includes('summer') || lowerName.includes('tank') || lowerName.includes('shorts')) return 'Summer';
    if (lowerName.includes('spring')) return 'Spring';
    if (lowerName.includes('fall') || lowerName.includes('autumn')) return 'Fall';
    
    return 'All Season';
  }

  private determineOccasion(name: string, category: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('formal') || lowerName.includes('suit')) return 'Formal';
    if (lowerName.includes('party') || lowerName.includes('festival')) return 'Party';
    if (lowerName.includes('casual')) return 'Casual';
    if (lowerName.includes('athletic') || lowerName.includes('sport')) return 'Athletic';
    if (lowerName.includes('work') || lowerName.includes('office')) return 'Work';
    if (lowerName.includes('beach') || lowerName.includes('swim')) return 'Beach';
    if (category === 'Cultural / Cosplay') return 'Cosplay';
    
    return 'Everyday';
  }

  async getWearableStats(): Promise<any> {
    const stats = await this.prismaService.wearableItem.groupBy({
      by: ['category'],
      _count: { category: true }
    });

    const withImages = await this.prismaService.wearableItem.count({
      where: { hasImage: true }
    });

    const total = await this.prismaService.wearableItem.count();

    return {
      totalItems: total,
      itemsWithImages: withImages,
      itemsWithoutImages: total - withImages,
      imageMatchRate: ((withImages / total) * 100).toFixed(2) + '%',
      categoryBreakdown: stats.map(stat => ({
        category: stat.category,
        count: stat._count.category
      }))
    };
  }
} 