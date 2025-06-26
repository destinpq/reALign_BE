import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface UserActivitySummary {
  userId: string;
  userInfo: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    credits: number;
    subscriptionType: string;
    createdAt: Date;
    lastLoginAt?: Date;
  };
  activityStats: {
    totalLogins: number;
    lastLogin?: Date;
    totalPayments: number;
    totalSpent: number;
    totalCreditsUsed: number;
    totalHeadshots: number;
    successfulHeadshots: number;
    failedHeadshots: number;
    contentViolations: number;
    highRiskViolations: number;
  };
  recentActivity: Array<{
    action: string;
    timestamp: Date;
    details: any;
  }>;
  riskProfile: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    violationScore: number;
    lastViolation?: Date;
    accountFlags: string[];
  };
}

export interface SystemActivityOverview {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  topActiveUsers: Array<{
    userId: string;
    email: string;
    name: string;
    activityCount: number;
    lastActivity: Date;
  }>;
  usersByActivity: {
    veryActive: number; // >50 actions in last 7 days
    active: number; // 10-50 actions in last 7 days
    moderate: number; // 3-10 actions in last 7 days
    inactive: number; // <3 actions in last 7 days
  };
  contentModerationStats: {
    totalChecks: number;
    violations: number;
    violationRate: number;
    topViolators: Array<{
      userId: string;
      email: string;
      violationCount: number;
    }>;
  };
}

@Injectable()
export class UserAnalyticsService {
  private readonly logger = new Logger(UserAnalyticsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getUserActivitySummary(userId: string): Promise<UserActivitySummary> {
    try {
      // Get user basic info
      const user = await this.prismaService.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          credits: true,
          subscriptionType: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get activity statistics
      const [
        loginCount,
        paymentStats,
        processingJobStats,
        violationStats,
        recentActivity,
      ] = await Promise.all([
        // Login count
        this.prismaService.audit_logs.count({
          where: {
            userId,
            action: { in: ['auth.login', 'auth.token_refresh'] },
          },
        }),

        // Payment statistics
        this.prismaService.payments.aggregate({
          where: { userId },
          _count: { id: true },
          _sum: { amount: true, creditsAwarded: true },
        }),

        // Processing job statistics
        this.prismaService.processing_jobs.groupBy({
          by: ['status'],
          where: {
            userId,
            type: 'HEADSHOT_GENERATION',
          },
          _count: { status: true },
          _sum: { creditsUsed: true },
        }),

        // Violation statistics
        this.prismaService.audit_logs.aggregate({
          where: {
            userId,
            action: 'content.violation_detected',
          },
          _count: { id: true },
        }),

        // Recent activity (last 50 actions)
        this.prismaService.audit_logs.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            action: true,
            createdAt: true,
            metadata: true,
            entityType: true,
          },
        }),
      ]);

      // Process processing job stats
      const totalHeadshots = processingJobStats.reduce((sum, stat) => sum + stat._count.status, 0);
      const successfulHeadshots = processingJobStats.find(s => s.status === 'COMPLETED')?._count.status || 0;
      const failedHeadshots = processingJobStats.find(s => s.status === 'FAILED')?._count.status || 0;
      const totalCreditsUsed = processingJobStats.reduce((sum, stat) => sum + (stat._sum.creditsUsed || 0), 0);

      // Get high-risk violations
      const highRiskViolations = await this.prismaService.audit_logs.count({
        where: {
          userId,
          action: 'content.violation_detected',
          metadata: {
            path: ['riskScore'],
            gte: 80,
          },
        },
      });

      // Calculate risk profile
      const riskProfile = this.calculateUserRiskProfile(
        violationStats._count.id,
        highRiskViolations,
        user.isActive,
      );

