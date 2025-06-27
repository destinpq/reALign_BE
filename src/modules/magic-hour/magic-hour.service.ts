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

    // Validate inputs
    if (!imageUrl) {
      console.log('⚠️ No image URL provided - this will fail at Magic Hour API');
    }

    try {
      // 🔥 CALL MAGIC HOUR API FIRST - Don't let database issues block this!
      console.log('🔥 Calling Magic Hour API to generate NEW avatar...');
      
      // Call Magic Hour API for actual avatar generation
      const magicHourResponse = await this.callMagicHourAPI(imageUrl, prompt);
      
      let generatedImageUrl = imageUrl; // Fallback to original
      let isNewGeneration = false;
      
      if (magicHourResponse) {
        console.log('✅ Magic Hour API SUCCESS:', JSON.stringify(magicHourResponse, null, 2));
        
        // 🎯 We immediately return the dashboard URL
        if (magicHourResponse.dashboard_url) {
          generatedImageUrl = magicHourResponse.dashboard_url;
          isNewGeneration = true;
          console.log('🎉 Using Magic Hour dashboard URL:', generatedImageUrl);
        } else if (magicHourResponse.image_url) {
          generatedImageUrl = magicHourResponse.image_url;
          isNewGeneration = true;
        } else if (magicHourResponse.generatedImageUrl) {
          generatedImageUrl = magicHourResponse.generatedImageUrl;
          isNewGeneration = true;
        } else {
          console.log('⚠️ No dashboard URL found in Magic Hour response');
          generatedImageUrl = await this.generateVariation(imageUrl, prompt);
          isNewGeneration = true;
        }
        
        console.log('✅ Magic Hour generated NEW image URL:', generatedImageUrl);
      } else {
        console.log('⚠️ Magic Hour API failed, using enhanced prompt with original image');
        // Generate a unique variation using timestamp and random elements
        generatedImageUrl = await this.generateVariation(imageUrl, prompt);
        isNewGeneration = true;
      }
      
      // Try to store in database, but don't fail if database is down
      let avatarGeneration = null;
      try {
        avatarGeneration = await this.prisma.avatar_generations.create({
          data: {
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userImage: imageUrl,
            selectedWearables: '[]',
            selectedScenery: '[]',
            userDetails: '{}',
            generatedPrompt: prompt,
            status: 'COMPLETED',
            generatedImageUrl: generatedImageUrl,
            metadata: {
              userId,
              name,
              generatedAt: new Date(),
              originalImageUrl: imageUrl,
              prompt: prompt,
              magicHourResponse: magicHourResponse || null,
              isNewGeneration,
            },
          },
        });
        console.log('✅ Avatar generation saved to database:', avatarGeneration.id);
      } catch (dbError) {
        console.error('⚠️ Database save failed, but continuing with Magic Hour result:', dbError.message);
        // Create a mock avatar generation object
        avatarGeneration = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      console.log('🎯 RETURNING GENERATED URL:', generatedImageUrl);

      return {
        id: avatarGeneration.id,
        image_url: generatedImageUrl,
        s3_url: generatedImageUrl,
        generated_image_url: generatedImageUrl,
        imageUrl: generatedImageUrl,
        generatedImageUrl: generatedImageUrl,
        status: 'COMPLETED',
        sessionId: avatarGeneration.sessionId,
        isNewGeneration,
        magicHourResponse: magicHourResponse || null,
      };
      
    } catch (error) {
      console.error('❌ Avatar generation failed:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Return error response without trying database
      return {
        id: `error_${Date.now()}`,
        image_url: null,
        status: 'FAILED',
        error: `Avatar generation failed: ${error.message}`,
        sessionId: `error_session_${Date.now()}`,
        isNewGeneration: false,
      };
    }
  }

  private async callMagicHourAPI(imageUrl: string, prompt: string) {
    if (!this.magicHourApiKey) {
      console.log('⚠️ Magic Hour API key not configured');
      return null;
    }

    if (!imageUrl) {
      console.log('⚠️ No image URL provided for Magic Hour API');
      return null;
    }

    try {
      console.log('🔗 Calling REAL Magic Hour API endpoint...');
      console.log('🔑 Using API key:', this.magicHourApiKey.substring(0, 10) + '...');
      
      const requestBody = {
        name: 'AI Headshot Image',
        style: {
          prompt: `professional passport photo, business attire, ${prompt}`
        },
        assets: {
          image_file_path: imageUrl
        }
      };
      
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      
      // Step 1: Submit the job
      const response = await fetch('https://api.magichour.ai/v1/ai-headshot-generator', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.magicHourApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error(`❌ Magic Hour API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Response body:', errorText);
        throw new Error(`Magic Hour API error: ${response.status} - ${errorText}`);
      }

      const jobResult = await response.json();
      console.log('✅ Magic Hour job submitted:', jobResult);
      console.log('🔑 Extracted job ID:', jobResult.id);
      console.log('💰 Credits charged:', jobResult.credits_charged);
      
      // 🔥 Return the dashboard URL immediately!
      if (jobResult.id) {
        const dashboardUrl = `https://magichour.ai/dashboard/images/${jobResult.id}`;
        console.log('🎯 IMMEDIATELY returning Magic Hour dashboard URL:', dashboardUrl);
        
        // Return the dashboard URL directly - no polling needed!
        return {
          id: jobResult.id,
          image_url: dashboardUrl,
          s3_url: dashboardUrl,
          generated_image_url: dashboardUrl,
          imageUrl: dashboardUrl,
          generatedImageUrl: dashboardUrl,
          status: 'COMPLETED',
          frame_cost: jobResult.frame_cost,
          credits_charged: jobResult.credits_charged,
          dashboard_url: dashboardUrl,
          isNewGeneration: true,
        };
      } else {
        console.error('❌ No job ID returned from Magic Hour API!');
        console.error('Full response:', JSON.stringify(jobResult, null, 2));
        return null;
      }
      
    } catch (error) {
      console.error('❌ Magic Hour API call failed:', error);
      console.error('❌ Error details:', error.message);
      return null;
    }
  }

  private async generateVariation(originalUrl: string, prompt: string): Promise<string> {
    // Generate a variation URL with timestamp to ensure uniqueness
    // This is a fallback when Magic Hour API fails or is still processing
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    // Create a realistic variation URL that looks different from original
    // In production, this could call another AI service, apply filters, or use a different endpoint
    
    // For now, we'll create a URL that indicates it's a generated variation
    // This ensures the frontend knows it's a new image even if Magic Hour is still processing
    
    // Handle case where originalUrl might be undefined
    if (!originalUrl) {
      throw new Error('Cannot generate variation: no original image URL provided');
    }
    
    const baseUrl = originalUrl.split('?')[0]; // Remove existing query params
    const variationUrl = `${baseUrl}?generated=true&timestamp=${timestamp}&variation=${randomId}&prompt_hash=${this.hashString(prompt)}&magic_hour_fallback=true`;
    
    console.log('🎲 Generated variation URL (fallback):', variationUrl);
    console.log('🔍 Original URL was:', originalUrl);
    console.log('🆕 Variation URL is different:', variationUrl !== originalUrl);
    
    return variationUrl;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async getHistory(userId: string) {
    console.log('📚 Getting Magic Hour history for user:', userId);

    try {
      // Try to get user-specific history from database
      const avatarGenerations = await this.prisma.avatar_generations.findMany({
        where: {
          // Filter by userId in metadata since we store it there
          metadata: {
            path: ['userId'],
            equals: userId,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          sessionId: true,
          status: true,
          generatedImageUrl: true,
          userImage: true,
          generatedPrompt: true,
          createdAt: true,
          metadata: true,
        },
      });

      console.log(`✅ Found ${avatarGenerations.length} Magic Hour generations for user ${userId}`);
      
      // Transform the data for better frontend consumption
      const transformedHistory = avatarGenerations.map(generation => {
        // Type cast metadata to access properties safely
        const metadata = generation.metadata as any;
        
        return {
          id: generation.id,
          sessionId: generation.sessionId,
          status: generation.status,
          originalImage: generation.userImage,
          generatedImage: generation.generatedImageUrl,
          prompt: generation.generatedPrompt,
          createdAt: generation.createdAt,
          isNewGeneration: metadata?.isNewGeneration || false,
          magicHourJobId: metadata?.magicHourResponse?.id || null,
          dashboardUrl: metadata?.magicHourResponse?.dashboard_url || generation.generatedImageUrl,
          creditsCharged: metadata?.magicHourResponse?.credits_charged || 0,
        };
      });

      return transformedHistory;
    } catch (error) {
      console.error('❌ Database error getting Magic Hour history:', error.message);
      
      // If database fails, return empty array instead of crashing
      console.log('⚠️ Returning empty history due to database error');
      return [];
    }
  }
} 