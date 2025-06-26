import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SubscriptionType, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  // Credit packages
  private readonly creditPackages = {
    [SubscriptionType.FREE]: { credits: 5, price: 0 },
    [SubscriptionType.BASIC]: { credits: 100, price: 49900 }, // ₹499
    [SubscriptionType.PREMIUM]: { credits: 500, price: 199900 }, // ₹1999
    [SubscriptionType.ENTERPRISE]: { credits: 2000, price: 499900 }, // ₹4999
  };

  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createSubscription(userId: string, subscriptionType: SubscriptionType) {
    try {
      const creditPackage = this.creditPackages[subscriptionType];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      const subscription = await this.prismaService.subscription.create({
        data: {
          userId,
          type: subscriptionType,
          creditsIncluded: creditPackage.credits,
          endDate,
        },
      });

      // Update user subscription details
      await this.prismaService.user.update({
        where: { id: userId },
        data: {
          subscriptionType,
          subscriptionEndsAt: endDate,
        },
      });

      // Log subscription creation
      await this.auditService.log({
        userId,
        action: 'subscription.created',
        entityType: 'Subscription',
        entityId: subscription.id,
        metadata: {
          subscriptionType,
          creditsIncluded: creditPackage.credits,
          endDate: endDate.toISOString(),
        },
      });

      this.logger.log(`Subscription created: ${subscription.id} for user ${userId}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  async hasValidSubscription(userId: string): Promise<boolean> {
    try {
    const subscription = await this.prismaService.subscription.findFirst({
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

      const hasValid = !!subscription;
      this.logger.log(`Subscription check for user ${userId}: ${hasValid ? 'VALID' : 'INVALID'}`);
      return hasValid;
    } catch (error) {
      this.logger.error('Failed to check subscription validity:', error);
      return false;
    }
  }

  async getUserSubscription(userId: string) {
    try {
      const subscription = await this.prismaService.subscription.findFirst({
        where: {
          userId,
          status: SubscriptionStatus.ACTIVE,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return subscription;
    } catch (error) {
      this.logger.error('Failed to get user subscription:', error);
      throw error;
    }
  }

  async deductCredits(userId: string, amount: number): Promise<boolean> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < amount) {
        this.logger.warn(`Credit deduction failed: User ${userId} has ${user?.credits || 0} credits, needs ${amount}`);
        return false;
      }

      await this.prismaService.user.update({
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

      this.logger.log(`Credits deducted: ${amount} from user ${userId}, remaining: ${user.credits - amount}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to deduct credits:', error);
      return false;
    }
  }

  async addCredits(userId: string, amount: number): Promise<boolean> {
    try {
      const updatedUser = await this.prismaService.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: amount,
          },
        },
        select: { credits: true },
      });

      // Log credit addition
      await this.auditService.log({
        userId,
        action: 'credits.added',
        entityType: 'User',
        entityId: userId,
        metadata: {
          creditsAdded: amount,
          totalCredits: updatedUser.credits,
        },
      });

      this.logger.log(`Credits added: ${amount} to user ${userId}, total: ${updatedUser.credits}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to add credits:', error);
      return false;
    }
  }

  async getUserCredits(userId: string): Promise<number> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      return user?.credits || 0;
    } catch (error) {
      this.logger.error('Failed to get user credits:', error);
      return 0;
    }
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.prismaService.subscription.findFirst({
        where: {
          userId,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      await this.prismaService.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          autoRenew: false,
        },
      });

      // Log subscription cancellation
      await this.auditService.log({
        userId,
        action: 'subscription.cancelled',
        entityType: 'Subscription',
        entityId: subscription.id,
        metadata: {
          subscriptionType: subscription.type,
          cancelledAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Subscription cancelled: ${subscription.id} for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  async getSubscriptionStats(userId: string) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const credits = await this.getUserCredits(userId);

      return {
        subscription: subscription ? {
          type: subscription.type,
          status: subscription.status,
          creditsIncluded: subscription.creditsIncluded,
          creditsUsed: subscription.creditsUsed,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew,
        } : null,
        currentCredits: credits,
        hasActiveSubscription: !!subscription,
      };
    } catch (error) {
      this.logger.error('Failed to get subscription stats:', error);
      throw error;
    }
  }
}
