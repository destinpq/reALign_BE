import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomizationDto, UpdateCustomizationDto } from './dto/customizations.dto';

@Injectable()
export class CustomizationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(userId: string, createCustomizationDto: CreateCustomizationDto) {
    return this.prismaService.avatar_customizations.create({
      data: {
        userId,
        ...createCustomizationDto,
      },
    });
  }

  async findAll(userId: string) {
    return this.prismaService.avatar_customizations.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const customization = await this.prismaService.avatar_customizations.findFirst({
      where: { id, userId },
    });

    if (!customization) {
      throw new NotFoundException('Customization not found');
    }

    return customization;
  }

  async update(userId: string, id: string, updateCustomizationDto: UpdateCustomizationDto) {
    await this.findOne(userId, id); // Check if exists

    return this.prismaService.avatar_customizations.update({
      where: { id },
      data: updateCustomizationDto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Check if exists

    await this.prismaService.avatar_customizations.delete({
      where: { id },
    });

    return { message: 'Customization deleted successfully' };
  }
} 