import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateOrderDto } from '../dto/payments.dto';
import { PaymentStatus, SubscriptionType } from '@prisma/client';

@Injectable()
export class PaymentOrderService {
  private readonly logger = new Logger(PaymentOrderService.name);
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
        key_id: keyId,
        key_secret: keySecret,
      });
      this.logger.log('✅ Razorpay initialized successfully in PaymentOrderService');
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

  async storePaymentData(paymentData: {
    userId: string;
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
      // Verify user exists first
      const user = await this.prismaService.users.findUnique({
        where: { id: paymentData.userId },
        select: { id: true, email: true }
      });

      if (!user) {
        throw new Error(`User with ID ${paymentData.userId} not found. Please log in again.`);
      }

      this.logger.log(`🔐 VERIFIED USER FOR PAYMENT: ${user.email} (${user.id})`);

      // Store payment data in database immediately
      const payment = await this.prismaService.payments.create({
        data: {
          userId: paymentData.userId,
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

  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [payments, total] = await Promise.all([
        this.prismaService.payments.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
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
    } catch (error) {
      this.logger.error('Failed to get payment history:', error);
      throw new InternalServerErrorException('Failed to retrieve payment history');
    }
  }
}
