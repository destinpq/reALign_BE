import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWearableDto, UpdateWearableDto, WearableQueryDto } from './dto/wearables.dto';

@Injectable()
export class WearablesService {
  constructor(private prisma: PrismaService) {}

  async getAllWearables(query: WearableQueryDto) {
    const { category, search, page = 1, limit = 20, isActive = true } = query;

    const where: any = { isActive };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [wearables, total] = await Promise.all([
      this.prisma.wearable_items.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          
          category: true,
          name: true,
          description: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              user_wearable_selections: true,
            },
          },
        },
      }),
      this.prisma.wearable_items.count({ where }),
    ]);

    return {
      data: wearables,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWearableById(id: string) {
    const wearable = await this.prisma.wearable_items.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            user_wearable_selections: true,
          },
        },
      },
    });

    if (!wearable) {
      throw new NotFoundException('Wearable item not found');
    }

    return wearable;
  }

  async getCategories() {
    const categories = await this.prisma.wearable_items.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: {
        category: true,
      },
      orderBy: {
        category: 'asc',
      },
    });

    return categories.map(cat => ({
      category: cat.category,
      count: cat._count.category,
    }));
  }

  async createWearable(createWearableDto: CreateWearableDto) {
    // Check if ID already exists
    const existing = await this.prisma.wearable_items.findUnique({
      where: { id: createWearableDto.id },
    });

    if (existing) {
      throw new ConflictException('Wearable with this ID already exists');
    }

    return this.prisma.wearable_items.create({
      data: createWearableDto,
    });
  }

  async updateWearable(id: string, updateWearableDto: UpdateWearableDto) {
    const wearable = await this.prisma.wearable_items.findUnique({
      where: { id },
    });

    if (!wearable) {
      throw new NotFoundException('Wearable item not found');
    }

    return this.prisma.wearable_items.update({
      where: { id },
      data: updateWearableDto,
    });
  }

  async deleteWearable(id: string) {
    const wearable = await this.prisma.wearable_items.findUnique({
      where: { id },
    });

    if (!wearable) {
      throw new NotFoundException('Wearable item not found');
    }

    return this.prisma.wearable_items.delete({
      where: { id },
    });
  }

  async selectWearables(userId: string, wearableIds: string[]) {
    // Verify all wearable IDs exist
    const wearables = await this.prisma.wearable_items.findMany({
      where: { id: { in: wearableIds }, isActive: true },
    });

    if (wearables.length !== wearableIds.length) {
      throw new NotFoundException('One or more wearable items not found');
    }

    // Remove existing selections for this user
    await this.prisma.user_wearable_selections.deleteMany({
      where: { userId },
    });

    // Create new selections
    const selections = await this.prisma.user_wearable_selections.createMany({
      data: wearableIds.map(wearableItemId => ({
        userId,
        wearableItemId,
      })),
    });

    return selections;
  }

  async getUserSelections(userId: string) {
    return this.prisma.user_wearable_selections.findMany({
      where: { userId },
      include: {
        wearable_items: {
          select: {
            id: true,
            category: true,
            name: true,
            description: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { selectedAt: 'desc' },
    });
  }

  async removeUserSelection(userId: string, wearableId: string) {
    const selection = await this.prisma.user_wearable_selections.findUnique({
      where: {
        userId_wearableItemId: {
          userId,
          wearableItemId: wearableId,
        },
      },
    });

    if (!selection) {
      throw new NotFoundException('Selection not found');
    }

    return this.prisma.user_wearable_selections.delete({
      where: {
        userId_wearableItemId: {
          userId,
          wearableItemId: wearableId,
        },
      },
    });
  }

  async bulkCreateWearables(wearables: CreateWearableDto[]) {
    // Get existing IDs to avoid duplicates
    const existingIds = await this.prisma.wearable_items.findMany({
      where: {
        id: {
          in: wearables.map(w => w.id),
        },
      },
      select: { id: true },
    });

    const existingIdSet = new Set(existingIds.map(w => w.id));
    const newWearables = wearables.filter(w => !existingIdSet.has(w.id));

    if (newWearables.length === 0) {
      return { created: 0, skipped: wearables.length };
    }

    const result = await this.prisma.wearable_items.createMany({
      data: newWearables.map(w => ({
        ...w,
        name: w.name, // Map to wearableName in DB
      })),
      skipDuplicates: true,
    });

    return {
      created: result.count,
      skipped: wearables.length - result.count,
    };
  }

  async importFromCSV(csvData: Array<{ ID: string; Category: string; 'Wearable Item': string }>) {
    const wearables = csvData.map(row => ({
      
      category: row.Category,
      name: row['Wearable Item'],
    }));

    return this.bulkImport(wearables);
  }

  // Methods expected by controller
  async create(createWearableDto: any) {
    return this.createWearable(createWearableDto);
  }

  async findAll(query: any) {
    console.log('🔍 WearablesService.findAll called with query:', query);
    const result = await this.getAllWearables(query);
    console.log(`✅ WearablesService.findAll returning ${result.data?.length || 0} items`);
    return result;
  }

  async findOne(id: string) {
    return this.getWearableById(id);
  }

  async update(id: string, updateWearableDto: any) {
    return this.updateWearable(id, updateWearableDto);
  }

  async remove(id: string) {
    return this.deleteWearable(id);
  }

  async updateUserSelections(userId: string, wearableIds: string[]) {
    return this.selectWearables(userId, wearableIds);
  }

  async bulkImport(wearables: any[]) {
    return this.bulkCreateWearables(wearables);
  }
} 