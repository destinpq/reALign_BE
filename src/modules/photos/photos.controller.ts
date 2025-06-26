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
import { promises as fs } from 'fs';
import fetch from 'node-fetch';
import { PrismaService } from '../../database/prisma.service';

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
  constructor(
    private readonly photosService: PhotosService,
    private readonly prismaService: PrismaService
  ) {}

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
    return this.photosService.upload(req.users.userId, file, createPhotoDto);
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
    return this.photosService.findAll(req.users.userId, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a photo by ID' })
  @ApiResponse({ status: 200, description: 'Photo retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async findOne(@Request() req, @Param("id") id: string) {
    return this.photosService.findOne(req.users.userId, id);
  }

  @Get(':id/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed URL for a photo' })
  @ApiResponse({ status: 200, description: 'Signed URL generated successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async getSignedUrl(@Request() req, @Param("id") id: string) {
    const url = await this.photosService.getSignedUrl(req.users.userId, id);
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
    return this.photosService.update(req.users.userId, id, updatePhotoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a photo' })
  @ApiResponse({ status: 200, description: 'Photo deleted successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async remove(@Request() req, @Param("id") id: string) {
    return this.photosService.remove(req.users.userId, id);
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
    const result = await this.photosService.findAll(req.users.id, 1, 50);
    
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
  async analyzeImageWithLLaVA(@Body() body: { imageUrl: string }) {
    try {
      console.log('🔍 Starting LLaVA image analysis for:', body.imageUrl);
      
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

      // Prepare the analysis request
      const analysisPrompt = `Analyze this person's appearance and respond in this exact format:

GENDER: male
AGE: 25
ETHNICITY: south asian
HAIR: black
EYES: brown
BODY TYPE: average
ACCESSORIES: turban, beard

Use the exact format above. Replace the example values with what you see in the image. For ACCESSORIES, list items like turban, beard, glasses, jewelry, or write "none" if no accessories.`;

      console.log('🚀 Calling Replicate API directly...');
      
      // Make direct API call - NO TIMEOUT, just hit the URL
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: "80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb",
          input: {
            image: imageUrl,
            prompt: analysisPrompt,
            max_tokens: 200,
            temperature: 0.1,
            top_p: 1
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
      }

      const prediction = await response.json();
      console.log('🎯 Prediction created:', prediction.id);

      // Simple polling - wait for result
      const analysisResult = await this.pollReplicateResult(prediction.id, replicateToken);

      console.log('✅ LLaVA Raw Response:', analysisResult);
      
      // Parse the structured response
      const parsedData = this.parseBlipDescription(analysisResult);
      
      // Validate the parsed data before storing
      const isValidAnalysis = parsedData.gender && parsedData.age && parsedData.ethnicity;
      
      if (!isValidAnalysis) {
        console.error('❌ Analysis parsing failed - invalid response format');
        console.error('❌ Expected structured format but got:', analysisResult);
        throw new Error('Analysis failed: AI returned invalid format. Please try again.');
      }
      
      // Store the analysis in database
      try {
        await this.photosService.storeAnalysisResult(imageUrl, parsedData);
        console.log('💾 Analysis stored in database successfully');
      } catch (dbError) {
        console.error('❌ Failed to store analysis in DB:', dbError);
      }
      
      return {
        success: true,
        data: parsedData
      };
      
    } catch (error) {
      console.error('❌ LLaVA analysis error:', error);
      
      return {
        success: false,
        error: error.message || 'Analysis failed',
        data: null
      };
    }
  }

  private parseBlipDescription(description: any): any {
    // Parse the structured LLaVA response based on our specific prompt format
    console.log('🔍 RAW LLaVA OUTPUT:', description);
    console.log('🔍 RAW OUTPUT TYPE:', typeof description);
    
    // Convert to string if it's not already
    let textDescription: string;
    if (typeof description === 'string') {
      textDescription = description;
    } else if (Array.isArray(description)) {
      textDescription = description.join(' ');
    } else if (description && typeof description === 'object') {
      textDescription = JSON.stringify(description);
    } else {
      textDescription = String(description);
    }
    
    console.log('🔍 CONVERTED TO STRING:', textDescription);
    console.log('🔍 STRING LENGTH:', textDescription.length);
    
    // Extract accessories as string first
    const accessoriesString = this.extractStructuredAccessories(textDescription);
    
    // 🔥 FIX: Convert accessories to array for avatar generation
    const accessoriesArray = this.parseAccessoriesToArray(accessoriesString);

    const result = {
      gender: this.extractStructuredValue(textDescription, 'GENDER', ['male', 'female']),
      age: this.extractStructuredAge(textDescription),
      ethnicity: this.extractStructuredValue(textDescription, 'ETHNICITY', ['sikh', 'punjabi', 'indian', 'south asian', 'asian', 'african', 'black', 'hispanic', 'caucasian', 'white', 'middle eastern', 'arab']),
      hairColor: this.extractStructuredValue(textDescription, 'HAIR', ['black', 'brown', 'blonde', 'red', 'gray', 'grey', 'white', 'silver', 'dark brown', 'light brown', 'covered', 'turban']),
      eyeColor: this.extractStructuredValue(textDescription, 'EYES', ['brown', 'blue', 'green', 'hazel', 'dark', 'dark brown', 'light brown', 'amber']),
      accessories: accessoriesString, // Keep original for display
      accessoriesArray: accessoriesArray, // Array for avatar generation
      bodyType: this.extractStructuredValue(textDescription, 'BODY TYPE', ['slim', 'thin', 'athletic', 'fit', 'average', 'curvy', 'heavy', 'large']),
      description: textDescription
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
     console.log('🔍 Extracting accessories from text:', text);
     
     // Look for accessories section - fix the regex to handle newlines properly
     const accessoriesRegex = /ACCESSORIES[:\s]*([^\n]+)/i;
     const accessoriesMatch = text.match(accessoriesRegex);
     
     let searchText = text;
     if (accessoriesMatch) {
       searchText = accessoriesMatch[1].trim();
       console.log('✅ Found accessories section:', searchText);
       
       // If the section already contains comma-separated accessories, return them directly
       if (searchText.includes(',') || searchText.includes('turban') || searchText.includes('beard')) {
         return searchText;
       }
     }
     
     console.log('🔍 Using fallback extraction on:', searchText);
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

  @Get('test-replicate-token')
  async testReplicateToken() {
    const token = process.env.REPLICATE_API_TOKEN;
    
    return {
      tokenConfigured: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? token.substring(0, 10) + '...' : 'NOT SET',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };
  }

  // Placeholder image endpoints for development/testing
  @Get('placeholder/:width/:height')
  async getPlaceholderImage(
    @Param("width") width: string,
    @Param('height') height: string,
    @Res() res: Response,
    @Query('text') text?: string,
    @Query('bg') backgroundColor?: string,
    @Query('color') textColor?: string,
  ) {
    try {
      const w = parseInt(width) || 150;
      const h = parseInt(height) || 150;
      const bgColor = backgroundColor || '#f0f0f0';
      const txtColor = textColor || '#666666';
      const displayText = text || `${w}×${h}`;

      const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="${txtColor}" text-anchor="middle" dy=".3em">${displayText}</text>
      </svg>`;

      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      });

      return res.send(svg);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid dimensions' });
    }
  }

  // Add a simple placeholder route for the root API call
  @Get('api/placeholder/:width/:height')
  async getApiPlaceholderImage(
    @Param("width") width: string,
    @Param('height') height: string,
    @Res() res: Response,
    @Query('text') text?: string,
    @Query('bg') backgroundColor?: string,
    @Query('color') textColor?: string,
  ) {
    return this.getPlaceholderImage(width, height, res, text, backgroundColor, textColor);
  }

  @Get('placeholder/wearable/:id')
  async getWearablePlaceholder(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const svg = `<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa"/>
        <circle cx="75" cy="60" r="20" fill="#dee2e6"/>
        <rect x="55" y="85" width="40" height="30" fill="#dee2e6"/>
        <text x="50%" y="130" font-family="Arial, sans-serif" font-size="10" fill="#6c757d" text-anchor="middle">${id}</text>
      </svg>`;

      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      });

      return res.send(svg);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid wearable ID' });
    }
  }

  @Get('placeholder/team/:name')
  async getTeamPlaceholder(
    @Param('name') name: string,
    @Res() res: Response,
  ) {
    try {
      const initials = name.substring(0, 2).toUpperCase();
      const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
      const bgColor = colors[name.length % colors.length];

      const svg = `<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="60" fill="${bgColor}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle" dy=".3em">${initials}</text>
      </svg>`;

      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      });

      return res.send(svg);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid name' });
    }
  }

  private async pollReplicateResult(predictionId: string, token: string): Promise<string> {
    const maxAttempts = 60; // 60 attempts over 60 seconds
    const pollInterval = 1000; // 1 second between polls
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Checking result... ${attempt}s`);
      
      // Simple fetch without timeout - just hit the URL
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'succeeded') {
        console.log('✅ Analysis completed!');
        return result.output;
      }

      if (result.status === 'failed') {
        throw new Error(`Analysis failed: ${result.error || 'Unknown error'}`);
      }

      if (result.status === 'canceled') {
        throw new Error('Analysis was canceled');
      }

      // Wait 1 second before next check
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Analysis timed out after 60 seconds');
  }

  @Post('clear-analysis')
  @UseGuards(JwtAuthGuard)
  async clearAnalysisData(@Body() body: { imageUrl: string }) {
    try {
      console.log('🗑️ Clearing AI analysis for:', body.imageUrl);
      
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
        // Clear the AI analysis from description
        await this.photosService.clearAnalysisResult(photo.id);
        console.log('✅ AI analysis cleared for photo:', photo.id);
        
        return {
          success: true,
          message: 'AI analysis cleared successfully'
        };
      }
      
      console.log('❌ No AI analysis found to clear');
      return {
        success: false,
        message: 'No AI analysis found for this image'
      };
    } catch (error) {
      console.error('❌ Error clearing AI analysis:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('magic-hour/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Magic Hour generation history' })
  @ApiResponse({ status: 200, description: 'Magic Hour history retrieved successfully' })
  async getMagicHourHistory(@Req() req: any) {
    try {
      // Check if user is authenticated
      if (!req.users || !req.users.id) {
        throw new BadRequestException('User not authenticated. Please log in again.');
      }

      const userId = req.users.id;
      
      // Get avatar generations for this user
      const avatarGenerations = await this.prismaService.avatar_generations.findMany({
        where: {
          // For now, get all avatar generations since we don't have userId field
          // In future, add userId field to avatar_generations table
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
        }
      });

      return {
        success: true,
        data: avatarGenerations,
        total: avatarGenerations.length
      };
    } catch (error) {
      console.error('❌ Failed to get Magic Hour history:', error);
      return {
        success: false,
        message: 'Failed to retrieve Magic Hour history',
        error: error.message
      };
    }
  }
} 