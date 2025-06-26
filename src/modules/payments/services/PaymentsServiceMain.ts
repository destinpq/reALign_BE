import { Injectable, Logger } from '@nestjs/common';
import { PaymentOrderService } from './PaymentOrderService';
import { PaymentVerificationService } from './PaymentVerificationService';
import { AvatarGenerationDataService } from './AvatarGenerationDataService';
import { SubscriptionService } from './SubscriptionService';
import { CreateOrderDto, VerifyPaymentDto } from '../dto/payments.dto';

@Injectable()
export class PaymentsServiceMain {
  private readonly logger = new Logger(PaymentsServiceMain.name);

  constructor(
    private readonly paymentOrderService: PaymentOrderService,
    private readonly paymentVerificationService: PaymentVerificationService,
    private readonly avatarGenerationDataService: AvatarGenerationDataService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  // Order Management
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    return this.paymentOrderService.createOrder(userId, createOrderDto);
  }

  async storePaymentData(paymentData: any) {
    return this.paymentOrderService.storePaymentData(paymentData);
  }

  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    return this.paymentOrderService.getPaymentHistory(userId, page, limit);
  }

  // Payment Verification
  async verifyPayment(userId: string, verifyPaymentDto: VerifyPaymentDto) {
    return this.paymentVerificationService.verifyPayment(userId, verifyPaymentDto);
  }

  async verifyRecentPayment(userId: string, amount?: number) {
    return this.paymentVerificationService.verifyRecentPayment(userId, amount);
  }

  // Avatar Generation Data
  async storeAvatarGeneration(avatarData: any) {
    return this.avatarGenerationDataService.storeAvatarGeneration(avatarData);
  }

  async updateAvatarGenerationStatus(sessionId: string, status: string, paymentId?: string) {
    return this.avatarGenerationDataService.updateAvatarGenerationStatus(sessionId, status, paymentId);
  }

  async getAvatarGenerationBySession(sessionId: string) {
    return this.avatarGenerationDataService.getAvatarGenerationBySession(sessionId);
  }

  async linkAvatarGenerationToPayment(sessionId: string, paymentId: string) {
    return this.avatarGenerationDataService.linkAvatarGenerationToPayment(sessionId, paymentId);
  }

  async getAvatarGenerationsByUser(userId: string, page = 1, limit = 20) {
    return this.avatarGenerationDataService.getAvatarGenerationsByUser(userId, page, limit);
  }

  // Subscription Management
  async hasValidSubscription(userId: string): Promise<boolean> {
    return this.subscriptionService.hasValidSubscription(userId);
  }

  async createSubscription(userId: string, subscriptionType: any) {
    return this.subscriptionService.createSubscription(userId, subscriptionType);
  }

  async getUserSubscription(userId: string) {
    return this.subscriptionService.getUserSubscription(userId);
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    return this.subscriptionService.cancelSubscription(userId);
  }

  async getSubscriptionStats(userId: string) {
    return this.subscriptionService.getSubscriptionStats(userId);
  }

  // Credit Management
  async deductCredits(userId: string, amount: number): Promise<boolean> {
    return this.subscriptionService.deductCredits(userId, amount);
  }

  async addCredits(userId: string, amount: number): Promise<boolean> {
    return this.subscriptionService.addCredits(userId, amount);
  }

  async getUserCredits(userId: string): Promise<number> {
    return this.subscriptionService.getUserCredits(userId);
  }
}
