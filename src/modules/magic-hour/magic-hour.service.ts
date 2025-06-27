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

  async generateAndUploadImage(prompt: string, imageUrl: string): Promise<any> {
    try {
      if (!imageUrl) {
        throw new HttpException('Image URL is required', HttpStatus.BAD_REQUEST);
      }

      // EXACT format as specified
      const requestBody = {
        name: `Ai Headshot - ${new Date().toISOString()}`,
        style: {
          prompt: "professional, business attire, good posture"
        },
        assets: {
          image_file_path: imageUrl
        }
      };

      console.log('🚀 Magic Hour Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.magicHourBaseUrl}/v1/ai-headshot-generator`,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${this.magicHourApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          }
        )
      );

      const generatedImageUrl = response.data?.image_url || response.data?.url || response.data?.downloads?.[0]?.url;
      
      if (!generatedImageUrl) {
        throw new HttpException('Image generation failed - no image URL returned', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      // Download and upload to S3
      const imageResponse = await firstValueFrom(
        this.httpService.get(generatedImageUrl, { responseType: 'arraybuffer' })
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
          prompt: `professional, business attire, good posture, ${prompt}`,
          s3Url: uploadResult,
          httpsUrl: uploadResult,
          fileName,
          s3Key,
          originalImageUrl: imageUrl,
        }
      };

    } catch (error) {
      // Log the actual error response for debugging
      if (error.response?.data) {
        console.error('Magic Hour API Error Response:', error.response.data);
      }
      throw new HttpException(
        `Headshot generation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  
} 