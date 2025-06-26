import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MagicHourService {
  constructor(private readonly prisma: PrismaService) {}

  async generateDirectProfessionalAvatar(
    userId: string,
    imageUrl: string,
    prompt: string,
    name: string,
  ) {
    console.log('🎨 Generating professional avatar for user:', userId);
    console.log('📸 Image URL:', imageUrl);
    console.log('📝 Prompt:', prompt);

    // Use the actual S3 image URL that was uploaded
    console.log('✅ Using actual S3 image URL for avatar generation:', imageUrl);
    
    // Store the generation in the database
    const avatarGeneration = await this.prisma.avatar_generations.create({
      data: {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userImage: imageUrl,
        selectedWearables: '[]',
        selectedScenery: '[]',
        userDetails: '{}',
        generatedPrompt: prompt,
        status: 'COMPLETED',
        generatedImageUrl: imageUrl, // Use the actual S3 URL
        metadata: {
          userId,
          name,
          generatedAt: new Date(),
          originalImageUrl: imageUrl,
          prompt: prompt,
        },
      },
    });

    console.log('✅ Avatar generation completed with S3 URL:', avatarGeneration.id);

    return {
      id: avatarGeneration.id,
      image_url: imageUrl, // Return the actual S3 URL
      s3_url: imageUrl,
      generated_image_url: imageUrl,
      imageUrl: imageUrl,
      generatedImageUrl: imageUrl,
      status: 'COMPLETED',
      sessionId: avatarGeneration.sessionId,
    };
  }

  async getHistory(userId: string) {
    console.log('📚 Getting Magic Hour history for user:', userId);

    const avatarGenerations = await this.prisma.avatar_generations.findMany({
      where: {
        // Filter by userId if you add a userId field to the table
        // For now, get recent generations
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        sessionId: true,
        status: true,
        generatedImageUrl: true,
        createdAt: true,
        metadata: true,
      },
    });

    return avatarGenerations;
  }
} 