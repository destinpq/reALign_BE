import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../database/prisma.service';
import { CreatePhotoDto, UpdatePhotoDto } from './dto/photos.dto';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PhotosService {
  private readonly logger: Logger;
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly useLocalStorage: boolean;
  private readonly uploadDir: string;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.logger = new Logger(PhotosService.name);
    
    // Check if AWS credentials are available
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    this.useLocalStorage = !awsAccessKeyId || !awsSecretAccessKey || !bucketName;
    
    if (this.useLocalStorage) {
      this.logger.warn('⚠️ AWS credentials or bucket name not found - using local storage');
      this.uploadDir = path.join(process.cwd(), 'uploads');
      
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.logger.log(`📁 Created uploads directory: ${this.uploadDir}`);
      }
    } else {
      this.logger.log('☁️ AWS S3 configured - using cloud storage');
      this.bucketName = bucketName;
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        },
      });
    }
  }

  async upload(
    userId: string,
    file: Express.Multer.File,
    createPhotoDto: CreatePhotoDto,
  ) {
    try {
      // Process image with Sharp for optimization
      const processedImage = await sharp(file.buffer)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Generate unique filename
      const fileExtension = 'jpg'; // Always save as JPEG after processing
      const filename = `${uuidv4()}.${fileExtension}`;
      const s3Key = `photos/${userId}/${filename}`;

      // Upload to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: processedImage,
          ContentType: 'image/jpeg',
          Metadata: {
            userId,
            originalName: file.originalname,
          },
        }),
      );

      // Save to database
      const photo = await this.prismaService.photo.create({
        data: {
          userId,
          filename,
          originalFilename: file.originalname,
          s3Key,
          s3Bucket: this.bucketName,
          mimeType: 'image/jpeg',
          size: processedImage.length,
          ...createPhotoDto,
        },
      });

      this.logger.log(`Photo uploaded successfully: ${photo.id}`);
      return photo;
    } catch (error) {
      this.logger.error('Failed to upload photo:', error);
      throw new BadRequestException('Failed to upload photo');
    }
  }

  // DEPRECATED: Use uploadFromUrlPublic instead
  async uploadFromUrl(
    userId: string,
    imageUrl: string,
    name?: string,
  ) {
    // Redirect to public upload method
    return this.uploadFromUrlPublic(imageUrl, name);
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [photos, total] = await Promise.all([
      this.prismaService.photo.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaService.photo.count({
        where: { userId },
      }),
    ]);

    return {
      photos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const photo = await this.prismaService.photo.findFirst({
      where: { id, userId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    return photo;
  }

  async findOnePublic(id: string) {
    const photo = await this.prismaService.photo.findFirst({
      where: { 
        id,
        userId: 'public' // Only public uploads
      },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    return photo;
  }

  async getSignedUrl(userId: string, id: string, expiresIn = 3600) {
    const photo = await this.findOne(userId, id);

    const command = new GetObjectCommand({
      Bucket: photo.s3Bucket,
      Key: photo.s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async update(userId: string, id: string, updatePhotoDto: UpdatePhotoDto) {
    await this.findOne(userId, id); // Check if exists

    return this.prismaService.photo.update({
      where: { id },
      data: updatePhotoDto,
    });
  }

  async remove(userId: string, id: string) {
    const photo = await this.findOne(userId, id);

    // Delete from S3
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: photo.s3Bucket,
          Key: photo.s3Key,
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to delete S3 object ${photo.s3Key}:`, error);
    }

    // Delete from database
    await this.prismaService.photo.delete({
      where: { id },
    });

    this.logger.log(`Photo deleted successfully: ${id}`);
    return { message: 'Photo deleted successfully' };
  }

  // Public upload method that doesn't require user authentication
  async uploadFromUrlPublic(
    imageUrl: string,
    name?: string,
  ) {
    try {
      this.logger.log(`Starting public upload from URL: ${imageUrl}`);
      
      // Only handle proper image URLs - NO BASE64
      if (imageUrl.startsWith('data:')) {
        throw new BadRequestException('Base64 uploads not supported. Please use proper file uploads.');
      }
      
      // Fetch image from URL
      this.logger.log(`Fetching image from URL: ${imageUrl}`);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        this.logger.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        throw new BadRequestException('Failed to fetch image from URL');
      }
      
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      this.logger.log(`Fetched image, size: ${imageBuffer.length} bytes`);
      
      // Process image with Sharp
      const processedImage = await sharp(imageBuffer)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Generate unique filename and S3 key
      const filename = `${uuidv4()}.jpg`;
      const s3Key = `public-uploads/${filename}`;
      this.logger.log(`Generated S3 key: ${s3Key}`);

      let publicUrl = '';
      
      if (this.useLocalStorage) {
        // Save locally if no AWS credentials
        const localPath = path.join(this.uploadDir, filename);
        await fs.promises.writeFile(localPath, processedImage);
        publicUrl = `${process.env.API_BASE_URL || 'https://realign-api.destinpq.com'}/uploads/${filename}`;
        this.logger.log(`✅ Saved locally: ${publicUrl}`);
      } else {
        // Upload to S3
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
            Body: processedImage,
            ContentType: 'image/jpeg',
            ACL: 'public-read',
            Metadata: {
              originalName: name || 'uploaded-image.jpg',
              uploadType: 'public'
            },
          }),
        );
        
        publicUrl = `https://${this.bucketName}.s3.amazonaws.com/${s3Key}`;
        this.logger.log(`✅ Uploaded to S3: ${publicUrl}`);
      }

      // Find or create system user for public uploads
      let systemUser = await this.prismaService.user.findUnique({
        where: { email: 'system@realign.com' }
      });
      
      if (!systemUser) {
        // Create system user if it doesn't exist
        const bcrypt = require('bcryptjs');
        systemUser = await this.prismaService.user.create({
          data: {
            email: 'system@realign.com',
            password: await bcrypt.hash('SystemUser123!', 12),
            firstName: 'System',
            lastName: 'User',
            isEmailVerified: true,
          }
        });
      }

      // Save minimal metadata to database - NO BLOB STORAGE
      const photo = await this.prismaService.photo.create({
        data: {
          userId: systemUser.id,
          filename,
          originalFilename: name || 'uploaded-image.jpg',
          s3Key: s3Key,
          s3Bucket: this.bucketName || 'local-storage',
          mimeType: 'image/jpeg',
          size: processedImage.length,
          title: name,
          description: `Public upload - ${new Date().toISOString()}`,
          // NO imageBlob field - we're not storing blobs anymore
        },
      });

      this.logger.log(`✅ Metadata saved to database: ${photo.id}`);
      
      return {
        ...photo,
        publicUrl: publicUrl, // Clean S3 URL
      };
    } catch (error) {
      this.logger.error('❌ Upload failed:', error);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // Clean file upload method - NO BASE64!
  async uploadFileBuffer(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ) {
    try {
      this.logger.log(`Starting clean file upload: ${originalName}`);
      
      // Process image with Sharp
      const processedImage = await sharp(fileBuffer)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Generate unique filename and S3 key
      const filename = `${uuidv4()}.jpg`;
      const s3Key = `uploads/${filename}`;
      this.logger.log(`Generated S3 key: ${s3Key}`);

      let publicUrl = '';
      
      if (this.useLocalStorage) {
        // Save locally if no AWS credentials
        const localPath = path.join(this.uploadDir, filename);
        await fs.promises.writeFile(localPath, processedImage);
        publicUrl = `${process.env.API_BASE_URL || 'https://realign-api.destinpq.com'}/uploads/${filename}`;
        this.logger.log(`✅ Saved locally: ${publicUrl}`);
      } else {
        // Upload to S3
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
            Body: processedImage,
            ContentType: 'image/jpeg',
            ACL: 'public-read',
            Metadata: {
              originalName: originalName,
              uploadType: 'direct-file'
            },
          }),
        );
        
        publicUrl = `https://${this.bucketName}.s3.amazonaws.com/${s3Key}`;
        this.logger.log(`✅ Uploaded to S3: ${publicUrl}`);
      }

      // Find or create system user for public uploads
      let systemUser = await this.prismaService.user.findUnique({
        where: { email: 'system@realign.com' }
      });
      
      if (!systemUser) {
        // Create system user if it doesn't exist
        const bcrypt = require('bcryptjs');
        systemUser = await this.prismaService.user.create({
          data: {
            email: 'system@realign.com',
            password: await bcrypt.hash('SystemUser123!', 12),
            firstName: 'System',
            lastName: 'User',
            isEmailVerified: true,
          }
        });
      }

      // Save minimal metadata to database - NO BLOB STORAGE
      const photo = await this.prismaService.photo.create({
        data: {
          userId: systemUser.id,
          filename,
          originalFilename: originalName,
          s3Key: s3Key,
          s3Bucket: this.bucketName || 'local-storage',
          mimeType: 'image/jpeg',
          size: processedImage.length,
          title: originalName,
          description: `Direct file upload - ${new Date().toISOString()}`,
          // NO imageBlob field!
        },
      });

      this.logger.log(`✅ Clean file upload complete: ${photo.id}`);
      
      return {
        ...photo,
        publicUrl: publicUrl,
      };
    } catch (error) {
      this.logger.error('❌ Clean file upload failed:', error);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
} 