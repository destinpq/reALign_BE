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
      console.log('🔄 Polling for completion...');

      // Poll for completion (like we tested before!)
      const result = await this.pollForCompletion(jobId);
      console.log('🔍 Full Magic Hour result:', JSON.stringify(result, null, 2));
      
      // Magic Hour returns download URLs in the downloads array when job is completed
      const generatedImageUrl = result?.downloads?.[0]?.url;
      
      if (!generatedImageUrl) {
        console.error('❌ No image URL found in Magic Hour response:', result);
        throw new HttpException('Image generation failed - no image URL returned', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      console.log('✅ Got image URL from Magic Hour:', generatedImageUrl);
      
      // Download and upload to S3 (like we tested!)
      console.log('🔽 Downloading image from Magic Hour URL:', generatedImageUrl);
      
      if (!generatedImageUrl || !generatedImageUrl.startsWith('http')) {
        throw new HttpException('Invalid image URL from Magic Hour', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
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

      console.log('✅ Uploaded to S3:', uploadResult);

      return {
        success: true,
        data: {
          prompt: "professional, business attire, good posture",
          s3Url: uploadResult,
          httpsUrl: uploadResult,
          fileName,
          s3Key,
          originalImageUrl: imageUrl,
          jobId: jobId
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

  
  private async pollForCompletion(jobId: string, maxAttempts = 30): Promise<any> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Polling attempt ${attempt} for job: ${jobId}`);
        
        // Try different polling endpoints that might work
        const possibleEndpoints = [
          `https://api.magichour.ai/v1/ai-headshot-generator/${jobId}`,
          `https://api.magichour.ai/v1/jobs/${jobId}`,
          `https://api.magichour.ai/v1/ai-headshot-generator/jobs/${jobId}`
        ];

        let response;
        let lastError;

        for (const endpoint of possibleEndpoints) {
          try {
            response = await firstValueFrom(
              this.httpService.get(endpoint, {
                headers: {
                  'Authorization': `Bearer ${this.magicHourApiKey}`,
                },
              })
            );
            console.log(`✅ Successfully polled endpoint: ${endpoint}`);
            break;
          } catch (endpointError) {
            console.log(`❌ Failed to poll ${endpoint}:`, endpointError.response?.status);
            lastError = endpointError;
            continue;
          }
        }

        if (!response) {
          throw lastError || new Error('All polling endpoints failed');
        }

        console.log(`📊 Job status:`, response.data?.status);
        console.log(`📊 Full response:`, JSON.stringify(response.data, null, 2));

        if (response.data.status === 'completed' && response.data.downloads?.length > 0) {
          console.log('🎉 Job completed successfully!');
          return response.data;
        }

        if (response.data.status === 'failed') {
          throw new Error('Magic Hour job failed');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`❌ Polling attempt ${attempt} failed:`, error.message);
        if (attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Magic Hour job timed out');
  }
} 