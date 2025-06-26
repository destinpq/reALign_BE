import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PaymentsService } from '../payments/services';
import * as bcrypt from 'bcryptjs';
import {
  CreateAdminDto,
  SystemStatsDto,
  UserManagementDto,
  PaymentAnalyticsDto,
  UpdateUserStatusDto,
  AwardCreditsDto,
} from './dto/admin.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async createAdmin(createAdminDto: CreateAdminDto, createdBy: string) {
    try {
      // Check if admin already exists
      const existingAdmin = await this.prismaService.user.findUnique({
        where: { email: createAdminDto.email },
      });

      if (existingAdmin) {
        throw new BadRequestException('Admin with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createAdminDto.password, 12);

      // Create admin user
      const admin = await this.prismaService.user.create({
        data: {
          email: createAdminDto.email,
          password: hashedPassword,
          firstName: createAdminDto.firstName,
          lastName: createAdminDto.lastName,
          role: createAdminDto.role,
          isEmailVerified: true, // Admins are pre-verified
          credits: 1000, // Give admins initial credits
        },
      });

      // Log admin creation
      await this.auditService.log({
        userId: createdBy,
        action: 'admin.created',
        entityType: 'User',
        entityId: admin.id,
        metadata: {
          adminEmail: admin.email,
          adminRole: admin.role,
          createdBy,
        },
      });

      this.logger.log(`Admin created: ${admin.email} by ${createdBy}`);

      return {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        createdAt: admin.createdAt,
      };
    } catch (error) {
      this.logger.error('Failed to create admin:', error);
      throw error;
    }
  }

  async getSystemStats(): Promise<SystemStatsDto> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        totalUsers,
        activeUsers,
        totalPayments,
        totalRevenue,
        totalHeadshots,
        successfulHeadshots,
        failedHeadshots,
        totalCreditsPurchased,
        totalCreditsConsumed,
        emailStats,
      ] = await Promise.all([
        this.prismaService.user.count(),
        this.prismaService.user.count({
          where: {
            lastLoginAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prismaService.payment.count(),
        this.prismaService.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'COMPLETED' },
        }),
        this.prismaService.processingJob.count({
          where: { type: 'HEADSHOT_GENERATION' },
        }),
        this.prismaService.processingJob.count({
          where: {
            type: 'HEADSHOT_GENERATION',
            status: 'COMPLETED',
          },
        }),
        this.prismaService.processingJob.count({
          where: {
            type: 'HEADSHOT_GENERATION',
            status: 'FAILED',
          },
        }),
        this.prismaService.payment.aggregate({
          _sum: { creditsAwarded: true },
          where: { status: 'COMPLETED' },
        }),
        this.prismaService.processingJob.aggregate({
          _sum: { creditsUsed: true },
        }),
        this.emailService.getEmailStats(),
      ]);

      return {
        totalUsers,
        activeUsers,
        totalPayments,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        totalHeadshots,
        successfulHeadshots,
        failedHeadshots,
        totalCreditsPurchased: totalCreditsPurchased._sum.creditsAwarded || 0,
        totalCreditsConsumed: totalCreditsConsumed._sum.creditsUsed || 0,
        totalEmails: emailStats.totalEmails,
        emailSuccessRate: emailStats.successRate,
      };
    } catch (error) {
      this.logger.error('Failed to get system stats:', error);
      throw error;
    }
  }

  async getUsersForManagement(filters: UserManagementDto) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (filters.search) {
        whereClause.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.role) {
        whereClause.role = filters.role;
      }

      if (filters.isActive !== undefined) {
        whereClause.isActive = filters.isActive;
      }

      const [users, total] = await Promise.all([
        this.prismaService.user.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            credits: true,
            subscriptionType: true,
            subscriptionEndsAt: true,
            lastLoginAt: true,
            createdAt: true,
            _count: {
              select: {
                payments: true,
                processingJobs: true,
              },
            },
          },
        }),
        this.prismaService.user.count({ where: whereClause }),
      ]);

      return {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get users for management:', error);
      throw error;
    }
  }

  async getPaymentAnalytics(filters: PaymentAnalyticsDto) {
    try {
      const whereClause: any = {};

      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      const [
        totalPayments,
        totalRevenue,
        averagePayment,
        paymentsByStatus,
        paymentsByMonth,
        topUsers,
      ] = await Promise.all([
        this.prismaService.payment.count({ where: whereClause }),
        this.prismaService.payment.aggregate({
          _sum: { amount: true },
          where: whereClause,
        }),
        this.prismaService.payment.aggregate({
          _avg: { amount: true },
          where: whereClause,
        }),
        this.prismaService.payment.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true },
          _sum: { amount: true },
        }),
        this.prismaService.payment.groupBy({
          by: ['createdAt'],
          where: whereClause,
          _count: { id: true },
          _sum: { amount: true },
        }),
        this.prismaService.payment.groupBy({
          by: ['userId'],
          where: { ...whereClause, status: 'COMPLETED' },
          _count: { userId: true },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        totalPayments,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        averagePayment: Number(averagePayment._avg.amount || 0),
        paymentsByStatus: paymentsByStatus.map(item => ({
          status: item.status,
          count: item._count.status,
          revenue: Number(item._sum.amount || 0),
        })),
        paymentsByMonth,
        topUsers,
      };
    } catch (error) {
      this.logger.error('Failed to get payment analytics:', error);
      throw error;
    }
  }

  async updateUserStatus(
    updateUserStatusDto: UpdateUserStatusDto,
    adminId: string,
  ) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: updateUserStatusDto.userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const updatedUser = await this.prismaService.user.update({
        where: { id: updateUserStatusDto.userId },
        data: { isActive: updateUserStatusDto.isActive },
      });

      // Log the action
      await this.auditService.log({
        userId: adminId,
        action: 'admin.user_status_updated',
        entityType: 'User',
        entityId: updateUserStatusDto.userId,
        oldValues: { isActive: user.isActive },
        newValues: { isActive: updateUserStatusDto.isActive },
        metadata: {
          reason: updateUserStatusDto.reason,
          adminId,
        },
      });

      // Send notification email to user
      if (user.email) {
        await this.emailService.sendAccountStatusUpdate(
          user.email,
          {
            name: `${user.firstName} ${user.lastName}`,
            status: updateUserStatusDto.isActive ? 'activated' : 'deactivated',
            reason: updateUserStatusDto.reason,
          },
        );
      }

      this.logger.log(
        `User ${updateUserStatusDto.userId} status updated to ${updateUserStatusDto.isActive} by admin ${adminId}`,
      );

      return updatedUser;
    } catch (error) {
      this.logger.error('Failed to update user status:', error);
      throw error;
    }
  }

  async awardCredits(awardCreditsDto: AwardCreditsDto, adminId: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: awardCreditsDto.userId },
        select: { credits: true, email: true, firstName: true, lastName: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const updatedUser = await this.prismaService.user.update({
        where: { id: awardCreditsDto.userId },
        data: {
          credits: { increment: awardCreditsDto.credits },
        },
      });

      // Log the action
      await this.auditService.log({
        userId: adminId,
        action: 'admin.credits_awarded',
        entityType: 'User',
        entityId: awardCreditsDto.userId,
        oldValues: { credits: user.credits },
        newValues: { credits: user.credits + awardCreditsDto.credits },
        metadata: {
          creditsAwarded: awardCreditsDto.credits,
          reason: awardCreditsDto.reason,
          adminId,
        },
      });

      // Send notification email to user
      if (user.email) {
        await this.emailService.sendCreditsAwarded(
          user.email,
          {
            name: `${user.firstName} ${user.lastName}`,
            creditsAwarded: awardCreditsDto.credits,
            newBalance: user.credits + awardCreditsDto.credits,
            reason: awardCreditsDto.reason,
          },
        );
      }

      this.logger.log(
        `${awardCreditsDto.credits} credits awarded to user ${awardCreditsDto.userId} by admin ${adminId}`,
      );

      return {
        success: true,
        newCreditBalance: user.credits + awardCreditsDto.credits,
        creditsAwarded: awardCreditsDto.credits,
      };
    } catch (error) {
      this.logger.error('Failed to award credits:', error);
      throw error;
    }
  }

  async getRecentActivity(limit = 100) {
    try {
      const recentActivity = await this.auditService.getSystemActivity(1, limit);
      return recentActivity;
    } catch (error) {
      this.logger.error('Failed to get recent activity:', error);
      throw error;
    }
  }

  async getUserDetails(userId: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          processingJobs: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Get violation history
      const violationHistory = await this.auditService.getUserActivity(userId, 1, 50);

      return {
        user,
        violationHistory,
      };
    } catch (error) {
      this.logger.error('Failed to get user details:', error);
      throw error;
    }
  }

  async getDashboardMetrics() {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const [
        newUsersToday,
        newUsersYesterday,
        paymentsToday,
        paymentsYesterday,
        headshotsToday,
        headshotsYesterday,
        systemHealth,
      ] = await Promise.all([
        this.prismaService.user.count({
          where: {
            createdAt: {
              gte: new Date(today.toDateString()),
            },
          },
        }),
        this.prismaService.user.count({
          where: {
            createdAt: {
              gte: new Date(yesterday.toDateString()),
              lt: new Date(today.toDateString()),
            },
          },
        }),
        this.prismaService.payment.count({
          where: {
            createdAt: {
              gte: new Date(today.toDateString()),
            },
          },
        }),
        this.prismaService.payment.count({
          where: {
            createdAt: {
              gte: new Date(yesterday.toDateString()),
              lt: new Date(today.toDateString()),
            },
          },
        }),
        this.prismaService.processingJob.count({
          where: {
            type: 'HEADSHOT_GENERATION',
            createdAt: {
              gte: new Date(today.toDateString()),
            },
          },
        }),
        this.prismaService.processingJob.count({
          where: {
            type: 'HEADSHOT_GENERATION',
            createdAt: {
              gte: new Date(yesterday.toDateString()),
              lt: new Date(today.toDateString()),
            },
          },
        }),
        this.getSystemHealth(),
      ]);

      return {
        newUsers: {
          today: newUsersToday,
          yesterday: newUsersYesterday,
          change: newUsersYesterday > 0 ? ((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100 : 0,
        },
        payments: {
          today: paymentsToday,
          yesterday: paymentsYesterday,
          change: paymentsYesterday > 0 ? ((paymentsToday - paymentsYesterday) / paymentsYesterday) * 100 : 0,
        },
        headshots: {
          today: headshotsToday,
          yesterday: headshotsYesterday,
          change: headshotsYesterday > 0 ? ((headshotsToday - headshotsYesterday) / headshotsYesterday) * 100 : 0,
        },
        systemHealth,
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard metrics:', error);
      throw error;
    }
  }

  async getDashboard() {
    return this.getDashboardMetrics();
  }

  async getPublicStats() {
    try {
      const [
        totalUsers,
        totalImages,
        totalWearables,
      ] = await Promise.all([
        this.prismaService.user.count(),
        this.prismaService.processingJob.count({
          where: {
            type: 'HEADSHOT_GENERATION',
            status: 'COMPLETED',
          },
        }),
        this.prismaService.wearableItem.count(),
      ]);

      return {
        totalUsers,
        totalImages,
        totalWearables,
        success: true,
      };
    } catch (error) {
      this.logger.error('Failed to get public stats:', error);
      // Return fallback data if database fails
      return {
        totalUsers: 50234,
        totalImages: 127543,
        totalWearables: 10000,
        success: false,
        message: 'Using fallback data',
      };
    }
  }

  private async getSystemHealth() {
    try {
      // Check database connection
      await this.prismaService.$queryRaw`SELECT 1`;
      
      // Check recent error rates
      const recentErrors = await this.prismaService.auditLog.count({
        where: {
          action: { contains: 'error' },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const totalRequests = await this.prismaService.auditLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const errorRate = totalRequests > 0 ? (recentErrors / totalRequests) * 100 : 0;

      return {
        database: 'healthy',
        errorRate,
        status: errorRate < 5 ? 'healthy' : errorRate < 10 ? 'warning' : 'critical',
      };
    } catch (error) {
      return {
        database: 'unhealthy',
        errorRate: 100,
        status: 'critical',
      };
    }
  }
} 