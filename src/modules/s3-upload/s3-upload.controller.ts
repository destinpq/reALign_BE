import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { S3UploadService } from './s3-upload.service';

@Controller('s3-upload')
export class S3UploadController {
  private readonly logger = new Logger(S3UploadController.name);

  constructor(private readonly s3UploadService: S3UploadService) {}

  @Get('upload-headshot')
  async uploadHeadshot(@Query('imageUrl') imageUrl?: string) {
    try {
      // Use provided URL or default test URL
      const testImageUrl = imageUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face';
      
      this.logger.log(`Starting upload for: ${testImageUrl}`);
      
      const s3Url = await this.s3UploadService.downloadAndUploadToS3(testImageUrl, 'headshots');
      
      return {
        success: true,
        url: s3Url,
        message: 'Image successfully downloaded and uploaded to S3'
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: 'Upload failed',
        details: error.message
      };
    }
  }

  @Post('upload-from-url')
  async uploadFromUrl(@Body() body: { imageUrl: string; folder?: string }) {
    try {
      const { imageUrl, folder = 'headshots' } = body;
      
      if (!imageUrl) {
        return {
          success: false,
          error: 'imageUrl is required'
        };
      }

      this.logger.log(`Uploading from URL: ${imageUrl}`);
      
      const s3Url = await this.s3UploadService.downloadAndUploadToS3(imageUrl, folder);
      
      return {
        success: true,
        url: s3Url,
        originalUrl: imageUrl,
        message: 'Image successfully downloaded and uploaded to S3'
      };
    } catch (error) {
      this.logger.error(`Upload from URL failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: 'Upload failed',
        details: error.message
      };
    }
  }
} 