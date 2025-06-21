import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, PaymentStatus, ProcessingStatus } from '@prisma/client';

export class CreateAdminDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@realign-photomaker.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'AdminPassword123!',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'First name',
    example: 'Admin',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'User',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Admin role',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole)
  role: UserRole;
}

export class SystemStatsDto {
  @ApiProperty({ description: 'Total registered users' })
  totalUsers: number;

  @ApiProperty({ description: 'Active users in last 30 days' })
  activeUsers: number;

  @ApiProperty({ description: 'Total payments processed' })
  totalPayments: number;

  @ApiProperty({ description: 'Total revenue in rupees' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total headshots generated' })
  totalHeadshots: number;

  @ApiProperty({ description: 'Successful headshot generations' })
  successfulHeadshots: number;

  @ApiProperty({ description: 'Failed headshot generations' })
  failedHeadshots: number;

  @ApiProperty({ description: 'Total credits purchased' })
  totalCreditsPurchased: number;

  @ApiProperty({ description: 'Total credits consumed' })
  totalCreditsConsumed: number;

  @ApiProperty({ description: 'Total emails sent' })
  totalEmails: number;

  @ApiProperty({ description: 'Email delivery success rate' })
  emailSuccessRate: number;
}

export class UserManagementDto {
  @ApiPropertyOptional({
    description: 'Search by email or name',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PaymentAnalyticsDto {
  @ApiPropertyOptional({
    description: 'Start date for analytics',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Payment status filter',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class ContentModerationDto {
  @ApiPropertyOptional({
    description: 'Search term for content',
    example: 'inappropriate',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by processing status',
    enum: ProcessingStatus,
  })
  @IsOptional()
  @IsEnum(ProcessingStatus)
  status?: ProcessingStatus;

  @ApiPropertyOptional({
    description: 'Start date for content review',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for content review',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class FlagContentDto {
  @ApiProperty({
    description: 'Processing job ID to flag',
    example: 'clx7uu86w0a5qp55yxz315r6r',
  })
  @IsString()
  jobId: string;

  @ApiProperty({
    description: 'Reason for flagging',
    example: 'Inappropriate content detected',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Contains explicit material',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'User ID to update',
    example: 'clx7uu86w0a5qp55yxz315r6r',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'New active status',
    example: false,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Reason for status change',
    example: 'Policy violation',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AwardCreditsDto {
  @ApiProperty({
    description: 'User ID to award credits',
    example: 'clx7uu86w0a5qp55yxz315r6r',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Number of credits to award',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  credits: number;

  @ApiPropertyOptional({
    description: 'Reason for awarding credits',
    example: 'Compensation for service issue',
  })
  @IsOptional()
  @IsString()
  reason?: string;
} 