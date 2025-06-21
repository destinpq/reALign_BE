import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Post('avatar-session')
  @ApiOperation({ summary: 'Save avatar creation session to database' })
  @ApiResponse({ status: 201, description: 'Avatar session saved successfully' })
  async saveAvatarSession(
    @Request() req,
    @Body() body: { sessionData: any; timestamp: string },
  ) {
    console.log('🔧 saveAvatarSession called with userId:', req.user.id);
    const result = await this.usersService.saveAvatarSession(
      req.user.id,
      body.sessionData,
    );
    
    return {
      success: true,
      message: 'Avatar session saved to database successfully',
      sessionId: result.sessionId,
      timestamp: result.updatedAt,
    };
  }

  @Get('avatar-session')
  @ApiOperation({ summary: 'Load avatar creation session from database' })
  @ApiResponse({ status: 200, description: 'Avatar session loaded successfully' })
  async getAvatarSession(@Request() req) {
    console.log('🔧 getAvatarSession called with userId:', req.user.id);
    const result = await this.usersService.getAvatarSession(req.user.id);
    
    return {
      success: true,
      ...result,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getUserStats(@Request() req) {
    return this.usersService.getUserStats(req.user.id);
  }
} 