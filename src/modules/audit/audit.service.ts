import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditSource } from '@prisma/client';

export interface AuditLogData {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  source?: AuditSource;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      // Create audit log without foreign key relations to avoid constraint violations
      // The entityId field will still contain the ID for reference, but won't create FK constraints
      await this.prismaService.audit_logs.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldValues: data.oldValues,
          newValues: data.newValues,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          source: data.source || AuditSource.API,
        },
      });

      this.logger.debug(`Audit log created: ${data.action}`, {
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
      });
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  async getUserActivity(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prismaService.audit_logs.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          source: true,
          createdAt: true,
        },
      }),
      this.prismaService.audit_logs.count({
        where: { userId },
      }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSystemActivity(page = 1, limit = 100) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prismaService.audit_logs.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          users: {
            select: {
              
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prismaService.audit_logs.count(),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getActivityByAction(action: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prismaService.audit_logs.findMany({
        where: { action },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          users: {
            select: {
              
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prismaService.audit_logs.count({
        where: { action },
      }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getActivityStats(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [
      totalLogs,
      userActions,
      paymentActions,
      systemActions,
      topActions,
      topUsers,
    ] = await Promise.all([
      this.prismaService.audit_logs.count({ where: whereClause }),
      this.prismaService.audit_logs.count({
        where: { ...whereClause, action: { contains: 'user.' } },
      }),
      this.prismaService.audit_logs.count({
        where: { ...whereClause, action: { contains: 'payment.' } },
      }),
      this.prismaService.audit_logs.count({
        where: { ...whereClause, source: AuditSource.SYSTEM },
      }),
      this.prismaService.audit_logs.groupBy({
        by: ['action'],
        where: whereClause,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prismaService.audit_logs.groupBy({
        by: ['userId'],
        where: { ...whereClause, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      userActions,
      paymentActions,
      systemActions,
      topActions: topActions.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      topUsers: topUsers.map(item => ({
        userId: item.userId,
        count: item._count.userId,
      })),
    };
  }
} 