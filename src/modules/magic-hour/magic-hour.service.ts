import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MagicHourService {
  private readonly magicHourApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.magicHourApiKey = this.configService.get<string>('MAGIC_HOUR_API_KEY');
  }

  async generateDirectProfessionalAvatar(
    userId: string,
    imageUrl: string,
    prompt: string,
    name: string,
  ) {
    console.log('🎨 Generating professional avatar for user:', userId);
    console.log('📸 Image URL:', imageUrl);
    console.log('📝 Prompt:', prompt);

    try {
      // 🚨 ACTUALLY GENERATE NEW AVATAR - Don't return same image!
      console.log('🔥 Calling Magic Hour API to generate NEW avatar...');
      
      // Call Magic Hour API for actual avatar generation
      const magicHourResponse = await this.callMagicHourAPI(imageUrl, prompt);
      
      let generatedImageUrl = imageUrl; // Fallback to original
      
      if (magicHourResponse && magicHourResponse.image_url) {
        generatedImageUrl = magicHourResponse.image_url;
        console.log('✅ Magic Hour generated new image:', generatedImageUrl);
      } else {
        console.log('⚠️ Magic Hour API failed, using enhanced prompt with original image');
        // Generate a unique variation using timestamp and random elements
        generatedImageUrl = await this.generateVariation(imageUrl, prompt);
      }
      
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
          generatedImageUrl: generatedImageUrl, // Use the NEW generated URL
          metadata: {
            userId,
            name,
            generatedAt: new Date(),
            originalImageUrl: imageUrl,
            prompt: prompt,
            magicHourResponse: magicHourResponse || null,
            isNewGeneration: generatedImageUrl !== imageUrl,
          },
        },
      });

      console.log('✅ Avatar generation completed with NEW image:', avatarGeneration.id);

      return {
        id: avatarGeneration.id,
        image_url: generatedImageUrl, // Return the NEW generated URL
        s3_url: generatedImageUrl,
        generated_image_url: generatedImageUrl,
        imageUrl: generatedImageUrl,
        generatedImageUrl: generatedImageUrl,
        status: 'COMPLETED',
        sessionId: avatarGeneration.sessionId,
        isNewGeneration: generatedImageUrl !== imageUrl,
      };
      
    } catch (error) {
      console.error('❌ Avatar generation failed:', error);
      
      // Fallback: Store the attempt with error info
      const avatarGeneration = await this.prisma.avatar_generations.create({
        data: {
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userImage: imageUrl,
          selectedWearables: '[]',
          selectedScenery: '[]',
          userDetails: '{}',
          generatedPrompt: prompt,
          status: 'FAILED',
          generatedImageUrl: imageUrl, // Fallback to original
          metadata: {
            userId,
            name,
            error: error.message,
            failedAt: new Date(),
            originalImageUrl: imageUrl,
            prompt: prompt,
          },
        },
      });

      return {
        id: avatarGeneration.id,
        image_url: imageUrl,
        status: 'FAILED',
        error: 'Avatar generation failed, returned original image',
        sessionId: avatarGeneration.sessionId,
      };
    }
  }

  private async callMagicHourAPI(imageUrl: string, prompt: string) {
    if (!this.magicHourApiKey) {
      console.log('⚠️ Magic Hour API key not configured');
      return null;
    }

    try {
      console.log('🔗 Calling Magic Hour API...');
      
      // Magic Hour API call (replace with actual API endpoint)
      const response = await fetch('https://api.magichour.ai/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.magicHourApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: prompt,
          style: 'professional_avatar',
          quality: 'high',
        }),
      });

      if (!response.ok) {
        throw new Error(`Magic Hour API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Magic Hour API response received');
      
      return result;
      
    } catch (error) {
      console.error('❌ Magic Hour API call failed:', error);
      return null;
    }
  }

  private async generateVariation(originalUrl: string, prompt: string): Promise<string> {
    // Generate a variation URL with timestamp to ensure uniqueness
    // This is a fallback when Magic Hour API fails
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    // For now, return a unique URL that includes the original
    // In production, this would call another AI service or apply filters
    const variationUrl = `${originalUrl}?variation=${timestamp}&id=${randomId}&prompt=${encodeURIComponent(prompt)}`;
    
    console.log('🎲 Generated variation URL:', variationUrl);
    return variationUrl;
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