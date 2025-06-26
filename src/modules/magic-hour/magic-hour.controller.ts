import { Controller, Post, Body, UseGuards, Req, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MagicHourService } from './magic-hour.service';

@ApiTags('Magic Hour')
@Controller('magic-hour')
export class MagicHourController {
  constructor(private readonly magicHourService: MagicHourService) {}

  @Post('direct-professional-avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate professional avatar directly' })
  @ApiResponse({ status: 201, description: 'Avatar generation started successfully' })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  async generateDirectProfessionalAvatar(
    @Body() body: { image_url: string; prompt: string; name: string },
    @Req() req: any,
  ) {
    const userId = req.user.id;
    console.log('🎨 Direct professional avatar generation requested for user:', userId);
    console.log('📊 Request data:', body);

    const result = await this.magicHourService.generateDirectProfessionalAvatar(
      userId,
      body.image_url,
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
  async getHistory(@Req() req: any) {
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