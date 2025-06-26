import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerDto;

    try {
      // Check if user already exists
      const existingUser = await this.prisma.users.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Username validation removed - not using usernames in this system

      // Hash password
      const saltRounds = parseInt(this.configService.get('BCRYPT_SALT_ROUNDS')) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await this.prisma.users.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          credits: 5, // Free tier credits
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          credits: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email);

      console.log('✅ User registered successfully:', user.email);

      return {
        ...tokens,
        user: user,
      };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    try {
      console.log('🔐 Login attempt for:', email);
      console.log('🔐 Password provided:', password ? 'Yes' : 'No');
      console.log('🔐 Password length:', password?.length || 0);

      // Find user
      const user = await this.prisma.users.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          credits: true,
          isActive: true,
        },
      });

      if (!user) {
        console.log('❌ User not found:', email);
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('✅ User found:', email);
      console.log('✅ User active status:', user.isActive);
      console.log('✅ User has password:', user.password ? 'Yes' : 'No');

      if (!user.isActive) {
        console.log('❌ User account deactivated:', email);
        throw new UnauthorizedException('Account is deactivated');
      }

      // Verify password
      console.log('🔐 Starting password comparison...');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('🔐 Password comparison result:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('❌ Invalid password for:', email);
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('✅ Password valid, generating tokens...');
      
      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email);
      
      console.log('✅ Tokens generated successfully');

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      console.log('✅ Login successful for:', email);
      console.log('✅ User object:', JSON.stringify(userWithoutPassword, null, 2));

      return {
        ...tokens,
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('❌ Login failed:', error);
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          credits: true,
          isActive: true,
        },
      });

      if (user && user.isActive && await bcrypt.compare(password, user.password)) {
        const { password: _, ...result } = user;
        return result;
      }
      return null;
    } catch (error) {
      console.error('❌ User validation failed:', error);
      return null;
    }
  }

  async validateUserById(userId: string): Promise<any> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          credits: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        return user;
      }
      return null;
    } catch (error) {
      console.error('❌ User validation by ID failed:', error);
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.validateUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user.id, user.email);

      return {
        ...tokens,
        user: user,
      };
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const saltRounds = parseInt(this.configService.get('BCRYPT_SALT_ROUNDS')) || 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.users.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN') || '7d',
        }),
        this.jwtService.signAsync(payload, {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '30d',
        }),
      ]);

      console.log('✅ Tokens generated successfully for user:', userId);

      return {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      };
    } catch (error) {
      console.error('❌ Token generation failed:', error);
      throw new UnauthorizedException('Failed to generate tokens');
    }
  }
} 