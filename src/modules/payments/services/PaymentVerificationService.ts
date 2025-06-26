import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EmailService } from '../../email/email.service';
import { VerifyPaymentDto } from '../dto/payments.dto';
import { PaymentStatus, SubscriptionType } from '@prisma/client';

@Injectable()
export class PaymentVerificationService {
  private readonly logger = new Logger(PaymentVerificationService.name);
  private readonly razorpay: Razorpay;

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
        key_id: keyId,
        key_secret: keySecret,
      });
      this.logger.log('✅ Razorpay initialized successfully in PaymentVerificationService');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Razorpay:', error);
      throw new Error('Failed to initialize Razorpay payment gateway');
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

  private verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.configService.get<string>('RAZORPAY_KEY_SECRET'))
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  private async createSubscription(userId: string, subscriptionType: SubscriptionType) {
    const creditPackages = {
      [SubscriptionType.FREE]: { credits: 5, price: 0 },
      [SubscriptionType.BASIC]: { credits: 100, price: 49900 },
      [SubscriptionType.PREMIUM]: { credits: 500, price: 199900 },
      [SubscriptionType.ENTERPRISE]: { credits: 2000, price: 499900 },
    };

    const creditPackage = creditPackages[subscriptionType];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    await this.prismaService.subscriptions.create({
      data: {
        userId,
        type: subscriptionType,
        creditsIncluded: creditPackage.credits,
        endDate,
        updatedAt: new Date(),
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
