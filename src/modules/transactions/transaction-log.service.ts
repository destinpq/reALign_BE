import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface TransactionLogData {
  action: string;
  details?: any;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class TransactionLogService {
  private readonly logger = new Logger(TransactionLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  private parseNotes(notes: any): any {
    try {
      if (typeof notes === 'string') {
        return JSON.parse(notes);
      }
      return notes;
    } catch (error) {
      return notes;
    }
  }

  async logTransaction(
    userId: string,
    data: TransactionLogData
  ): Promise<void> {
    try {
      // Create a transaction entry for logging
      await this.prisma.transactions.create({
        data: {
          transactionId: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'AVATAR_CUSTOMIZATION', // Using existing enum value
          status: 'COMPLETED',
          amount: 0,
          currency: 'INR',
          userId,
          description: data.action,
          notes: data.details ? JSON.stringify(data.details) : null,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          source: 'WEB',
          initiatedAt: new Date(),
          completedAt: new Date()
        }
      });

      this.logger.log(`Transaction logged: ${data.action} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to log transaction: ${error.message}`);
      // Don't throw error - logging failures shouldn't break the main flow
    }
  }

  async getUserTransactions(
    userId: string,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transactions.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.transactions.count({
        where: { userId }
      })
    ]);

    return {
      transactions: transactions.map(tx => ({
        ...tx,
        details: this.parseNotes(tx.notes)
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getTransactionsByAction(
    action: string,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transactions.findMany({
        where: { description: action },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          users: {
            select: {
              
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      this.prisma.transactions.count({
        where: { description: action }
      })
    ]);

    return {
      transactions: transactions.map(tx => ({
        ...tx,
        details: this.parseNotes(tx.notes)
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getTransactionStats(
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalTransactions,
      actionCounts,
      recentTransactions
    ] = await Promise.all([
      this.prisma.transactions.count({ where }),
      this.prisma.transactions.groupBy({
        by: ['description'],
        where,
        _count: {
          description: true
        },
        orderBy: {
          _count: {
            description: 'desc'
          }
        }
      }),
      this.prisma.transactions.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          users: {
            select: {
              
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
    ]);

    return {
      totalTransactions,
      actionCounts: actionCounts.map(ac => ({
        action: ac.description,
        count: ac._count.description
      })),
      recentTransactions: recentTransactions.map(tx => ({
        ...tx,
        details: this.parseNotes(tx.notes)
      }))
    };
  }
} 