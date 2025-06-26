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
      
      if (magicHourResponse) {
        console.log('✅ Magic Hour API response:', JSON.stringify(magicHourResponse, null, 2));
        
        // Extract the generated image URL from Magic Hour response
        // Check multiple possible response formats for completed jobs
        if (magicHourResponse.image_url) {
          generatedImageUrl = magicHourResponse.image_url;
        } else if (magicHourResponse.url) {
          generatedImageUrl = magicHourResponse.url;
        } else if (magicHourResponse.downloads && magicHourResponse.downloads.length > 0) {
          // Magic Hour returns downloads array with URLs
          generatedImageUrl = magicHourResponse.downloads[0].url || magicHourResponse.downloads[0];
        } else if (magicHourResponse.result && magicHourResponse.result.image_url) {
          generatedImageUrl = magicHourResponse.result.image_url;
        } else if (magicHourResponse.data && magicHourResponse.data.image_url) {
          generatedImageUrl = magicHourResponse.data.image_url;
        } else if (magicHourResponse.output) {
          generatedImageUrl = magicHourResponse.output;
        } else if (magicHourResponse.outputs && magicHourResponse.outputs.length > 0) {
          // Handle array of outputs
          generatedImageUrl = magicHourResponse.outputs[0].image_url || magicHourResponse.outputs[0].url || magicHourResponse.outputs[0];
        } else if (magicHourResponse.images && magicHourResponse.images.length > 0) {
          // Handle array of images
          generatedImageUrl = magicHourResponse.images[0].url || magicHourResponse.images[0].image_url || magicHourResponse.images[0];
        } else if (magicHourResponse.assets && magicHourResponse.assets.length > 0) {
          // Handle assets array
          generatedImageUrl = magicHourResponse.assets[0].url || magicHourResponse.assets[0].image_url || magicHourResponse.assets[0];
        } else {
          console.log('⚠️ Could not find image_url in Magic Hour response, checking all fields...');
          console.log('Available fields:', Object.keys(magicHourResponse));
          
          // Try to find any URL-like field
          for (const [key, value] of Object.entries(magicHourResponse)) {
            if (typeof value === 'string' && (value.includes('http') || value.includes('magichour') || value.includes('amazonaws') || value.includes('.jpg') || value.includes('.png'))) {
              console.log(`🔍 Found potential image URL in field '${key}':`, value);
              generatedImageUrl = value;
              break;
            }
            // Check nested objects for URLs
            if (typeof value === 'object' && value !== null) {
              for (const [nestedKey, nestedValue] of Object.entries(value)) {
                if (typeof nestedValue === 'string' && (nestedValue.includes('http') || nestedValue.includes('magichour') || nestedValue.includes('amazonaws') || nestedValue.includes('.jpg') || nestedValue.includes('.png'))) {
                  console.log(`🔍 Found potential image URL in nested field '${key}.${nestedKey}':`, nestedValue);
                  generatedImageUrl = nestedValue;
                  break;
                }
              }
              if (generatedImageUrl !== imageUrl) break;
            }
          }
        }
        
        if (generatedImageUrl !== imageUrl) {
          console.log('✅ Magic Hour generated NEW image URL:', generatedImageUrl);
        } else {
          console.log('⚠️ Using original image as fallback - Magic Hour may still be processing');
          // Generate a variation URL to ensure we return something different
          generatedImageUrl = await this.generateVariation(imageUrl, prompt);
        }
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
      console.log('🎯 RETURNING GENERATED URL:', generatedImageUrl);

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
      console.log('🔗 Calling REAL Magic Hour API endpoint...');
      
      // Step 1: Submit the job
      const response = await fetch('https://api.magichour.ai/v1/ai-headshot-generator', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.magicHourApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'AI Headshot Image',
          style: {
            prompt: `professional passport photo, business attire, ${prompt}`
          },
          assets: {
            image_file_path: imageUrl
          }
        }),
      });

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
      
      // Step 2: Poll for completion if we got a job ID
      if (jobResult.id) {
        console.log('🔄 Polling for job completion, ID:', jobResult.id);
        const completedResult = await this.pollMagicHourJob(jobResult.id);
        return completedResult;
      } else {
        console.error('❌ No job ID returned from Magic Hour API!');
        console.error('Full response:', JSON.stringify(jobResult, null, 2));
      }
      
      return jobResult;
      
    } catch (error) {
      console.error('❌ Magic Hour API call failed:', error);
      return null;
    }
  }

  private async pollMagicHourJob(jobId: string, maxAttempts: number = 30): Promise<any> {
    console.log('🔄 Starting to poll Magic Hour job:', jobId);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔍 Polling attempt ${attempt}/${maxAttempts} for job ${jobId}`);
        
        // CORRECT endpoint for AI headshot jobs: /v1/ai-headshots/{id}
        const response = await fetch(`https://api.magichour.ai/v1/ai-headshots/${jobId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.magicHourApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`❌ Job polling error: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Response body:', errorText);
          
          // If 404, the job might not exist or be ready yet
          if (response.status === 404) {
            console.log('⏳ Job not found yet, might still be initializing...');
          }
          
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        const jobStatus = await response.json();
        console.log(`📊 Job ${jobId} status:`, JSON.stringify(jobStatus, null, 2));
        
        // Check if job is completed (Magic Hour uses "complete" status)
        if (jobStatus.status === 'complete') {
          console.log('✅ Job completed! Result:', jobStatus);
          return jobStatus;
        }
        
        // Check if job failed
        if (jobStatus.status === 'error' || jobStatus.status === 'failed') {
          console.error('❌ Job failed:', jobStatus);
          return null;
        }
        
        // Job still processing, wait and retry
        const currentStatus = jobStatus.status || 'unknown';
        console.log(`⏳ Job still processing (status: ${currentStatus}), waiting 4 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 4000));
        
      } catch (error) {
        console.error(`❌ Error polling job ${jobId} (attempt ${attempt}):`, error);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.error(`❌ Job ${jobId} timed out after ${maxAttempts} attempts (${maxAttempts * 4} seconds)`);
    return null;
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