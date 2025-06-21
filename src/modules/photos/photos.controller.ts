import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Query,
  Req,
  Res,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PhotosService } from './photos.service';
import { CreatePhotoDto, UpdatePhotoDto } from './dto/photos.dto';
import { Response } from 'express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Multer configuration for file uploads
const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: './temp-uploads', // Temporary storage
    filename: (req, file, callback) => {
      const uniqueSuffix = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueSuffix);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      return callback(new BadRequestException('Only image files are allowed'), false);
    }
    callback(null, true);
  },
};

@ApiTags('Photos')
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
  }))
  @ApiOperation({ summary: 'Upload a photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Photo uploaded successfully' })
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() createPhotoDto: CreatePhotoDto,
  ) {
    return this.photosService.upload(req.user.userId, file, createPhotoDto);
  }

  // Public upload endpoint for avatar generation (no auth required)
  @Post('upload')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiOperation({ summary: 'Upload image for avatar generation (public)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  async publicUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Read the uploaded file buffer directly
      const fs = require('fs').promises;
      const fileBuffer = await fs.readFile(file.path);
      
      // Use clean file buffer upload - NO BASE64!
      const result = await this.photosService.uploadFileBuffer(
        fileBuffer,
        file.originalname,
        file.mimetype
      );

      // Clean up temporary file
      await fs.unlink(file.path).catch(() => {}); // Ignore cleanup errors

      return {
        success: true,
        data: {
          id: result.id,
          url: result.publicUrl,
          filename: result.filename,
          originalFilename: result.originalFilename,
          size: result.size,
          mimeType: result.mimeType,
        },
      };
    } catch (error) {
      console.error('❌ File upload failed:', error);
      
      // Clean up temporary file on error
      const fs = require('fs').promises;
      await fs.unlink(file.path).catch(() => {});
      
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // Public upload from base64 data URL (no auth required)
  @Post('upload-from-url')
  @ApiOperation({ summary: 'Upload image from base64 data URL for avatar generation (public)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'Base64 data URL or regular image URL',
        },
        name: {
          type: 'string',
          description: 'Optional name for the image',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  async publicUploadFromUrl(
    @Body() body: { imageUrl: string; name?: string },
  ) {
    const result = await this.photosService.uploadFromUrlPublic(
      body.imageUrl,
      body.name || 'avatar-input.jpg'
    );
    
    return {
      success: true,
      data: {
        id: result.id,
        url: result.publicUrl || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/photos/${result.id}/view`,
        filename: result.filename,
      }
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all photos for the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Photos retrieved successfully' })
  async findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.photosService.findAll(req.user.userId, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a photo by ID' })
  @ApiResponse({ status: 200, description: 'Photo retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.photosService.findOne(req.user.userId, id);
  }

  @Get(':id/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed URL for a photo' })
  @ApiResponse({ status: 200, description: 'Signed URL generated successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async getSignedUrl(@Request() req, @Param('id') id: string) {
    const url = await this.photosService.getSignedUrl(req.user.userId, id);
    return { url };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a photo' })
  @ApiResponse({ status: 200, description: 'Photo updated successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updatePhotoDto: UpdatePhotoDto,
  ) {
    return this.photosService.update(req.user.userId, id, updatePhotoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a photo' })
  @ApiResponse({ status: 200, description: 'Photo deleted successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.photosService.remove(req.user.userId, id);
  }

  // Public endpoint - Show uploaded image as actual image (no auth required for public uploads)
  @Get(':id/view')
  async viewImage(@Param('id') id: string, @Res() res: Response) {
    try {
      // First try to find as public upload
      const photo = await this.photosService.findOnePublic(id);
      
      if (!photo.imageBlob) {
        return res.status(404).send('Image not found');
      }

      res.set({
        'Content-Type': photo.mimeType || 'image/jpeg',
        'Content-Length': photo.imageBlob.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      });
      
      return res.send(photo.imageBlob);
    } catch (error) {
      return res.status(404).send('Image not found');
    }
  }

  // Direct image endpoint for Magic Hour API (returns raw image data)
  @Get(':id/direct')
  @ApiOperation({ summary: 'Get direct image data for Magic Hour API' })
  @ApiResponse({ status: 200, description: 'Raw image data returned' })
  async directImage(@Param('id') id: string, @Res() res: Response) {
    try {
      console.log('🖼️ Magic Hour API requesting direct image:', id);
      
      // Find the photo (public uploads only)
      const photo = await this.photosService.findOnePublic(id);
      
      if (!photo.imageBlob) {
        console.log('❌ Image blob not found for photo:', id);
        return res.status(404).send('Image not found');
      }

      console.log('✅ Serving direct image data, size:', photo.imageBlob.length, 'bytes');

      // Set proper headers for Magic Hour API
      res.set({
        'Content-Type': photo.mimeType || 'image/jpeg',
        'Content-Length': photo.imageBlob.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*', // Allow cross-origin for Magic Hour
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      
      return res.send(photo.imageBlob);
    } catch (error) {
      console.log('❌ Error serving direct image:', error);
      return res.status(404).send('Image not found');
    }
  }

  // DEBUG ENDPOINT - List all user images with preview URLs
  @Get('debug/list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async debugList(@Req() req: any) {
    const result = await this.photosService.findAll(req.user.id, 1, 50);
    
    return {
      ...result,
      photos: result.photos.map(photo => ({
        id: photo.id,
        filename: photo.filename,
        title: photo.title,
        description: photo.description,
        createdAt: photo.createdAt,
        size: photo.size,
        hasImageBlob: !!photo.imageBlob,
        viewUrl: `/api/v1/photos/${photo.id}/view`,
        dataUrl: photo.imageBlob ? 
          `data:${photo.mimeType || 'image/jpeg'};base64,${photo.imageBlob.toString('base64')}` : 
          null
      }))
    };
  }
} 