      return {
        userId,
        userInfo: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          credits: user.credits,
          subscriptionType: user.subscriptionType,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
        activityStats: {
          totalLogins: loginCount,
          lastLogin: user.lastLoginAt,
          totalPayments: paymentStats._count.id,
          totalSpent: Number(paymentStats._sum.amount || 0),
          totalCreditsUsed,
          totalHeadshots,
          successfulHeadshots,
          failedHeadshots,
          contentViolations: violationStats._count.id,
          highRiskViolations,
        },
        recentActivity: recentActivity.map(activity => ({
          action: activity.action,
          timestamp: activity.createdAt,
          details: activity.metadata,
        })),
        riskProfile,
      };
    } catch (error) {
      this.logger.error(`Failed to get user activity summary for ${userId}:`, error);
      throw error;
    }
  }

  async getSystemActivityOverview(): Promise<SystemActivityOverview> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        activeUsers,
        newUsersToday,
        userActivityCounts,
        contentModerationStats,
        topViolators,
      ] = await Promise.all([
        // Total users
        this.prismaService.users.count(),

        // Active users (logged in last 7 days)
        this.prismaService.users.count({
          where: {
            lastLoginAt: { gte: sevenDaysAgo },
          },
        }),

        // New users today
        this.prismaService.users.count({
          where: {
            createdAt: { gte: today },
          },
        }),

        // User activity counts
        this.prismaService.audit_logs.groupBy({
          by: ['userId'],
          where: {
            createdAt: { gte: sevenDaysAgo },
            userId: { not: null },
          },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 100,
        }),

        // Content moderation stats
        this.prismaService.audit_logs.aggregate({
          where: {
            action: { in: ['content.moderation_check', 'content.violation_detected'] },
            createdAt: { gte: sevenDaysAgo },
          },
          _count: { id: true },
        }),

        // Top violators
        this.prismaService.audit_logs.groupBy({
          by: ['userId'],
          where: {
            action: 'content.violation_detected',
            userId: { not: null },
            createdAt: { gte: sevenDaysAgo },
          },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }),
      ]);

      // Get top active users with details
      const topActiveUserIds = userActivityCounts.slice(0, 10).map(u => u.userId).filter(Boolean);
      const topActiveUsersDetails = await this.prismaService.users.findMany({
        where: { id: { in: topActiveUserIds as string[] } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          lastLoginAt: true,
        },
      });

      const topActiveUsers = topActiveUserIds.map(userId => {
        const userDetail = topActiveUsersDetails.find(u => u.id === userId);
        const activityCount = userActivityCounts.find(u => u.userId === userId)?._count.userId || 0;
        
        return {
          userId: userId as string,
          email: userDetail?.email || 'Unknown',
          name: `${userDetail?.firstName || ''} ${userDetail?.lastName || ''}`.trim(),
          activityCount,
          lastActivity: userDetail?.lastLoginAt || new Date(),
        };
      });

      // Categorize users by activity level
      const usersByActivity = {
        veryActive: userActivityCounts.filter(u => u._count.userId > 50).length,
        active: userActivityCounts.filter(u => u._count.userId >= 10 && u._count.userId <= 50).length,
        moderate: userActivityCounts.filter(u => u._count.userId >= 3 && u._count.userId < 10).length,
        inactive: Math.max(0, totalUsers - userActivityCounts.length),
      };

      // Get violation statistics
      const totalViolations = await this.prismaService.audit_logs.count({
        where: {
          action: 'content.violation_detected',
          createdAt: { gte: sevenDaysAgo },
        },
      });

      const totalModerationChecks = await this.prismaService.audit_logs.count({
        where: {
          action: 'content.moderation_check',
          createdAt: { gte: sevenDaysAgo },
        },
      });

      // Get top violators with details
      const topViolatorIds = topViolators.map(v => v.userId).filter(Boolean);
      const topViolatorsDetails = await this.prismaService.users.findMany({
        where: { id: { in: topViolatorIds as string[] } },
        select: { id: true, email: true },
      });

      const topViolatorsWithDetails = topViolatorIds.map(userId => {
        const userDetail = topViolatorsDetails.find(u => u.id === userId);
        const violationCount = topViolators.find(v => v.userId === userId)?._count.userId || 0;
        
        return {
          userId: userId as string,
          email: userDetail?.email || 'Unknown',
          violationCount,
        };
      });

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        topActiveUsers,
        usersByActivity,
        contentModerationStats: {
          totalChecks: totalModerationChecks,
          violations: totalViolations,
          violationRate: totalModerationChecks > 0 ? (totalViolations / totalModerationChecks) * 100 : 0,
          topViolators: topViolatorsWithDetails,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get system activity overview:', error);
      throw error;
    }
  }

  async getUserActivityTimeline(userId: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await this.prismaService.audit_logs.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          action: true,
          createdAt: true,
          entityType: true,
          metadata: true,
          ipAddress: true,
        },
      });

      // Group activities by day
      const timeline = activities.reduce((acc, activity) => {
        const date = activity.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push({
          action: activity.action,
          time: activity.createdAt,
          entityType: activity.entityType,
          details: activity.metadata,
          ipAddress: activity.ipAddress,
        });
        return acc;
      }, {} as Record<string, any[]>);

      return timeline;
    } catch (error) {
      this.logger.error(`Failed to get user activity timeline for ${userId}:`, error);
      throw error;
    }
  }

  async getTopUsersByMetric(metric: 'logins' | 'payments' | 'headshots' | 'violations', limit = 10) {
    try {
      let query;

      switch (metric) {
        case 'logins':
          query = this.prismaService.audit_logs.groupBy({
            by: ['userId'],
            where: {
              action: { in: ['auth.login', 'auth.token_refresh'] },
              userId: { not: null },
            },
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: limit,
          });
          break;

        case 'payments':
          query = this.prismaService.payments.groupBy({
            by: ['userId'],
            _count: { userId: true },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: limit,
          });
          break;

        case 'headshots':
          query = this.prismaService.processing_jobs.groupBy({
            by: ['userId'],
            where: { type: 'HEADSHOT_GENERATION' },
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: limit,
          });
          break;

        case 'violations':
          query = this.prismaService.audit_logs.groupBy({
            by: ['userId'],
            where: {
              action: 'content.violation_detected',
              userId: { not: null },
            },
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: limit,
          });
          break;

        default:
          throw new Error(`Unknown metric: ${metric}`);
      }

      const results = await query;
      
      // Get user details
      const userIds = results.map((r: any) => r.userId).filter(Boolean);
      const users = await this.prismaService.users.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      return results.map((result: any) => {
        const user = users.find(u => u.id === result.userId);
        return {
          userId: result.userId,
          user: user || null,
          count: result._count?.userId || 0,
          sum: result._sum?.amount || 0,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get top users by ${metric}:`, error);
      throw error;
    }
  }

  private calculateUserRiskProfile(
    totalViolations: number,
    highRiskViolations: number,
    isActive: boolean,
  ): UserActivitySummary['riskProfile'] {
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let violationScore = 0;
    const accountFlags: string[] = [];

    // Calculate violation score
    violationScore = totalViolations * 10 + highRiskViolations * 25;

    // Determine risk level
    if (highRiskViolations >= 5 || totalViolations >= 20) {
      riskLevel = 'CRITICAL';
      accountFlags.push('MULTIPLE_HIGH_RISK_VIOLATIONS');
    } else if (highRiskViolations >= 3 || totalViolations >= 10) {
      riskLevel = 'HIGH';
      accountFlags.push('REPEATED_VIOLATIONS');
    } else if (highRiskViolations >= 1 || totalViolations >= 5) {
      riskLevel = 'MEDIUM';
      accountFlags.push('CONTENT_VIOLATIONS');
    }

    // Account status flags
    if (!isActive) {
      accountFlags.push('ACCOUNT_INACTIVE');
    }

    if (violationScore > 100) {
      accountFlags.push('HIGH_VIOLATION_SCORE');
    }

    return {
      riskLevel,
      violationScore,
      accountFlags,
    };
  }
} 