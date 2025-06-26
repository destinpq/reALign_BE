import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MagicHourService } from './magic-hour.service';

@ApiTags('magic-hour')
@Controller('magic-hour')
export class MagicHourController {
  constructor(private readonly magicHourService: MagicHourService) {}

  @Post('test-api')
  @ApiOperation({ summary: 'Test Magic Hour API without authentication' })
  @ApiResponse({ status: 201, description: 'Test API call completed' })
  async testMagicHourAPI(
    @Body() body: { imageUrl: string; prompt: string; name: string },
  ) {
    console.log('🧪 TESTING Magic Hour API without authentication');
    console.log('📸 Image URL:', body.imageUrl);
    console.log('📝 Prompt:', body.prompt);
    console.log('👤 Name:', body.name);

    // Test with a dummy user ID
    const userId = 'test-user-123';
    
    try {
      const result = await this.magicHourService.generateDirectProfessionalAvatar(
        userId,
        body.imageUrl,
        body.prompt,
        body.name,
      );

      console.log('✅ Test completed successfully:', result);
      
      return {
        success: true,
        data: result,
        message: 'Magic Hour API test completed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Test failed:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Magic Hour API test failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('direct-professional-avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate professional avatar directly' })
  @ApiResponse({ status: 201, description: 'Avatar generation started successfully' })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  async generateDirectProfessionalAvatar(
    @Body() body: { imageUrl: string; prompt: string; name: string },
    @Request() req,
  ) {
    const userId = req.user.id;
    console.log('🎨 Direct professional avatar generation requested for user:', userId);
    console.log('📊 Request data:', body);
    
    const result = await this.magicHourService.generateDirectProfessionalAvatar(
      userId,
      body.imageUrl,
      body.prompt,
      body.name,
    );

    return {
      success: true,
      data: result,
      message: 'Avatar generation completed successfully',
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Magic Hour generation history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getHistory(@Request() req) {
    const userId = req.user.id;
    console.log('📚 Getting Magic Hour history for user:', userId);

    const history = await this.magicHourService.getHistory(userId);

    return {
      success: true,
      data: {
        items: history,
        total: history.length,
      },
    };
  }
} 