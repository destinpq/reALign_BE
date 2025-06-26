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
  BadRequestException,
  UnauthorizedException,
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
import { PaymentsService } from './services';
import {
  CreateOrderDto,
  VerifyPaymentDto,
  PaymentWebhookDto,
  PaymentResponseDto,
  PaymentHistoryDto,
} from './dto/payments.dto';
import { WebhookService } from '../webhooks/webhook.service';
import { PrismaService } from '../../database/prisma.service';
import { PaymentStatus } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly webhookService: WebhookService,
    private readonly prismaService: PrismaService,
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
    return this.paymentsService.createOrder(req.user.id, createOrderDto);
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
    return this.paymentsService.verifyPayment(req.user.id, verifyPaymentDto);
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
      req.user.id,
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
    const hasValidSubscription = await this.paymentsService.hasValidSubscription(req.user.id);
    return {
      hasValidSubscription,
      canGenerateHeadshots: hasValidSubscription,
    };
  }

  @Post('verify-recent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify recent payment',
    description: 'Check if user has made a recent payment for avatar generation',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent payment verification result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            hasValidPayment: { type: 'boolean' },
            paymentDetails: { type: 'object' },
          },
        },
      },
    },
  })
  async verifyRecentPayment(
    @Request() req,
    @Body() body: { amount?: number },
  ) {
    try {
      const userId = req.user.id;
      const result = await this.paymentsService.verifyRecentPayment(userId, body.amount || 199);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to verify recent payment',
        error: error.message,
      };
    }
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
        status: 'COMPLETED',
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
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Store payment data and link to avatar generation',
    description: 'Store payment data and link it to avatar generation session',
  })
  @Post('store-payment-data')
  async storePaymentData(
    @Request() req,
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
      // 🔥 VERIFY USER IS LOGGED IN FIRST!
      if (!req.user || !req.user.id) {
        throw new Error('User not authenticated. Please log in first.');
      }

      const userId = req.user.id;
      console.log(`🔐 AUTHENTICATED USER MAKING PAYMENT: ${userId}`);

      // Store payment data and link to avatar generation
      const payment = await this.paymentsService.storePaymentData({
        userId: userId, // 🔥 USE REAL USER ID!
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpaySignature: paymentData.razorpay_signature,
        amount: paymentData.amount * 100, // Convert to paise for consistency
        currency: 'INR',
        status: 'COMPLETED',
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
  @Get('avatar-generation/:sessionId')
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
  @Get('verify/:paymentId')
  async verifyPaymentStatus(
    @Param('paymentId') paymentId: string,
  ) {
    return this.webhookService.verifyPaymentForUser(paymentId);
  }

  @Get('check-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has valid payment for avatar generation' })
  @ApiResponse({ status: 200, description: 'Payment status checked successfully' })
  @ApiResponse({ status: 401, description: 'User not authenticated - must log out' })
  async checkPaymentStatus(@Req() req: any) {
    try {
      // Check if user is properly authenticated
      if (!req.user || !req.user.id) {
        console.error('❌ User not authenticated - req.user is undefined');
        throw new UnauthorizedException('User not authenticated. Please log in again.');
      }

      const userId = req.user.id;
      console.log('🔍 Checking payment status for user:', userId);
      
      // 🚨 STRICT PAYMENT CHECK: Only allow payments made in the last 10 minutes
      // This ensures user must make a fresh payment for each avatar generation
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const recentPayment = await this.prismaService.payments.findFirst({
        where: {
          userId: userId,
          status: PaymentStatus.COMPLETED,
          createdAt: {
            gte: tenMinutesAgo // Only last 10 minutes
          },
          amount: {
            gte: 19900 // ₹199 in paise
          },
          description: {
            contains: 'AI Avatar Generation' // Must be specifically for avatar generation
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      const hasValidPayment = !!recentPayment;
      
      console.log(`💳 STRICT Payment check result for ${userId}:`, hasValidPayment ? 'VALID' : 'NO RECENT PAYMENT');
      if (recentPayment) {
        console.log(`💳 Found payment: ₹${Number(recentPayment.amount)/100} at ${recentPayment.createdAt}`);
      }
      
      return {
        success: true,
        hasValidPayment,
        paymentData: recentPayment ? {
          id: recentPayment.id,
          amount: recentPayment.amount,
          createdAt: recentPayment.createdAt,
          description: recentPayment.description
        } : null
      };
      
    } catch (error) {
      console.error('❌ Payment status check failed:', error);
      
      // If it's an authentication error, throw 401 to force logout
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to check payment status');
    }
  }

  @Post('webhook/razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Razorpay webhook handler',
    description: 'Handle Razorpay payment webhook events to prevent automatic refunds',
  })
  async handleRazorpayWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
    @Headers() headers: any,
  ) {
    try {
      // 🔧 GET RAW BODY FOR PROPER SIGNATURE VERIFICATION
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      const payload = req.body;
      
      console.log('🔔 Razorpay webhook received:', payload?.event);
      console.log('🔐 Signature received:', signature);
      console.log('📝 Raw body length:', rawBody.length);
      
      // Verify webhook signature with raw body (required for security)
      const isValid = await this.webhookService.verifyRazorpaySignature(rawBody, signature);
      
      if (!isValid) {
        console.error('❌ Invalid Razorpay webhook signature');
        console.log('🔍 Debug info:');
        console.log('- Raw body preview:', rawBody.substring(0, 200));
        console.log('- Signature:', signature);
        console.log('- Content-Type:', headers['content-type']);
        
        // Return 400 to tell Razorpay the webhook failed
        return { success: false, message: 'Invalid signature', error: 'SIGNATURE_MISMATCH' };
      }
      
      console.log('✅ Webhook signature verified successfully');
      
      // Handle different payment events
      switch (payload.event) {
        case 'payment.captured':
          console.log('✅ Payment captured successfully:', payload.payload.payment.entity.id);
          // Payment is successful - no action needed
          break;
          
        case 'payment.failed':
          console.log('❌ Payment failed:', payload.payload.payment.entity.id);
          // Payment failed - update status in database
          await this.handleFailedPayment(payload.payload.payment.entity);
          break;
          
        case 'payment.authorized':
          console.log('🔐 Payment authorized:', payload.payload.payment.entity.id);
          // Payment authorized but not captured yet - this is normal
          console.log('ℹ️ Payment authorized, waiting for capture...');
          break;
          
        case 'order.paid':
          console.log('💰 Order paid:', payload.payload.order.entity.id);
          // Order is fully paid
          break;
          
        case 'refund.created':
          console.log('🔄 Refund created:', payload.payload.refund.entity.id);
          // Handle refund creation - this might be the issue!
          await this.handleRefundCreated(payload.payload.refund.entity);
          break;
          
        default:
          console.log('ℹ️ Unhandled webhook event:', payload.event);
      }
      
      return { success: true, message: 'Webhook processed successfully' };
      
    } catch (error) {
      console.error('❌ Razorpay webhook error:', error);
      return { success: false, message: 'Webhook processing failed', error: error.message };
    }
  }

  private async handleFailedPayment(paymentData: any) {
    try {
      // Update payment status in database
      await this.prismaService.payments.updateMany({
        where: {
          razorpayPaymentId: paymentData.id,
        },
        data: {
          status: PaymentStatus.FAILED,
          metadata: {
            failureReason: paymentData.error_description,
            failedAt: new Date().toISOString(),
          },
        },
      });
      
      console.log('💾 Payment failure recorded in database');
    } catch (error) {
      console.error('❌ Failed to update payment status:', error);
    }
  }

  private async handleRefundCreated(refundData: any) {
    try {
      console.log('🚨 REFUND ALERT - Investigating refund:', refundData);
      
      // Find the original payment
      const payment = await this.prismaService.payments.findFirst({
        where: {
          razorpayPaymentId: refundData.payment_id,
        },
      });
      
      if (payment) {
        console.log('🔍 Original payment found:', payment.id);
        console.log('💰 Original amount:', payment.amount);
        console.log('🔄 Refund amount:', refundData.amount / 100);
        
        // Log this refund for investigation
        await this.prismaService.payments.update({
          where: { id: payment.id },
          data: {
            metadata: {
              ...(payment.metadata as any),
              refundAlert: {
                refundId: refundData.id,
                refundAmount: refundData.amount / 100,
                refundReason: refundData.notes?.reason || 'Unknown',
                refundedAt: new Date().toISOString(),
                investigationRequired: true,
              },
            },
          },
        });
        
        console.log('🚨 REFUND LOGGED FOR INVESTIGATION');
      }
      
    } catch (error) {
      console.error('❌ Failed to handle refund:', error);
    }
  }
} 