import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { TransactionType, TransactionStatus, TransactionEventType } from '@prisma/client';

export interface CreateTransactionDto {
  transactionId: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  paymentGateway?: string;
  gatewayOrderId?: string;
  description?: string;
  metadata?: any;
  source?: string;
  channel?: string;
  campaign?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  state?: string;
  city?: string;
  creditsAwarded?: number;
  creditsUsed?: number;
  subscriptionId?: string;
}

export interface UpdateTransactionDto {
  status?: TransactionStatus;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  gatewayResponse?: any;
  processedAt?: Date;
  authorizedAt?: Date;
  capturedAt?: Date;
  settledAt?: Date;
  failureReason?: string;
  errorCode?: string;
  riskScore?: number;
  fraudFlags?: string[];
  isHighRisk?: boolean;
  reviewStatus?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  completedAt?: Date;
}

export interface TransactionFilters {
  userId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  paymentGateway?: string;
  source?: string;
  country?: string;
  isHighRisk?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  currency?: string;
  subscriptionId?: string;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  // ========================================
  // TRANSACTION CRUD OPERATIONS
  // ========================================

  async createTransaction(data: CreateTransactionDto, triggeredBy?: string): Promise<any> {
    try {
      this.logger.log(`Creating transaction: ${data.transactionId} for user: ${data.userId}`);

      // Check if transaction already exists
      const existing = await this.prisma.transaction.findUnique({
        where: { transactionId: data.transactionId }
      });

      if (existing) {
        throw new BadRequestException('Transaction already exists');
      }

      // Get user's current credit balance if userId provided
      let creditBalance = null;
      if (data.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: data.userId },
          select: { credits: true }
        });
        creditBalance = user?.credits || 0;
      }

      // Calculate fees and net amount
      const platformFee = this.calculatePlatformFee(data.amount, data.type);
      const gatewayFee = this.calculateGatewayFee(data.amount, data.paymentGateway);
      const taxes = this.calculateTaxes(data.amount);
      const netAmount = data.amount - platformFee - gatewayFee - taxes;

      // Create transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          ...data,
          creditBalance,
          platformFee,
          gatewayFee,
          taxes,
          netAmount,
          initiatedAt: new Date(),
        }
      });

      // Create initial event
      await this.createTransactionEvent(transaction.id, TransactionEventType.INITIATED, {
        message: 'Transaction initiated',
        triggeredBy,
        data: { amount: data.amount, type: data.type }
      });

      // Audit log
      await this.auditService.log({
        userId: data.userId,
        action: 'transaction.created',
        entityType: 'Transaction',
        entityId: transaction.id,
        newValues: transaction,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });

      this.logger.log(`Transaction created successfully: ${transaction.id}`);
      return transaction;

    } catch (error) {
      this.logger.error(`Failed to create transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateTransaction(transactionId: string, data: UpdateTransactionDto, triggeredBy?: string): Promise<any> {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { transactionId }
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const oldValues = { ...transaction };
      
      const updatedTransaction = await this.prisma.transaction.update({
        where: { transactionId },
        data: {
          ...data,
          updatedAt: new Date(),
        }
      });

      // Create event for status change
      if (data.status && data.status !== transaction.status) {
        await this.createTransactionEvent(transaction.id, TransactionEventType.STATUS_UPDATED, {
          message: `Status changed from ${transaction.status} to ${data.status}`,
          triggeredBy,
          data: { oldStatus: transaction.status, newStatus: data.status }
        });

        // Handle specific status changes
        await this.handleStatusChange(updatedTransaction, data.status, triggeredBy);
      }

      // Audit log
      await this.auditService.log({
        userId: transaction.userId,
        action: 'transaction.updated',
        entityType: 'Transaction',
        entityId: transaction.id,
        oldValues,
        newValues: updatedTransaction,
      });

      return updatedTransaction;

    } catch (error) {
      this.logger.error(`Failed to update transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTransaction(transactionId: string): Promise<any> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        parentTransaction: true,
        childTransactions: true,
      }
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getTransactions(filters: TransactionFilters = {}, page = 1, limit = 50): Promise<any> {
    const skip = (page - 1) * limit;
    
    const where: any = {};

    // Apply filters
    if (filters.userId) where.userId = filters.userId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.paymentGateway) where.paymentGateway = filters.paymentGateway;
    if (filters.source) where.source = filters.source;
    if (filters.country) where.country = filters.country;
    if (filters.isHighRisk !== undefined) where.isHighRisk = filters.isHighRisk;
    if (filters.currency) where.currency = filters.currency;
    if (filters.subscriptionId) where.subscriptionId = filters.subscriptionId;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    if (filters.amountMin || filters.amountMax) {
      where.amount = {};
      if (filters.amountMin) where.amount.gte = filters.amountMin;
      if (filters.amountMax) where.amount.lte = filters.amountMax;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      }),
      this.prisma.transaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  // ========================================
  // TRANSACTION EVENT TRACKING
  // ========================================

  async createTransactionEvent(
    transactionId: string, 
    eventType: TransactionEventType, 
    eventData: {
      status?: string;
      message?: string;
      data?: any;
      source?: string;
      triggeredBy?: string;
      ipAddress?: string;
      userAgent?: string;
      duration?: number;
    }
  ): Promise<any> {
    return this.prisma.transactionEvent.create({
      data: {
        transactionId,
        eventType,
        status: eventData.status || 'SUCCESS',
        message: eventData.message,
        data: eventData.data,
        source: eventData.source || 'SYSTEM',
        triggeredBy: eventData.triggeredBy,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        duration: eventData.duration,
      }
    });
  }

  async getTransactionEvents(transactionId: string): Promise<any> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId }
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return this.prisma.transactionEvent.findMany({
      where: { transactionId: transaction.id },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ========================================
  // TRANSACTION STATUS HANDLING
  // ========================================

  private async handleStatusChange(transaction: any, newStatus: TransactionStatus, triggeredBy?: string): Promise<void> {
    try {
      switch (newStatus) {
        case TransactionStatus.COMPLETED:
          await this.handleTransactionCompleted(transaction, triggeredBy);
          break;
        case TransactionStatus.FAILED:
          await this.handleTransactionFailed(transaction, triggeredBy);
          break;
        case TransactionStatus.REFUNDED:
          await this.handleTransactionRefunded(transaction, triggeredBy);
          break;
        case TransactionStatus.DISPUTED:
          await this.handleTransactionDisputed(transaction, triggeredBy);
          break;
        case TransactionStatus.UNDER_REVIEW:
          await this.handleTransactionUnderReview(transaction, triggeredBy);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to handle status change: ${error.message}`, error.stack);
    }
  }

  private async handleTransactionCompleted(transaction: any, triggeredBy?: string): Promise<void> {
    // Update user credits if applicable
    if (transaction.creditsAwarded && transaction.creditsAwarded > 0 && transaction.userId) {
      await this.prisma.user.update({
        where: { id: transaction.userId },
        data: {
          credits: {
            increment: transaction.creditsAwarded
          }
        }
      });

      await this.createTransactionEvent(transaction.id, TransactionEventType.STATUS_UPDATED, {
        message: `${transaction.creditsAwarded} credits awarded to user`,
        triggeredBy,
        data: { creditsAwarded: transaction.creditsAwarded }
      });
    }

    // Send completion email
    if (transaction.userId) {
      // await this.emailService.sendTransactionCompletedEmail(transaction.userId, transaction);
    }

    // Update analytics
    await this.updateTransactionAnalytics(transaction);
  }

  private async handleTransactionFailed(transaction: any, triggeredBy?: string): Promise<void> {
    // Send failure email
    if (transaction.userId) {
      // await this.emailService.sendTransactionFailedEmail(transaction.userId, transaction);
    }

    // Create failure event
    await this.createTransactionEvent(transaction.id, TransactionEventType.FAILED, {
      message: `Transaction failed: ${transaction.failureReason || 'Unknown reason'}`,
      triggeredBy,
      data: { failureReason: transaction.failureReason, errorCode: transaction.errorCode }
    });
  }

  private async handleTransactionRefunded(transaction: any, triggeredBy?: string): Promise<void> {
    // Deduct credits if they were awarded
    if (transaction.creditsAwarded && transaction.creditsAwarded > 0 && transaction.userId) {
      await this.prisma.user.update({
        where: { id: transaction.userId },
        data: {
          credits: {
            decrement: transaction.creditsAwarded
          }
        }
      });
    }

    // Send refund email
    if (transaction.userId) {
      // await this.emailService.sendTransactionRefundedEmail(transaction.userId, transaction);
    }
  }

  private async handleTransactionDisputed(transaction: any, triggeredBy?: string): Promise<void> {
    // Notify admin about dispute
    // await this.emailService.sendAdminDisputeNotification(transaction);

    // Create dispute event
    await this.createTransactionEvent(transaction.id, TransactionEventType.DISPUTE_CREATED, {
      message: 'Transaction disputed',
      triggeredBy,
      data: { disputeReason: transaction.disputeReason }
    });
  }

  private async handleTransactionUnderReview(transaction: any, triggeredBy?: string): Promise<void> {
    // Notify admin about review requirement
    // await this.emailService.sendAdminReviewNotification(transaction);

    // Create review event
    await this.createTransactionEvent(transaction.id, TransactionEventType.ADMIN_REVIEW_STARTED, {
      message: 'Transaction flagged for review',
      triggeredBy,
      data: { riskScore: transaction.riskScore, fraudFlags: transaction.fraudFlags }
    });
  }

  // ========================================
  // FEE CALCULATIONS
  // ========================================

  private calculatePlatformFee(amount: number, type: TransactionType): number {
    // Platform fee calculation logic
    const feePercentage = 0.02; // 2% platform fee
    return Math.round(amount * feePercentage * 100) / 100;
  }

  private calculateGatewayFee(amount: number, gateway?: string): number {
    // Gateway fee calculation logic
    if (!gateway) return 0;
    
    switch (gateway.toUpperCase()) {
      case 'RAZORPAY':
        return Math.round(amount * 0.023 * 100) / 100; // 2.3% + GST
      case 'STRIPE':
        return Math.round(amount * 0.029 * 100) / 100; // 2.9% + 30 cents
      default:
        return 0;
    }
  }

  private calculateTaxes(amount: number): number {
    // Tax calculation logic (GST in India)
    const gstPercentage = 0.18; // 18% GST
    return Math.round(amount * gstPercentage * 100) / 100;
  }

  // ========================================
  // ANALYTICS AND REPORTING
  // ========================================

  async getTransactionAnalytics(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      totalAmount,
      successfulAmount,
      refundedAmount,
      averageTransactionValue,
      topCountries,
      topGateways,
      recentTransactions
    ] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.count({ where: { ...where, status: TransactionStatus.COMPLETED } }),
      this.prisma.transaction.count({ where: { ...where, status: TransactionStatus.FAILED } }),
      this.prisma.transaction.aggregate({ where, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ 
        where: { ...where, status: TransactionStatus.COMPLETED }, 
        _sum: { amount: true } 
      }),
      this.prisma.transaction.aggregate({ 
        where: { ...where, status: TransactionStatus.REFUNDED }, 
        _sum: { refundAmount: true } 
      }),
      this.prisma.transaction.aggregate({ where, _avg: { amount: true } }),
      this.getTopCountries(where),
      this.getTopGateways(where),
      this.prisma.transaction.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true }
          }
        }
      })
    ]);

    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    const failureRate = totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0;

    return {
      summary: {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        totalAmount: totalAmount._sum.amount || 0,
        successfulAmount: successfulAmount._sum.amount || 0,
        refundedAmount: refundedAmount._sum.refundAmount || 0,
        averageTransactionValue: averageTransactionValue._avg.amount || 0,
      },
      breakdown: {
        topCountries,
        topGateways,
      },
      recentTransactions,
    };
  }

  private async getTopCountries(where: any): Promise<any> {
    return this.prisma.transaction.groupBy({
      by: ['country'],
      where: { ...where, country: { not: null } },
      _count: { country: true },
      _sum: { amount: true },
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    });
  }

  private async getTopGateways(where: any): Promise<any> {
    return this.prisma.transaction.groupBy({
      by: ['paymentGateway'],
      where: { ...where, paymentGateway: { not: null } },
      _count: { paymentGateway: true },
      _sum: { amount: true },
      orderBy: { _count: { paymentGateway: 'desc' } },
      take: 10,
    });
  }

  async updateTransactionAnalytics(transaction: any): Promise<void> {
    const date = new Date(transaction.createdAt);
    date.setHours(0, 0, 0, 0);

    // Update daily analytics
    await this.prisma.transactionAnalytics.upsert({
      where: { date },
      update: {
        totalTransactions: { increment: 1 },
        totalAmount: { increment: transaction.amount },
        // Add more specific updates based on transaction type and status
      },
      create: {
        date,
        totalTransactions: 1,
        totalAmount: transaction.amount,
        // Initialize other fields
      }
    });
  }

  // ========================================
  // RISK AND FRAUD DETECTION
  // ========================================

  async assessTransactionRisk(transaction: any): Promise<number> {
    let riskScore = 0;

    // Amount-based risk
    if (transaction.amount > 10000) riskScore += 20;
    if (transaction.amount > 50000) riskScore += 30;

    // Geographic risk
    if (transaction.country && ['CN', 'RU', 'NG'].includes(transaction.country)) {
      riskScore += 25;
    }

    // User history risk
    if (transaction.userId) {
      const userTransactionCount = await this.prisma.transaction.count({
        where: { userId: transaction.userId }
      });
      
      if (userTransactionCount === 0) riskScore += 15; // New user
    }

    // Time-based risk (transactions at odd hours)
    const hour = new Date(transaction.createdAt).getHours();
    if (hour < 6 || hour > 22) riskScore += 10;

    return Math.min(riskScore, 100);
  }

  async flagTransactionForReview(transactionId: string, reason: string, flaggedBy: string): Promise<void> {
    await this.updateTransaction(transactionId, {
      status: TransactionStatus.UNDER_REVIEW,
      reviewStatus: 'PENDING',
      reviewNotes: reason,
    }, flaggedBy);
  }

  // ========================================
  // REFUND OPERATIONS
  // ========================================

  async createRefund(
    parentTransactionId: string, 
    refundAmount: number, 
    reason: string, 
    refundedBy: string
  ): Promise<any> {
    const parentTransaction = await this.prisma.transaction.findUnique({
      where: { transactionId: parentTransactionId }
    });

    if (!parentTransaction) {
      throw new NotFoundException('Parent transaction not found');
    }

    if (!parentTransaction.isRefundable) {
      throw new BadRequestException('Transaction is not refundable');
    }

    // Create refund transaction
    const refundTransaction = await this.createTransaction({
      transactionId: `REF_${parentTransactionId}_${Date.now()}`,
      type: TransactionType.REFUND,
      amount: refundAmount,
      currency: parentTransaction.currency,
      userId: parentTransaction.userId,
      entityType: 'Transaction',
      entityId: parentTransaction.id,
      paymentGateway: parentTransaction.paymentGateway,
      description: `Refund for transaction ${parentTransactionId}`,
      source: 'ADMIN',
    }, refundedBy);

    // Update parent transaction
    await this.prisma.transaction.update({
      where: { id: parentTransaction.id },
      data: {
        refundAmount: { increment: refundAmount },
        refundedAt: new Date(),
        refundedBy,
        status: refundAmount >= parentTransaction.amount 
          ? TransactionStatus.REFUNDED 
          : TransactionStatus.PARTIALLY_REFUNDED,
      }
    });

    return refundTransaction;
  }

  // ========================================
  // BULK OPERATIONS
  // ========================================

  async bulkUpdateTransactions(
    transactionIds: string[], 
    updateData: Partial<UpdateTransactionDto>,
    updatedBy: string
  ): Promise<any> {
    const results = [];

    for (const transactionId of transactionIds) {
      try {
        const result = await this.updateTransaction(transactionId, updateData, updatedBy);
        results.push({ transactionId, success: true, result });
      } catch (error) {
        results.push({ transactionId, success: false, error: error.message });
      }
    }

    return results;
  }

  async exportTransactions(filters: TransactionFilters, format: 'CSV' | 'JSON' = 'CSV'): Promise<any> {
    const { transactions } = await this.getTransactions(filters, 1, 10000); // Get all matching transactions

    if (format === 'JSON') {
      return transactions;
    }

    // Convert to CSV format
    const csvHeaders = [
      'Transaction ID', 'Type', 'Status', 'Amount', 'Currency', 'User Email',
      'Gateway', 'Created At', 'Completed At', 'Failure Reason'
    ];

    const csvRows = transactions.map(t => [
      t.transactionId,
      t.type,
      t.status,
      t.amount,
      t.currency,
      t.user?.email || '',
      t.paymentGateway || '',
      t.createdAt,
      t.completedAt || '',
      t.failureReason || ''
    ]);

    return {
      headers: csvHeaders,
      rows: csvRows
    };
  }
} 