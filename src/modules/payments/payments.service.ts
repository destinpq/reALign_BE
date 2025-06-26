import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { CreateOrderDto, VerifyPaymentDto, PaymentWebhookDto } from './dto/payments.dto';
import { PaymentStatus, SubscriptionType, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: Razorpay;


  // Credit packages
  private readonly creditPackages = {
    [SubscriptionType.FREE]: { credits: 5, price: 0 },
    [SubscriptionType.BASIC]: { credits: 100, price: 49900 }, // ₹499
    [SubscriptionType.PREMIUM]: { credits: 500, price: 199900 }, // ₹1999
    [SubscriptionType.ENTERPRISE]: { credits: 2000, price: 499900 }, // ₹4999
  };

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new Error('❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured for live payments');
    }

    if (keySecret.includes('placeholder') || keySecret.includes('YOUR_')) {
      throw new Error('❌ Invalid Razorpay key secret. Please set proper RAZORPAY_KEY_SECRET in environment variables');
    }

    try {
      this.razorpay = new Razorpay({
        key_id
        key_idsecret: keySecret,
      });
      this.logger.log('✅ Razorpay initialized successfully in LIVE mode');
      this.logger.log(`🔑 Using Razorpay Key ID: ${keyId}`);
      this.logger.log(`🔑 Key Secret Length: ${keySecret.length} characters`);
    } catch (error) {
      this.logger.error('❌ Failed to initialize Razorpay:', error);
      throw new Error('Failed to initialize Razorpay payment gateway');
    }
  }

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    try {
      // Validate credit package or custom amount
      let creditsToAward = 0;
      let finalAmount = createOrderDto.amount;

      if (createOrderDto.subscriptionType) {
        const creditPackage = this.creditPackages[createOrderDto.subscriptionType];
        if (!creditPackage) {
          throw new BadRequestException('Invalid subscription type');
        }
        creditsToAward = creditPackage.credits;
        finalAmount = creditPackage.price;
      } else if (createOrderDto.credits) {
        // Custom credit purchase: ₹5 per credit
        creditsToAward = createOrderDto.credits;
        finalAmount = createOrderDto.credits * 500; // ₹5 = 500 paise
      }

      // Check if Razorpay is properly configured
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized - payment gateway not available');
      }

      // Create real Razorpay order with auto-capture enabled
      const razorpayOrder = await this.razorpay.orders.create({
        amount: finalAmount,
        currency: createOrderDto.currency,
        receipt: `order_${userId}_${Date.now()}`,
        payment_capture: true, // Auto-capture payments to prevent refunds
        notes: {
          userId,
          subscriptionType: createOrderDto.subscriptionType,
          credits: creditsToAward.toString(),
          auto_capture: 'true',
          service: 'AI Avatar Generation'
        },
      });

      this.logger.log(`✅ Live Razorpay order created: ${razorpayOrder.id} for ₹${finalAmount/100}`);

      // Save payment record in database
      const payment = await this.prismaService.payments.create({
        data: {
          userId,
          razorpayOrderId: razorpayOrder.id,
          amount: finalAmount / 100, // Convert paise to rupees for storage
          currency: createOrderDto.currency,
          status: PaymentStatus.PENDING,
          description: createOrderDto.description || `Purchase ${creditsToAward} credits`,
          creditsAwarded: creditsToAward,
          metadata: {
            subscriptionType: createOrderDto.subscriptionType,
            razorpayOrderDetails: JSON.parse(JSON.stringify(razorpayOrder)),
          } as any,
        },
      });

      // Log audit event
      await this.auditService.log({
        userId,
        action: 'payment.order_created',
        entityType: 'Payment',
        entityId: payment.id,
        metadata: {
          razorpayOrderId: razorpayOrder.id,
          amount: finalAmount,
          credits: creditsToAward,
        },
      });

      this.logger.log(`Payment order created: ${payment.id} for user ${userId}`);

      return {
        
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        currency: createOrderDto.currency,
        creditsAwarded: creditsToAward,
        key: this.configService.get<string>('RAZORPAY_KEY_ID'),
      };
    } catch (error) {
      this.logger.error('Failed to create payment order:', error);
      throw new InternalServerErrorException('Failed to create payment order');
    }
  }

  async verifyPayment(userId: string, verifyPaymentDto: VerifyPaymentDto) {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay not initialized - payment verification not available');
      }

      // Verify signature
      const isValid = this.verifyRazorpaySignature(
        verifyPaymentDto.razorpayOrderId,
        verifyPaymentDto.razorpayPaymentId,
        verifyPaymentDto.razorpaySignature,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid payment signature');
      }

      // Fetch payment details from Razorpay
      const razorpayPayment = await this.razorpay.payments.fetch(
        verifyPaymentDto.razorpayPaymentId,
      );

      this.logger.log(`✅ Live Razorpay payment verified: ${razorpayPayment.id} - ₹${Number(razorpayPayment.amount)/100}`);

      // Find payment record
      const payment = await this.prismaService.payments.findFirst({
        where: {
          userId,
          razorpayOrderId: verifyPaymentDto.razorpayOrderId,
        },
        include: { users: true },
      });

      if (!payment) {
        throw new BadRequestException('Payment record not found');
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        throw new BadRequestException('Payment already processed');
      }

      // Update payment status
      const updatedPayment = await this.prismaService.payments.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: verifyPaymentDto.razorpayPaymentId,
          razorpaySignature: verifyPaymentDto.razorpaySignature,
          status: PaymentStatus.COMPLETED,
          method: razorpayPayment.method,
          metadata: {
            ...(payment.metadata as any),
            razorpayPaymentDetails: JSON.parse(JSON.stringify(razorpayPayment)),
          } as any,
        },
      });

      // Award credits to user
      await this.prismaService.users.update({
        where: { id: userId },
        data: {
          credits: {
            increment: payment.creditsAwarded,
          },
        },
      });

      // Create subscription if applicable
      const metadata = payment.metadata as any;
      if (metadata?.subscriptionType) {
        await this.createSubscription(userId, metadata.subscriptionType as SubscriptionType);
      }

      // Log audit event
      await this.auditService.log({
        userId,
        action: 'payment.completed',
        entityType: 'Payment',
        entityId: payment.id,
        metadata: {
          razorpayPaymentId: verifyPaymentDto.razorpayPaymentId,
          creditsAwarded: payment.creditsAwarded,
          amount: payment.amount,
        },
      });

      // Send confirmation email
      await this.emailService.sendPaymentConfirmation(
        payment.users.email,
        {
          paymentId: payment.id,
          amount: Number(payment.amount),
          credits: payment.creditsAwarded,
          currency: payment.currency,
        },
      );

      this.logger.log(`Payment completed: ${payment.id}, credits awarded: ${payment.creditsAwarded}`);

      return {
        success: true,
        payment: updatedPayment,
        creditsAwarded: payment.creditsAwarded,
      };
    } catch (error) {
      this.logger.error('Payment verification failed:', error);
      
      // Log failed payment attempt
      await this.auditService.log({
        userId,
        action: 'payment.verification_failed',
        entityType: 'Payment',
        metadata: {
          razorpayOrderId: verifyPaymentDto.razorpayOrderId,
          error: error.message,
        },
      });

      throw error;
    }
  }

  async storePaymentData(paymentData: {
    userId: string; // 🔥 REQUIRE REAL USER ID!
    razorpayPaymentId: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    creditsAwarded: number;
    metadata: any;
  }) {
    try {
      // 🔥 VERIFY USER EXISTS FIRST!
      const user = await this.prismaService.users.findUnique({
        where: { id: paymentData.userId },
        select: {  email: true }
      });

      if (!user) {
        throw new Error(`User with ID ${paymentData.userId} not found. Please log in again.`);
      }

      this.logger.log(`🔐 VERIFIED USER FOR PAYMENT: ${user.email} (${user.id})`);

      // Store payment data in database immediately
      const payment = await this.prismaService.payments.create({
        data: {
          userId: paymentData.userId, // 🔥 USE REAL USER ID!
          razorpayPaymentId: paymentData.razorpayPaymentId,
          razorpayOrderId: paymentData.razorpayOrderId,
          razorpaySignature: paymentData.razorpaySignature,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: paymentData.status as PaymentStatus,
          description: paymentData.description,
          creditsAwarded: paymentData.creditsAwarded,
          metadata: paymentData.metadata as any,
        },
      });

      this.logger.log(`💾 Payment data stored: ${payment.id} - ${paymentData.razorpayPaymentId}`);

      return payment;
    } catch (error) {
      this.logger.error('❌ Failed to store payment data:', error);
      throw error;
    }
  }

  async storeAvatarGeneration(avatarData: {
    sessionId: string;
    userImage: string;
    selectedWearables: any[];
    selectedScenery: string;
    userDetails: any;
    generatedPrompt: string;
    status: string;
    metadata: any;
  }) {
    try {
      // Store avatar generation data in database
      const avatarGeneration = await this.prismaService.avatar_generations.create({
        data: {
          sessionId: avatarData.sessionId,
          userImage: avatarData.userImage,
          selectedWearables: avatarData.selectedWearables,
          selectedScenery: avatarData.selectedScenery,
          userDetails: avatarData.userDetails,
          generatedPrompt: avatarData.generatedPrompt,
          status: avatarData.status,
          metadata: avatarData.metadata as any,
        },
      });

      this.logger.log(`💾 Avatar generation data stored: ${avatarGeneration.sessionId}`);
      return avatarGeneration;
    } catch (error) {
      this.logger.error('❌ Failed to store avatar generation data:', error);
      throw error;
    }
  }

  async updateAvatarGenerationStatus(sessionId: string, status: string, paymentId?: string) {
    try {
      // First check if the record exists
      const existing = await this.prismaService.avatar_generations.findUnique({
        where: { sessionId },
      });

      if (!existing) {
        this.logger.warn(`⚠️ Avatar generation not found for session: ${sessionId}. Skipping update.`);
        return null;
      }

      const updateData: any = {
        status,
        
      };

      if (paymentId) {
        updateData.paymentId = paymentId;
      }

      const updated = await this.prismaService.avatar_generations.update({
        where: { sessionId },
        data: updateData,
      });

      this.logger.log(`✅ Avatar generation status updated: ${sessionId} -> ${status}`);
      return updated;
    } catch (error) {
      this.logger.error('❌ Failed to update avatar generation status:', error);
      throw error;
    }
  }

  async getAvatarGenerationBySession(sessionId: string) {
    try {
      const avatarGeneration = await this.prismaService.avatar_generations.findUnique({
        where: { sessionId },
      });

      if (!avatarGeneration) {
        throw new Error('Avatar generation session not found');
      }

      return avatarGeneration;
    } catch (error) {
      this.logger.error('❌ Failed to get avatar generation:', error);
      throw error;
    }
  }



  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prismaService.payments.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          
          razorpayOrderId: true,
          razorpayPaymentId: true,
          amount: true,
          currency: true,
          status: true,
          method: true,
          description: true,
          creditsAwarded: true,
          createdAt: true,
          
        },
      }),
      this.prismaService.payments.count({
        where: { userId },
      }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async hasValidSubscription(userId: string): Promise<boolean> {
    const subscription = await this.prismaService.subscriptions.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        OR: [
          {
            endDate: {
              gt: new Date(),
            },
          },
          {
            endDate: null, // Unlimited subscription
          },
        ],
      },
    });

    return !!subscription;
  }

  async verifyRecentPayment(userId: string, amount?: number): Promise<any> {
    try {
      // Check for recent successful payments
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const recentPayment = await this.prismaService.payments.findFirst({
        where: {
          userId,
          status: PaymentStatus.COMPLETED,
          createdAt: {
            gte: twentyFourHoursAgo,
          },
          ...(amount && {
            amount: {
              gte: amount * 100, // Convert to paise
            },
          }),
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (recentPayment) {
        return {
          hasValidPayment: true,
          paymentDetails: {
            
            amount: Number(recentPayment.amount) / 100, // Convert from paise
            currency: recentPayment.currency,
            completedAt: recentPayment.updatedAt,
            creditsAwarded: recentPayment.creditsAwarded,
          },
        };
      }

      return {
        hasValidPayment: false,
        message: 'No recent valid payment found',
      };
    } catch (error) {
      this.logger.error('Failed to verify recent payment:', error);
      throw error;
    }
  }

  async deductCredits(userId: string, amount: number): Promise<boolean> {
    try {
      const user = await this.prismaService.users.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < amount) {
        return false;
      }

      await this.prismaService.users.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: amount,
          },
        },
      });

      // Log credit deduction
      await this.auditService.log({
        userId,
        action: 'credits.deducted',
        entityType: 'User',
        entityId: userId,
        metadata: {
          creditsDeducted: amount,
          remainingCredits: user.credits - amount,
        },
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to deduct credits:', error);
      return false;
    }
  }

  private verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.configService.get<string>('RAZORPAY_KEY_SECRET'))
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }





  private async createSubscription(userId: string, subscriptionType: SubscriptionType) {
    const creditPackage = this.creditPackages[subscriptionType];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    await this.prismaService.subscriptions.create({
      data: {
        userId,
        type: subscriptionType,
        creditsIncluded: creditPackage.credits,
        endDate,
      },
    });

    await this.prismaService.users.update({
      where: { id: userId },
      data: {
        subscriptionType,
        subscriptionEndsAt: endDate,
      },
    });
  }
} 