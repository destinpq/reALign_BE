import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { S3UploadService } from '../s3-upload/s3-upload.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MagicHourService {
  private readonly magicHourApiKey: string;
  private readonly magicHourBaseUrl = 'https://api.magichour.ai';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly s3UploadService: S3UploadService,
  ) {
    this.magicHourApiKey = this.configService.get<string>('MAGIC_HOUR_API_KEY');
    if (!this.magicHourApiKey) {
      throw new Error('MAGIC_HOUR_API_KEY is not configured');
    }
  }

  async generateAndUploadImage(prompt: string): Promise<any> {
    try {
      const enhancedPrompt = `professional headshot portrait, ${prompt}, high-quality photography, studio lighting, business attire, clean background, professional headshot style`;
      
      // Use the direct image generation endpoint - NO POLLING NEEDED
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.magicHourBaseUrl}/v1/ai-image-generator-sync`,
          {
            prompt: enhancedPrompt,
            aspect_ratio: 'portrait',
            style: 'photorealistic',
            quality: 'standard',
          },
          {
            headers: {
              'X-API-Key': this.magicHourApiKey,
              'Content-Type': 'application/json',
            },
            timeout: 60000, // 60 second timeout
          }
        )
      );

      const imageUrl = response.data?.image_url || response.data?.url || response.data?.downloads?.[0]?.url;
      
      if (!imageUrl) {
        throw new HttpException('Image generation failed - no image URL returned', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      // Download and upload to S3
      const imageResponse = await firstValueFrom(
        this.httpService.get(imageUrl, { responseType: 'arraybuffer' })
      );

      const buffer = Buffer.from(imageResponse.data);
      const fileName = `${Date.now()}.png`;
      const s3Key = `headshots/${fileName}`;

      const uploadResult = await this.s3UploadService.uploadBufferToS3(
        buffer,
        s3Key,
        'image/png'
      );

      return {
        success: true,
        data: {
          prompt: enhancedPrompt,
          s3Url: uploadResult,
          httpsUrl: uploadResult,
          fileName,
          s3Key,
        }
      };

    } catch (error) {
      throw new HttpException(
        `Headshot generation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  
} 