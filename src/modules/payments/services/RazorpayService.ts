import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpay: Razorpay;

  constructor(private configService: ConfigService) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      this.logger.error('Razorpay credentials not configured');
      throw new Error('Razorpay credentials not configured');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }

  async createOrder(amount: number, currency: string = 'INR', receipt?: string, notes?: any) {
    try {
      const orderOptions = {
        amount: amount * 100, // Convert to paise
        currency,
        receipt: receipt || `order_${Date.now()}`,
        payment_capture: true, // Auto-capture to prevent refunds
        notes: notes || {}
      };

      this.logger.log(`Creating Razorpay order: ${JSON.stringify(orderOptions)}`);

      const order = await this.razorpay.orders.create(orderOptions);
      
      this.logger.log(`Razorpay order created: ${order.id}`);
      return order;
    } catch (error) {
      this.logger.error(`Failed to create Razorpay order:`, error);
      throw new Error(`Failed to create payment order: ${error.message}`);
    }
  }

  async verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<boolean> {
    try {
      const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
      
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body.toString())
        .digest('hex');

      const isValid = expectedSignature === razorpaySignature;
      
      this.logger.log(`Payment signature verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      return isValid;
    } catch (error) {
      this.logger.error(`Payment signature verification failed:`, error);
      return false;
    }
  }

  async verifyWebhookSignature(body: string, signature: string): Promise<boolean> {
    try {
      const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        this.logger.warn('Webhook secret not configured, skipping verification');
        return true; // Allow if not configured
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === signature;
      
      this.logger.log(`Webhook signature verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      return isValid;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed:`, error);
      return false;
    }
  }

  async getPayment(paymentId: string) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      this.logger.log(`Retrieved payment: ${paymentId}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to fetch payment ${paymentId}:`, error);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  async getOrder(orderId: string) {
    try {
      const order = await this.razorpay.orders.fetch(orderId);
      this.logger.log(`Retrieved order: ${orderId}`);
      return order;
    } catch (error) {
      this.logger.error(`Failed to fetch order ${orderId}:`, error);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }

  async capturePayment(paymentId: string, amount: number, currency: string = 'INR') {
    try {
      const captureData = {
        amount: amount * 100, // Convert to paise
        currency
      };

      const payment = await this.razorpay.payments.capture(paymentId, captureData.amount, captureData.currency);
      
      this.logger.log(`Payment captured: ${paymentId} for amount ${amount}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to capture payment ${paymentId}:`, error);
      throw new Error(`Failed to capture payment: ${error.message}`);
    }
  }

  async refundPayment(paymentId: string, amount?: number, notes?: any) {
    try {
      const refundData: any = {
        notes: notes || {}
      };

      if (amount) {
        refundData.amount = amount * 100; // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);
      
      this.logger.log(`Payment refunded: ${paymentId} for amount ${amount || 'full'}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to refund payment ${paymentId}:`, error);
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }

  async getPaymentsByOrder(orderId: string) {
    try {
      const payments = await this.razorpay.orders.fetchPayments(orderId);
      this.logger.log(`Retrieved ${payments.items.length} payments for order: ${orderId}`);
      return payments;
    } catch (error) {
      this.logger.error(`Failed to fetch payments for order ${orderId}:`, error);
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }
  }

  async createSubscription(planId: string, customerId: string, options?: any) {
    try {
      const subscriptionData = {
        plan_id: planId,
        customer_id: customerId,
        total_count: options?.totalCount || 12,
        quantity: options?.quantity || 1,
        start_at: options?.startAt,
        expire_by: options?.expireBy,
        addons: options?.addons || [],
        notes: options?.notes || {}
      };

      const subscription = await this.razorpay.subscriptions.create(subscriptionData);
      
      this.logger.log(`Subscription created: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription:`, error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = false) {
    try {
      const subscription = await this.razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
      
      this.logger.log(`Subscription cancelled: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription ${subscriptionId}:`, error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.razorpay.subscriptions.fetch(subscriptionId);
      this.logger.log(`Retrieved subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to fetch subscription ${subscriptionId}:`, error);
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }
  }

  async createCustomer(name: string, email: string, contact?: string, notes?: any) {
    try {
      const customerData = {
        name,
        email,
        contact: contact || '',
        notes: notes || {}
      };

      const customer = await this.razorpay.customers.create(customerData);
      
      this.logger.log(`Customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create customer:`, error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  formatAmount(amountInPaise: number): number {
    return amountInPaise / 100;
  }

  formatAmountToPaise(amount: number): number {
    return Math.round(amount * 100);
  }

  isPaymentSuccessful(payment: any): boolean {
    return payment.status === 'captured' || payment.status === 'authorized';
  }

  isOrderPaid(order: any): boolean {
    return order.status === 'paid';
  }

  getPaymentMethod(payment: any): string {
    return payment.method || 'unknown';
  }

  getPaymentBank(payment: any): string {
    return payment.bank || 'unknown';
  }

  getPaymentWallet(payment: any): string {
    return payment.wallet || 'unknown';
  }
} 