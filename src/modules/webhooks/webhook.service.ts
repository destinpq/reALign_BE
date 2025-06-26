Dimport { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface WebhookDeliveryLog {
  source: string;
  eventType: string;
  payload: any;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ========================================
  // WEBHOOK SIGNATURE VERIFICATION
  // ========================================

  async verifyMagicHourSignature(payload: string, signature: string): Promise<boolean> {
    try {
      if (!signature) {
        this.logger.warn('No Magic Hour signature provided');
        return true; // Allow for now, implement proper verification when Magic Hour provides webhook secrets
      }

      // TODO: Implement Magic Hour signature verification when they provide webhook secrets
      // const webhookSecret = this.configService.get<string>('MAGIC_HOUR_WEBHOOK_SECRET');
      // if (!webhookSecret) {
      //   this.logger.warn('Magic Hour webhook secret not configured');
      //   return false;
      // }

      // const expectedSignature = crypto
      //   .createHmac('sha256', webhookSecret)
      //   .update(payload)
      //   .digest('hex');

      // return crypto.timingSafeEqual(
      //   Buffer.from(signature),
      //   Buffer.from(expectedSignature)
      // );

      return true; // Temporary - allow all Magic Hour webhooks
    } catch (error) {
      this.logger.error('Failed to verify Magic Hour signature', error);
      return false;
    }
  }



  async verifyGenericSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      if (!signature || !secret) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      this.logger.error('Failed to verify generic signature', error);
      return false;
    }
  }

  // ========================================
  // WEBHOOK DELIVERY LOGGING
  // ========================================

  async logWebhookDelivery(log: WebhookDeliveryLog): Promise<void> {
    try {
      await this.prisma.webhook_deliveries.create({
        data: {
          webhookEndpointId: 'system', // Use system for internal logging
          eventType: log.eventType,
          payload: log.payload,
          status: log.status === 'SUCCESS' ? 'DELIVERED' : 'FAILED',
          response: log.error || 'Success',
          attempts: 1,
          deliveredAt: log.status === 'SUCCESS' ? new Date() : null,
        },
      });

      this.logger.log(`Webhook delivery logged: ${log.source} - ${log.eventType} - ${log.status}`);
    } catch (error) {
      this.logger.error('Failed to log webhook delivery', error);
    }
  }

  // ========================================
  // WEBHOOK ENDPOINT MANAGEMENT
  // ========================================

  async createWebhookEndpoint(url: string, events: string[], secret?: string, description?: string): Promise<any> {
    return this.prisma.webhook_endpoints.create({
      data: {
        url,
        secret: secret || crypto.randomBytes(32).toString('hex'),
        events,
        description,
        isActive: true,
      },
    });
  }

  async getWebhookEndpoints(): Promise<any[]> {
    return this.prisma.webhook_endpoints.findMany({
      where: { isActive: true },
      include: {
        webhook_deliveries: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async updateWebhookEndpoint(id: string, updates: any): Promise<any> {
    return this.prisma.webhook_endpoints.update({
      where: { id },
      data: updates,
    });
  }

  async deleteWebhookEndpoint(id: string): Promise<void> {
    await this.prisma.webhook_endpoints.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ========================================
  // WEBHOOK DELIVERY MANAGEMENT
  // ========================================

  async getWebhookDeliveries(endpointId?: string, limit = 50): Promise<any[]> {
    const where = endpointId ? { webhookEndpointId: endpointId } : {};

    return this.prisma.webhook_deliveries.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        webhook_endpoints: {
          select: {
            url: true,
            description: true,
          },
        },
      },
    });
  }

  async retryWebhookDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhook_deliveries.findUnique({
      where: { id: deliveryId },
      include: { webhook_endpoints: true },
    });

    if (!delivery) {
      throw new Error('Webhook delivery not found');
    }

    if (delivery.attempts >= delivery.maxAttempts) {
      throw new Error('Maximum retry attempts reached');
    }

    // TODO: Implement actual webhook delivery logic
    // This would involve making HTTP requests to the webhook endpoints

    await this.prisma.webhook_deliveries.update({
      where: { id: deliveryId },
      data: {
        attempts: { increment: 1 },
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
      },
    });
  }

  // ========================================
  // WEBHOOK ANALYTICS
  // ========================================

  async getWebhookAnalytics(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      deliveriesBySource,
      deliveriesByEvent,
      recentDeliveries
    ] = await Promise.all([
      this.prisma.webhook_deliveries.count({ where }),
      this.prisma.webhook_deliveries.count({ where: { ...where, status: 'DELIVERED' } }),
      this.prisma.webhook_deliveries.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.webhook_deliveries.groupBy({
        by: ['webhookEndpointId'],
        where,
        _count: { webhookEndpointId: true },
        orderBy: { _count: { webhookEndpointId: 'desc' } },
        take: 10,
      }),
      this.prisma.webhook_deliveries.groupBy({
        by: ['eventType'],
        where,
        _count: { eventType: true },
        orderBy: { _count: { eventType: 'desc' } },
        take: 10,
      }),
      this.prisma.webhook_deliveries.findMany({
        where,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          webhook_endpoints: {
            select: { url: true, description: true },
          },
        },
      }),
    ]);

    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

    return {
      summary: {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate: Math.round(successRate * 100) / 100,
      },
      breakdown: {
        deliveriesBySource,
        deliveriesByEvent,
      },
      recentDeliveries,
    };
  }

  // ========================================
  // WEBHOOK TESTING
  // ========================================

  async testWebhookEndpoint(endpointId: string, testPayload?: any): Promise<any> {
    const endpoint = await this.prisma.webhook_endpoints.findUnique({
      where: { id: endpointId },
    });

    if (!endpoint) {
      throw new Error('Webhook endpoint not found');
    }

    const payload = testPayload || {
      event_type: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook' },
    };

    // TODO: Implement actual HTTP request to webhook endpoint
    // For now, just log the test
    await this.logWebhookDelivery({
      source: 'TEST',
      eventType: 'test',
      payload,
      status: 'SUCCESS',
    });

    return {
      success: true,
      endpoint: endpoint.url,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  // ========================================
  // RAZORPAY PAYMENT WEBHOOK HANDLERS
  // ========================================

  async verifyRazorpaySignature(payload: string, signature: string): Promise<boolean> {
    try {
      const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
      if (!webhookSecret) {
        this.logger.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not configured - allowing webhook for development');
        // In development, allow webhooks without signature verification
        return true;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      const isValid = expectedSignature === signature;
      
      if (!isValid) {
        this.logger.error('❌ Razorpay webhook signature mismatch', {
          expected: expectedSignature,
          received: signature,
          payload: payload.substring(0, 100) + '...'
        });
      } else {
        this.logger.log('✅ Razorpay webhook signature verified');
      }

      return isValid;
    } catch (error) {
      this.logger.error('❌ Failed to verify Razorpay signature:', error);
      return false;
    }
  }



  // ========================================
  // PAYMENT VERIFICATION FOR FRONTEND
  // ========================================

  async verifyPaymentForUser(paymentId: string, email?: string): Promise<any> {
    try {
      const payment = await this.prisma.payments.findFirst({
        where: {
          razorpayPaymentId: paymentId,
          status: 'COMPLETED',
        },
      });

      if (!payment) {
        return {
          verified: false,
          message: 'Payment not found or not completed',
        };
      }

      // Check if payment is recent (within 24 hours for avatar generation)
      const paymentTime = payment.updatedAt || payment.createdAt;
      const now = new Date();
      const hoursDiff = (now.getTime() - paymentTime.getTime()) / (1000 * 3600);

      if (hoursDiff > 24) {
        return {
          verified: false,
          message: 'Payment expired (older than 24 hours)',
        };
      }

      return {
        verified: true,
        payment: {
          
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          completedAt: payment.updatedAt,
        },
        message: 'Payment verified successfully',
      };
    } catch (error) {
      this.logger.error('❌ Failed to verify payment:', error);
      return {
        verified: false,
        message: 'Payment verification failed',
      };
    }
  }
} 