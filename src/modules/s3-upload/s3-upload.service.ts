import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class S3UploadService {
  private readonly logger = new Logger(S3UploadService.name);
  private readonly s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async downloadAndUploadToS3(imageUrl: string, folder: string = 'headshots'): Promise<string> {
    try {
      this.logger.log(`Starting download and upload for: ${imageUrl}`);
      
      // Extract file extension from URL
      const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

      // Download image as buffer
      const response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });
      
      const imageBuffer = response.data;
      this.logger.log(`Downloaded image: ${imageBuffer.length} bytes`);

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: imageBuffer,
        ContentType: response.headers['content-type'] || 'image/jpeg',
      });

      await this.s3Client.send(uploadCommand);
      this.logger.log(`Uploaded to S3: ${fileName}`);

      // Return the S3 object URL
      const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      this.logger.log(`S3 URL: ${s3Url}`);
      
      return s3Url;
    } catch (error) {
      this.logger.error(`Error in downloadAndUploadToS3: ${error.message}`, error.stack);
      throw new Error(`Failed to download and upload image: ${error.message}`);
    }
  }

  async uploadBufferToS3(imageBuffer: Buffer, fileName: string, contentType: string = 'image/jpeg'): Promise<string> {
    try {
      this.logger.log(`Uploading buffer to S3: ${fileName}`);
      
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: imageBuffer,
        ContentType: contentType,
      });

      await this.s3Client.send(uploadCommand);
      this.logger.log(`Buffer uploaded to S3: ${fileName}`);

      const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      return s3Url;
    } catch (error) {
      this.logger.error(`Error uploading buffer to S3: ${error.message}`, error.stack);
      throw new Error(`Failed to upload buffer to S3: ${error.message}`);
    }
  }
} 