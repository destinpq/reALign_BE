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
  InternalServerErrorException
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
        url: result.publicUrl || `${process.env.API_BASE_URL || 'https://realign-api.destinpq.com'}/api/v1/photos/${result.id}/view`,
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



  @Post('get-analysis')
  @UseGuards(JwtAuthGuard)
  async getExistingAnalysis(@Body() body: { imageUrl: string }) {
    try {
      console.log('🔍 Looking for existing analysis for:', body.imageUrl);
      
      // Extract S3 key from URL
      const s3Key = body.imageUrl.includes('uploads/') ? 
        body.imageUrl.split('uploads/')[1].split('?')[0] : 
        null;
      
      if (!s3Key) {
        console.log('❌ Could not extract S3 key from URL');
        return { success: false, message: 'Invalid image URL' };
      }
      
      // Use PhotosService to find photo by S3 key pattern
      const photo = await this.photosService.findByS3Key(s3Key);
     
     if (photo && photo.description && photo.description.includes('AI_ANALYSIS:')) {
       try {
         // Extract JSON from description
         const jsonPart = photo.description.replace('AI_ANALYSIS: ', '');
         const analysis = JSON.parse(jsonPart);
         console.log('✅ Found existing analysis in database:', analysis);
         
         return {
           success: true,
           data: analysis
         };
       } catch (parseError) {
         console.log('❌ Failed to parse analysis JSON:', parseError);
       }
     }
     
     console.log('❌ No existing analysis found for this image');
     return {
       success: false,
       message: 'No analysis found for this image'
     };
   } catch (error) {
     console.error('❌ Error checking for existing analysis:', error);
     return {
       success: false,
       error: error.message
     };
   }
  }

  @Post('analyze-image')
  @UseGuards(JwtAuthGuard)
  async analyzeImageWithBlip3(@Body() body: { imageUrl: string }) {
    try {
      console.log('🔍 Starting BLIP-3 image analysis for:', body.imageUrl);
      
      // Use the imageUrl directly - it should already be a proper S3 URL from upload
      let imageUrl = body.imageUrl;
      
      // Log what we're actually analyzing
      console.log('🎯 ANALYZING THIS EXACT IMAGE URL:', imageUrl);
      
      // Only convert if it's actually a localhost URL AND not already an S3 URL
      if (imageUrl.includes('localhost') && !imageUrl.includes('s3.amazonaws.com')) {
        console.log('🔄 Converting localhost URL to S3 for external API access...');
        imageUrl = await this.photosService.convertLocalImageToS3(imageUrl);
        console.log('✅ Converted to S3 URL:', imageUrl);
      }
      
      // Check if Replicate API token is available
      const replicateToken = process.env.REPLICATE_API_TOKEN;
      
      if (!replicateToken) {
        console.error('❌ Replicate API token not configured');
        console.error('❌ Please set REPLICATE_API_TOKEN environment variable');
        throw new Error('Replicate API token not configured on server. Please contact administrator.');
      }

      console.log('🔑 Using Replicate token:', replicateToken.substring(0, 10) + '...');

      // Call Replicate API from backend to avoid CORS issues
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: "72044dfaaa18e83ebee21d2161efe40f59303b5a087b8680aca809e5e53481d8",
          input: {
            image: imageUrl, // Use the converted S3 URL
            query: "ANALYZE THIS PERSON COMPLETELY: 1) GENDER: Is this person male or female? 2) AGE: What is their approximate age in years? 3) ETHNICITY: What is their ethnicity/race (South Asian, Indian, Sikh, Punjabi, Asian, African, Hispanic, Caucasian, Middle Eastern)? 4) HAIR: What color is their hair? Is it covered by a turban or head covering? 5) EYES: What color are their eyes? 6) BODY TYPE: Are they slim, average, athletic, or heavy? 7) ACCESSORIES: List ALL accessories - turban, patka, beard, mustache, glasses, earrings, necklace, jewelry, religious items. Be EXTREMELY specific about Sikh religious items like turbans, patkas, or kara bracelets."
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Replicate API ${response.status} error:`, errorText);
        throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
      }

      const prediction = await response.json();
      console.log('🤖 BLIP-3 prediction started:', prediction.id);

      // Poll for results with better logging
      const maxAttempts = 60; // 60 seconds timeout (BLIP-3 can be slow)
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: {
            'Authorization': `Token ${replicateToken}`,
          }
        });

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`);
        }

        const status = await statusResponse.json();
        console.log(`🔄 BLIP-3 status check ${attempts + 1}/60: ${status.status}`);
        
        if (status.status === 'succeeded') {
          console.log('✅ BLIP-3 analysis completed:', status.output);
          
          // Parse the output to extract structured data
          const description = status.output || '';
          const analysis = this.parseBlipDescription(description);
          
          // STORE ANALYSIS IN DATABASE - Using photosService method
          try {
            await this.photosService.storeAnalysisResult(imageUrl, analysis);
            console.log('💾 Analysis stored in database successfully');
          } catch (dbError) {
            console.error('❌ Failed to store analysis in DB:', dbError);
          }
          
          return {
            success: true,
            data: analysis
          };
        }
        
        if (status.status === 'failed') {
          console.error('❌ BLIP-3 analysis failed:', status.error);
          throw new Error(`BLIP-3 analysis failed: ${status.error || 'Unknown error'}`);
        }
        
        // Wait 2 seconds before next check (give it more time)
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
      
      console.error('❌ BLIP-3 analysis timeout after 60 seconds');
      throw new Error('Analysis timeout - BLIP-3 is taking longer than expected');
      
    } catch (error) {
      console.error('❌ BLIP-3 analysis error:', error);
      return {
        success: false,
        error: error.message,
        data: {
          gender: '',
          age: '',
          ethnicity: '',
          hairColor: '',
          eyeColor: '',
          accessories: '',
          bodyType: '',
          description: 'Analysis failed'
        }
      };
    }
  }

  private parseBlipDescription(description: string): any {
    // Parse the structured BLIP-3 response based on our specific prompt format
    console.log('🔍 RAW BLIP-3 OUTPUT:', description);
    console.log('🔍 RAW OUTPUT LENGTH:', description.length);
    
    // Extract accessories as string first
    const accessoriesString = this.extractStructuredAccessories(description);
    
    // 🔥 FIX: Convert accessories to array for avatar generation
    const accessoriesArray = this.parseAccessoriesToArray(accessoriesString);

    const result = {
      gender: this.extractStructuredValue(description, 'GENDER', ['male', 'female']),
      age: this.extractStructuredAge(description),
      ethnicity: this.extractStructuredValue(description, 'ETHNICITY', ['sikh', 'punjabi', 'indian', 'south asian', 'asian', 'african', 'black', 'hispanic', 'caucasian', 'white', 'middle eastern', 'arab']),
      hairColor: this.extractStructuredValue(description, 'HAIR', ['black', 'brown', 'blonde', 'red', 'gray', 'grey', 'white', 'silver', 'dark brown', 'light brown', 'covered', 'turban']),
      eyeColor: this.extractStructuredValue(description, 'EYES', ['brown', 'blue', 'green', 'hazel', 'dark', 'dark brown', 'light brown', 'amber']),
      accessories: accessoriesString, // Keep original for display
      accessoriesArray: accessoriesArray, // Array for avatar generation
      bodyType: this.extractStructuredValue(description, 'BODY TYPE', ['slim', 'thin', 'athletic', 'fit', 'average', 'curvy', 'heavy', 'large']),
      description: description
    };

    console.log('🎯 PARSED RESULT:');
    console.log('  - Gender:', result.gender);
    console.log('  - Age:', result.age);
    console.log('  - Ethnicity:', result.ethnicity);
    console.log('  - Hair Color:', result.hairColor);
    console.log('  - Eye Color:', result.eyeColor);
    console.log('  - Body Type:', result.bodyType);
    console.log('  - Accessories:', result.accessories);
    
    return result;
  }

     private extractValue(text: string, keywords: string[], defaultValue: string = ''): string {
     const lowerText = text.toLowerCase();
     
     // Special handling for gender - look for definitive answers
     if (keywords.includes('male') || keywords.includes('female')) {
       if (lowerText.includes('male') && !lowerText.includes('female')) return 'male';
       if (lowerText.includes('female') && !lowerText.includes('male')) return 'female';
       if (lowerText.includes('man') && !lowerText.includes('woman')) return 'male';
       if (lowerText.includes('woman') && !lowerText.includes('man')) return 'female';
     }
     
     for (const keyword of keywords) {
       if (lowerText.includes(keyword.toLowerCase())) {
         return keyword;
       }
     }
     return defaultValue;
   }

  private extractAge(text: string): string {
    // Look for explicit age numbers first
    const ageMatch = text.match(/(\d{1,2})\s*(?:year|yr|age|old)/i);
    if (ageMatch) {
      return ageMatch[1];
    }
    
    // If no number, try to estimate from keywords
    const lowerText = text.toLowerCase();
    if (lowerText.includes('young') || lowerText.includes('teen')) return '20';
    if (lowerText.includes('middle') || lowerText.includes('adult')) return '35';
    if (lowerText.includes('old') || lowerText.includes('senior')) return '60';
    
    return '25'; // Conservative default
  }

     private extractAccessories(text: string): string {
     const accessories = [];
     const lowerText = text.toLowerCase();
     
     // Sikh/Religious accessories
     if (lowerText.includes('turban')) accessories.push('turban');
     if (lowerText.includes('patka')) accessories.push('patka');  
     if (lowerText.includes('beard')) accessories.push('beard');
     if (lowerText.includes('mustache') || lowerText.includes('moustache')) accessories.push('mustache');
     if (lowerText.includes('kara')) accessories.push('kara bracelet');
     
     // General accessories
     if (lowerText.includes('glasses') || lowerText.includes('spectacles')) accessories.push('glasses');
     if (lowerText.includes('earring')) accessories.push('earrings');
     if (lowerText.includes('necklace')) accessories.push('necklace');
     if (lowerText.includes('jewelry') || lowerText.includes('jewellery')) accessories.push('jewelry');
     if (lowerText.includes('watch')) accessories.push('watch');
     if (lowerText.includes('chain')) accessories.push('chain');
     
     return accessories.length > 0 ? accessories.join(', ') : 'none';
   }

   // NEW STRUCTURED EXTRACTION METHODS
   private extractStructuredValue(text: string, section: string, keywords: string[]): string {
     console.log(`🔍 Extracting ${section} from:`, text.substring(0, 200) + '...');
     
     // Look for the specific section in the structured response
     const sectionRegex = new RegExp(`${section}[:\\s]*([^\\n]+)`, 'i');
     const sectionMatch = text.match(sectionRegex);
     
     if (sectionMatch) {
       const sectionText = sectionMatch[1].toLowerCase();
       console.log(`✅ Found ${section} section:`, sectionText);
       
       for (const keyword of keywords) {
         if (sectionText.includes(keyword.toLowerCase())) {
           console.log(`🎯 Matched ${section} keyword:`, keyword);
           return keyword;
         }
       }
       console.log(`❌ No ${section} keyword matched in section. Tried:`, keywords);
     } else {
       console.log(`❌ No ${section} section found, trying fallback...`);
     }
     
     // Fallback to searching entire text
     const lowerText = text.toLowerCase();
     for (const keyword of keywords) {
       if (lowerText.includes(keyword.toLowerCase())) {
         console.log(`🎯 Fallback matched ${section} keyword:`, keyword);
         return keyword;
       }
     }
     
     // Special fallback for hair/eye colors - be more flexible
     if (section === 'HAIR') {
       if (lowerText.includes('hair')) {
         // Extract actual hair color, not accessories like turban
         if (lowerText.includes('dark hair') || lowerText.includes('black hair')) return 'black';
         if (lowerText.includes('brown hair')) return 'brown';
         if (lowerText.includes('light hair') || lowerText.includes('blonde hair')) return 'blonde';
         if (lowerText.includes('red hair')) return 'red';
         if (lowerText.includes('gray hair') || lowerText.includes('grey hair')) return 'gray';
         // If it mentions "dark" in hair context, default to black
         if (lowerText.includes('dark') && lowerText.includes('hair')) return 'black';
       }
     }
     
     if (section === 'EYES') {
       if (lowerText.includes('eye')) {
         if (lowerText.includes('brown') || lowerText.includes('dark')) return 'brown';
         if (lowerText.includes('blue')) return 'blue';
         if (lowerText.includes('green')) return 'green';
         if (lowerText.includes('hazel')) return 'hazel';
       }
     }
     
     console.log(`❌ No ${section} found anywhere. Keywords tried:`, keywords);
     return '';
   }

   private extractStructuredAge(text: string): string {
     // Look for age in structured response
     const ageRegex = /AGE[:\s]*(\d{1,2})/i;
     const ageMatch = text.match(ageRegex);
     if (ageMatch) {
       return ageMatch[1];
     }
     
     // Fallback to general age extraction
     return this.extractAge(text);
   }

   private extractStructuredAccessories(text: string): string {
     // Look for accessories section
     const accessoriesRegex = /ACCESSORIES[:\s]*([^\\n]+)/i;
     const accessoriesMatch = text.match(accessoriesRegex);
     
     let searchText = text;
     if (accessoriesMatch) {
       searchText = accessoriesMatch[1];
     }
     
     return this.extractAccessories(searchText);
   }

   // 🔥 NEW METHOD: Convert accessories string to array for avatar generation
   private parseAccessoriesToArray(accessoriesString: string): string[] {
     if (!accessoriesString || accessoriesString === 'none') {
       return [];
     }
     
     // Split by comma and clean up each item
     return accessoriesString
       .split(',')
       .map(item => item.trim())
       .filter(item => item && item !== 'none');
   }
} 