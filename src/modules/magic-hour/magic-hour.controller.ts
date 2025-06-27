import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MagicHourService } from './magic-hour.service';

@ApiTags('magic-hour')
@Controller('magic-hour')
export class MagicHourController {
  constructor(private readonly magicHourService: MagicHourService) {}

  @Post('generate-and-upload-headshot')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI headshot using Magic Hour AI and upload to S3' })
  @ApiResponse({ status: 201, description: 'AI headshot generation and upload completed successfully' })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  @ApiResponse({ status: 500, description: 'Magic Hour API error or server error' })
  async generateAndUploadHeadshot(
    @Body() body: { prompt: string },
    @Request() req,
  ) {
    const userId = req.user.id;
    console.log('🎨 Magic Hour AI headshot generation requested for user:', userId);
    
    console.log('📊 Request data:', {
      prompt: body.prompt,
      userId: userId,
    });
    
    try {
      const s3Url = await this.magicHourService.generateAndUploadImage(body.prompt);

      console.log('✅ Magic Hour AI headshot generation completed successfully');
      
      return {
        success: true,
        data: {
          s3Url,
          httpsUrl: s3Url.replace('s3://', 'https://').replace(`${process.env.AWS_S3_BUCKET_NAME || 'realign'}/`, `${process.env.AWS_S3_BUCKET_NAME || 'realign'}.s3.amazonaws.com/`),
          prompt: body.prompt,
        },
        message: 'AI headshot generated and uploaded to S3 successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Magic Hour AI headshot generation failed:', error);
      
      return {
        success: false,
        error: error.message || 'AI headshot generation failed',
        message: 'Failed to generate and upload AI headshot',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('direct-professional-avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate professional avatar directly using Magic Hour AI' })
  @ApiResponse({ status: 201, description: 'Avatar generation completed successfully' })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  @ApiResponse({ status: 500, description: 'Magic Hour API error or server error' })
  async generateDirectProfessionalAvatar(
    @Body() body: { imageUrl?: string; image_url?: string; prompt: string; name: string },
    @Request() req,
  ) {
    const userId = req.user.id;
    console.log('🎨 Magic Hour avatar generation requested for user:', userId);
    
    // Handle both imageUrl and image_url field names
    const imageUrl = body.imageUrl || body.image_url;
    
    console.log('📊 Request data:', {
      imageUrl: imageUrl,
      prompt: body.prompt,
      name: body.name,
      userId: userId,
      rawBody: body
    });
    
    try {
      const result = await this.magicHourService.generateDirectProfessionalAvatar(
        userId,
        imageUrl,
        body.prompt,
        body.name,
      );

      console.log('✅ Magic Hour generation completed successfully');
      
      return {
        success: true,
        data: result,
        message: 'Professional avatar generated successfully using Magic Hour AI',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Magic Hour generation failed:', error);
      
      return {
        success: false,
        error: error.message || 'Avatar generation failed',
        message: 'Failed to generate professional avatar',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Magic Hour generation history for the authenticated user' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  async getHistory(@Request() req) {
    const userId = req.user.id;
    console.log('📚 Getting Magic Hour history for user:', userId);

    try {
      const history = await this.magicHourService.getHistory(userId);

      return {
        success: true,
        data: {
          items: history,
          total: history.length,
        },
        message: 'Magic Hour generation history retrieved successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to get Magic Hour history:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to retrieve history',
        message: 'Could not fetch generation history',
        timestamp: new Date().toISOString(),
      };
    }
  }
} 