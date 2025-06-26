import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WearableImageMapperService } from '../../services/wearable-image-mapper.service';

export interface WearableSearchFilters {
  category?: string;
  subcategory?: string;
  style?: string;
  color?: string;
  material?: string;
  season?: string;
  occasion?: string;
  hasImage?: boolean;
  tags?: string[];
  query?: string;
}

@Injectable()
export class EnhancedWearablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageMapperService: WearableImageMapperService,
  ) {}

  async findAll(page = 1, limit = 50, filters: WearableSearchFilters = {}) {
    const skip = (page - 1) * limit;
    
    const where: any = {
      isActive: true,
    };

    // Apply filters
    if (filters.category) where.category = filters.category;
    if (filters.subcategory) where.subcategory = filters.subcategory;
    if (filters.style) where.style = filters.style;
    if (filters.color) where.color = filters.color;
    if (filters.material) where.material = filters.material;
    if (filters.season) where.season = filters.season;
    if (filters.occasion) where.occasion = filters.occasion;
    if (filters.hasImage !== undefined) where.hasImage = filters.hasImage;
    
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { tags: { hasSome: [filters.query.toLowerCase()] } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.wearable_items.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { hasImage: 'desc' }, // Items with images first
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      }),
      this.prisma.wearable_items.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByCategory(category: string, page = 1, limit = 50) {
    return this.findAll(page, limit, { category });
  }

  async findOne(id: string) {
    return this.prisma.wearable_items.findUnique({
      where: { id },
      include: {
        user_wearable_selections: {
          select: {
            userId: true,
            selectedAt: true,
          },
        },
      },
    });
  }

  async searchWearables(query: string, filters: WearableSearchFilters = {}, page = 1, limit = 50) {
    return this.findAll(page, limit, { ...filters, query });
  }

  async getCategories() {
    const categories = await this.prisma.wearable_items.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { category: true },
      orderBy: { category: 'asc' },
    });

    return categories.map(cat => ({
      name: cat.category,
      count: cat._count.category,
    }));
  }

  async getSubcategories(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;

    const subcategories = await this.prisma.wearable_items.groupBy({
      by: ['subcategory'],
      where,
      _count: { subcategory: true },
      orderBy: { subcategory: 'asc' },
    });

    return subcategories
      .filter(sub => sub.subcategory !== null)
      .map(sub => ({
        name: sub.subcategory,
        count: sub._count.subcategory,
      }));
  }

  async getFilterOptions() {
    const [styles, colors, materials, seasons, occasions] = await Promise.all([
      this.prisma.wearable_items.groupBy({
        by: ['style'],
        where: { isActive: true, style: { not: null } },
        _count: { style: true },
      }),
      this.prisma.wearable_items.groupBy({
        by: ['color'],
        where: { isActive: true, color: { not: null } },
        _count: { color: true },
      }),
      this.prisma.wearable_items.groupBy({
        by: ['material'],
        where: { isActive: true, material: { not: null } },
        _count: { material: true },
      }),
      this.prisma.wearable_items.groupBy({
        by: ['season'],
        where: { isActive: true, season: { not: null } },
        _count: { season: true },
      }),
      this.prisma.wearable_items.groupBy({
        by: ['occasion'],
        where: { isActive: true, occasion: { not: null } },
        _count: { occasion: true },
      }),
    ]);

    return {
      styles: styles.map(s => ({ name: s.style, count: s._count.style })),
      colors: colors.map(c => ({ name: c.color, count: c._count.color })),
      materials: materials.map(m => ({ name: m.material, count: m._count.material })),
      seasons: seasons.map(s => ({ name: s.season, count: s._count.season })),
      occasions: occasions.map(o => ({ name: o.occasion, count: o._count.occasion })),
    };
  }

  async getWearableStats() {
    return this.imageMapperService.getWearableStats();
  }

  async getImageMappings() {
    return this.imageMapperService.mapWearablesToImages();
  }

  async refreshImageMappings() {
    await this.imageMapperService.populateWearableDatabase();
    return { success: true, message: 'Image mappings refreshed successfully' };
  }

  async getFeaturedWearables(limit = 20) {
    // Get items with high-confidence image mappings
    return this.prisma.wearable_items.findMany({
      where: {
        isActive: true,
        hasImage: true,
        imageMapping: {
          path: ['matchConfidence'],
          gte: 70,
        },
      },
      take: limit,
      orderBy: [
        { id: 'desc' }, // Simplified sorting
        { name: 'asc' },
      ],
    });
  }

  async getPopularTags(limit = 20) {
    // This would require a more complex query to count tag occurrences
    // For now, return a simplified version
    const items = await this.prisma.wearable_items.findMany({
      where: { isActive: true },
      select: { tags: true },
    });

    const tagCounts: Record<string, number> = {};
    items.forEach(item => {
      item.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  async getImageMappingStats() {
    const total = await this.prisma.wearable_items.count();
    const withImages = await this.prisma.wearable_items.count({
      where: { hasImage: true }
    });

    const mappingTypes = await this.prisma.wearable_items.groupBy({
      by: ['imageMapping'],
      where: { hasImage: true },
      _count: { imageMapping: true },
    });

    // Process mapping types from JSON
    const typeStats: Record<string, number> = {};
    mappingTypes.forEach(item => {
      if (item.imageMapping && typeof item.imageMapping === 'object') {
        const mappingData = item.imageMapping as any;
        const type = mappingData.mappingType || 'UNKNOWN';
        typeStats[type] = (typeStats[type] || 0) + item._count.imageMapping;
      }
    });

    return {
      totalItems: total,
      itemsWithImages: withImages,
      itemsWithoutImages: total - withImages,
      imageMatchRate: ((withImages / total) * 100).toFixed(2) + '%',
      mappingTypeBreakdown: Object.entries(typeStats).map(([type, count]) => ({
        type,
        count
      }))
    };
  }

  async getGoogleDriveImages() {
    // Return the list of available Google Drive images
    const mappings = await this.imageMapperService.mapWearablesToImages();
    const uniqueImages = [...new Set(mappings.map(m => m.imageFileName))];
    
    return uniqueImages.map(fileName => ({
      fileName,
      url: `https://drive.google.com/uc?id=PLACEHOLDER_${fileName.replace('.png', '')}`,
      mappedItems: mappings.filter(m => m.imageFileName === fileName).length
    }));
  }
} 