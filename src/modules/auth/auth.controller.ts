import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  UseGuards, 
  Request,
  Get,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { 
  RegisterDto, 
  LoginDto, 
  AuthResponseDto, 
  RefreshTokenDto, 
  ChangePasswordDto 
} from './dto/auth.dto';

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully registered',
    type: AuthResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - user already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully logged in',
    type: AuthResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Request() req): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token successfully refreshed',
    type: AuthResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password successfully changed' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password successfully changed' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return req.user;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user and clear all authentication data' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout(@Res() res: Response) {
    try {
      // Clear all possible auth cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.clearCookie('jwt_token');
      res.clearCookie('auth_token');
      res.clearCookie('session');
      res.clearCookie('connect.sid');
      
      // Set logout headers
      res.setHeader('X-Auth-Logout', 'true');
      res.setHeader('X-Auth-Reason', 'manual_logout');
      res.setHeader('Access-Control-Expose-Headers', 'X-Auth-Logout, X-Auth-Reason');
      
      console.log('🚪 USER MANUALLY LOGGED OUT - ALL AUTH DATA CLEARED');
      
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        logout: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Logout failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message,
      });
    }
  }

  @Post('force-logout')
  @ApiOperation({ summary: 'Force logout due to authentication failure' })
  @ApiResponse({ status: 401, description: 'Force logout completed' })
  async forceLogout(@Res() res: Response) {
    try {
      // Clear all possible auth cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.clearCookie('jwt_token');
      res.clearCookie('auth_token');
      res.clearCookie('session');
      res.clearCookie('connect.sid');
      
      // Set force logout headers
      res.setHeader('X-Auth-Logout', 'true');
      res.setHeader('X-Auth-Reason', 'force_logout');
      res.setHeader('Access-Control-Expose-Headers', 'X-Auth-Logout, X-Auth-Reason');
      
      console.log('🚨 FORCE LOGOUT EXECUTED - AUTHENTICATION FAILED');
      
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. You have been forcibly logged out.',
        logout: true,
        force: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Force logout failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Force logout failed',
        error: error.message,
      });
    }
  }

  @Post('debug-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Debug login - detailed logging' })
  @ApiResponse({ status: 200, description: 'Debug login attempt' })
  async debugLogin(@Body() loginDto: LoginDto): Promise<any> {
    try {
      console.log('🚨 DEBUG LOGIN ENDPOINT CALLED');
      console.log('🚨 Request body:', JSON.stringify(loginDto, null, 2));
      
      const result = await this.authService.login(loginDto);
      
      console.log('🚨 DEBUG LOGIN SUCCESS');
      return {
        success: true,
        message: 'Login successful',
        hasAccessToken: !!result.accessToken,
        hasRefreshToken: !!result.refreshToken,
        hasUser: !!result.user,
        userEmail: result.user?.email
      };
    } catch (error) {
      console.log('🚨 DEBUG LOGIN FAILED');
      console.error('🚨 Debug login error:', error);
      return {
        success: false,
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack
      };
    }
  }
} 