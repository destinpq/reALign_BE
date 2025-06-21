import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import {
  CreateOrderDto,
  VerifyPaymentDto,
  PaymentWebhookDto,
  PaymentResponseDto,
  PaymentHistoryDto,
} from './dto/payments.dto';
import { WebhookService } from '../webhooks/webhook.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly webhookService: WebhookService,
  ) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create payment order',
    description: 'Create a Razorpay order for purchasing credits or subscription',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment order created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Internal payment ID' },
        razorpayOrderId: { type: 'string', description: 'Razorpay order ID' },
        amount: { type: 'number', description: 'Amount in paise' },
        currency: { type: 'string', description: 'Currency code' },
        creditsAwarded: { type: 'number', description: 'Credits to be awarded' },
        key: { type: 'string', description: 'Razorpay key for frontend' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async createOrder(
    @Request() req,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.paymentsService.createOrder(req.user.userId, createOrderDto);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify payment',
    description: 'Verify Razorpay payment signature and process the payment',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment verified and processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        payment: { type: 'object' },
        creditsAwarded: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment signature or payment not found',
  })
  async verifyPayment(
    @Request() req,
    @Body() verifyPaymentDto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(req.user.userId, verifyPaymentDto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Razorpay webhook',
    description: 'Handle Razorpay webhook events for payment status updates',
  })
  @ApiHeader({
    name: 'x-razorpay-signature',
    description: 'Razorpay webhook signature',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature',
  })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
    @Body() webhookData: PaymentWebhookDto,
  ) {
    return this.paymentsService.handleWebhook(webhookData, signature);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment history',
    description: 'Get paginated payment history for the current user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
    type: PaymentHistoryDto,
  })
  async getPaymentHistory(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getPaymentHistory(
      req.user.userId,
      page || 1,
      limit || 20,
    );
  }

  @Get('subscription-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check subscription status',
    description: 'Check if user has valid subscription or sufficient credits',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        hasValidSubscription: { type: 'boolean' },
        canGenerateHeadshots: { type: 'boolean' },
      },
    },
  })
  async getSubscriptionStatus(@Request() req) {
    const hasValidSubscription = await this.paymentsService.hasValidSubscription(req.user.userId);
    return {
      hasValidSubscription,
      canGenerateHeadshots: hasValidSubscription,
    };
  }

  @Get('pricing')
  @ApiOperation({
    summary: 'Get pricing information',
    description: 'Get current pricing for credit packages and subscriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Pricing information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        creditPackages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              credits: { type: 'number' },
              price: { type: 'number' },
              priceInRupees: { type: 'number' },
              popular: { type: 'boolean' },
            },
          },
        },
        headshotCost: { type: 'number' },
      },
    },
  })
  async getPricing() {
    return {
      creditPackages: [
        {
          type: 'FREE',
          credits: 5,
          price: 0,
          priceInRupees: 0,
          popular: false,
        },
        {
          type: 'BASIC',
          credits: 100,
          price: 49900, // paise
          priceInRupees: 499,
          popular: true,
        },
        {
          type: 'PREMIUM',
          credits: 500,
          price: 199900, // paise
          priceInRupees: 1999,
          popular: false,
        },
        {
          type: 'ENTERPRISE',
          credits: 2000,
          price: 499900, // paise
          priceInRupees: 4999,
          popular: false,
        },
      ],
      headshotCost: 50, // credits per headshot
      customCreditPrice: 500, // paise per credit (₹5)
    };
  }

  @Post('store-avatar-generation')
  @ApiOperation({
    summary: 'Store avatar generation data',
    description: 'Store avatar generation configuration before payment',
  })
  async storeAvatarGeneration(
    @Body() avatarData: {
      userImage: string; // Base64 image
      selectedWearables: any[];
      selectedScenery: string;
      userDetails: {
        gender: string;
        eyeColor: string;
        hairColor: string;
        bodyType?: string;
      };
      generatedPrompt: string;
      sessionId: string; // Unique session ID to retrieve later
    },
  ) {
    try {
      // Store avatar generation data in database
      const avatarGeneration = await this.paymentsService.storeAvatarGeneration({
        sessionId: avatarData.sessionId,
        userImage: avatarData.userImage,
        selectedWearables: avatarData.selectedWearables,
        selectedScenery: avatarData.selectedScenery,
        userDetails: avatarData.userDetails,
        generatedPrompt: avatarData.generatedPrompt,
        status: 'PENDING_PAYMENT',
        metadata: {
          created_at: new Date().toISOString(),
          source: 'frontend',
        },
      });

      return {
        success: true,
        sessionId: avatarGeneration.sessionId,
        message: 'Avatar generation data stored successfully',
      };
    } catch (error) {
      console.error('❌ Failed to store avatar generation data:', error);
      return {
        success: false,
        message: 'Failed to store avatar generation data',
        error: error.message,
      };
    }
  }

  @Post('store-payment')
  @ApiOperation({
    summary: 'Store payment data and link to avatar generation',
    description: 'Store payment data and link it to avatar generation session',
  })
  async storePaymentData(
    @Body() paymentData: {
      razorpay_payment_id: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
      amount: number;
      email?: string;
      contact?: string;
      sessionId: string; // Link to avatar generation
    },
  ) {
    try {
      // Store payment data and link to avatar generation
      const payment = await this.paymentsService.storePaymentData({
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpaySignature: paymentData.razorpay_signature,
        amount: paymentData.amount,
        currency: 'INR',
        status: 'PENDING',
        description: 'AI Avatar Generation',
        creditsAwarded: 1,
        metadata: {
          email: paymentData.email,
          contact: paymentData.contact,
          sessionId: paymentData.sessionId, // Link to avatar generation
          stored_at: new Date().toISOString(),
          source: 'frontend',
        },
      });

      // Update avatar generation status to PAID
      await this.paymentsService.updateAvatarGenerationStatus(
        paymentData.sessionId,
        'PAID',
        paymentData.razorpay_payment_id
      );

      return {
        success: true,
        paymentId: payment.id,
        sessionId: paymentData.sessionId,
        message: 'Payment data stored and linked to avatar generation',
      };
    } catch (error) {
      console.error('❌ Failed to store payment data:', error);
      return {
        success: false,
        message: 'Failed to store payment data',
        error: error.message,
      };
    }
  }

  @Get('avatar-generation/:sessionId')
  @ApiOperation({
    summary: 'Get avatar generation data',
    description: 'Retrieve avatar generation data by session ID',
  })
  async getAvatarGeneration(
    @Param('sessionId') sessionId: string,
  ) {
    try {
      const avatarGeneration = await this.paymentsService.getAvatarGenerationBySession(sessionId);
      return {
        success: true,
        data: avatarGeneration,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Avatar generation session not found',
        error: error.message,
      };
    }
  }

  @Get('verify-status/:paymentId')
  @ApiOperation({
    summary: 'Verify payment status',
    description: 'Verify if a payment has been successfully completed',
  })
  async verifyPaymentStatus(
    @Param('paymentId') paymentId: string,
  ) {
    return this.webhookService.verifyPaymentForUser(paymentId);
  }
} 