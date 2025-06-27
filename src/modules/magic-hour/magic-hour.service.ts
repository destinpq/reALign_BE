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
          'https://api.magichour.ai/v1/ai-headshot-generator',
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

      console.log('🎯 Magic Hour API Response:', JSON.stringify(response.data, null, 2));
      
      // Magic Hour API returns job info - return this directly
      const jobId = response.data?.id;
      
      if (!jobId) {
        console.error('❌ No job ID found in Magic Hour response');
        throw new HttpException('Magic Hour job creation failed', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      console.log('✅ Magic Hour job created successfully:', jobId);
      console.log('⚠️  Magic Hour uses webhooks, not polling. Job will complete asynchronously.');

      // Magic Hour uses webhooks for completion notifications, not polling
      // For now, return the job ID and let the webhook handle completion
      // TODO: Implement webhook endpoint to handle Magic Hour completion
      
      return {
        success: true,
        data: {
          prompt: "professional, business attire, good posture",
          jobId: jobId,
          status: 'processing',
          message: 'Magic Hour job created successfully. Processing will complete asynchronously via webhook.',
          originalImageUrl: imageUrl,
          // Note: Magic Hour uses webhooks for completion, not polling
          // The actual image URL will be available when the webhook is called
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

  // Webhook handler for Magic Hour completion notifications
  async handleWebhookCompletion(webhookData: any): Promise<any> {
    try {
      console.log('🎣 Magic Hour webhook received:', JSON.stringify(webhookData, null, 2));
      
      const { type, payload } = webhookData;
      
      if (type === 'image.completed' && payload?.status === 'complete') {
        const jobId = payload.id;
        const downloadUrl = payload.downloads?.[0]?.url;
        
        if (!downloadUrl) {
          console.error('❌ No download URL in Magic Hour webhook:', payload);
          return { success: false, error: 'No download URL provided' };
        }
        
        console.log('✅ Magic Hour job completed:', jobId);
        console.log('🔽 Downloading image from:', downloadUrl);
        
        // Download the image and upload to S3
        const imageResponse = await firstValueFrom(
          this.httpService.get(downloadUrl, { responseType: 'arraybuffer' })
        );

        const buffer = Buffer.from(imageResponse.data);
        const fileName = `${Date.now()}.png`;
        const s3Key = `headshots/${fileName}`;

        const uploadResult = await this.s3UploadService.uploadBufferToS3(
          buffer,
          s3Key,
          'image/png'
        );

        console.log('✅ Uploaded to S3:', uploadResult);

        // TODO: Store the result in database with jobId as reference
        // so the frontend can retrieve it later
        
        return {
          success: true,
          data: {
            jobId: jobId,
            s3Url: uploadResult,
            httpsUrl: uploadResult,
            fileName,
            s3Key,
            status: 'completed'
          }
        };
      }
      
      return { success: true, message: 'Webhook processed' };
      
    } catch (error) {
      console.error('❌ Error processing Magic Hour webhook:', error);
      return { success: false, error: error.message };
    }
  }

} 