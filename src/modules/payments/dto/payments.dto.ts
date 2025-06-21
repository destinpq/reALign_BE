import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { SubscriptionType } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty()
  @IsEnum(SubscriptionType)
  subscriptionType: SubscriptionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  credits?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty()
  @IsString()
  razorpayOrderId: string;

  @ApiProperty()
  @IsString()
  razorpaySignature: string;
}

export class PaymentWebhookDto {
  @ApiProperty()
  @IsString()
  event: string;

  @ApiProperty()
  payload: any;
}

export class PaymentHistoryQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  razorpayOrderId: string;

  @ApiProperty()
  createdAt: Date;
}

export class PaymentHistoryDto {
  @ApiProperty()
  payments: PaymentResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
} 