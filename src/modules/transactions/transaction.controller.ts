import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { TransactionService, CreateTransactionDto, UpdateTransactionDto, TransactionFilters } from './transaction.service';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { TransactionLogService } from './transaction-log.service';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly transactionLogService: TransactionLogService
  ) {}

  // ========================================
  // TRANSACTION CRUD OPERATIONS
  // ========================================

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto, @Request() req: any) {
    return this.transactionService.createTransaction(createTransactionDto, req.users.id);
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  async getTransaction(@Param('transactionId') transactionId: string) {
    return this.transactionService.getTransaction(transactionId);
  }

  @Put(':transactionId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully' })
  async updateTransaction(
    @Param('transactionId') transactionId: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @Request() req: any
  ) {
    return this.transactionService.updateTransaction(transactionId, updateTransactionDto, req.users.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get transactions with filters' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'paymentGateway', required: false, type: String })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'isHighRisk', required: false, type: Boolean })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'amountMin', required: false, type: Number })
  @ApiQuery({ name: 'amountMax', required: false, type: Number })
  async getTransactions(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
    @Query('paymentGateway') paymentGateway?: string,
    @Query('source') source?: string,
    @Query('country') country?: string,
    @Query('isHighRisk') isHighRisk?: boolean,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('amountMin') amountMin?: number,
    @Query('amountMax') amountMax?: number,
    @Query('currency') currency?: string,
    @Query('subscriptionId') subscriptionId?: string
  ) {
    const filters: TransactionFilters = {
      userId,
      type,
      status,
      paymentGateway,
      source,
      country,
      isHighRisk,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      amountMin,
      amountMax,
      currency,
      subscriptionId,
    };

    // Non-admin users can only see their own transactions
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.users.role)) {
      filters.userId = req.users.id;
    }

    return this.transactionService.getTransactions(filters, page, limit);
  }

  // ========================================
  // TRANSACTION EVENTS
  // ========================================

  @Get(':transactionId/events')
  @ApiOperation({ summary: 'Get transaction events' })
  @ApiResponse({ status: 200, description: 'Transaction events retrieved successfully' })
  async getTransactionEvents(@Param('transactionId') transactionId: string) {
    return this.transactionService.getTransactionEvents(transactionId);
  }

  // ========================================
  // USER TRANSACTIONS
  // ========================================

  @Get('user/my-transactions')
  @ApiOperation({ summary: 'Get current user transactions' })
  @ApiResponse({ status: 200, description: 'User transactions retrieved successfully' })
  async getMyTransactions(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus
  ) {
    const filters: TransactionFilters = {
      userId: req.users.id,
      type,
      status,
    };

    return this.transactionService.getTransactions(filters, page, limit);
  }

  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get transactions for specific user' })
  @ApiResponse({ status: 200, description: 'User transactions retrieved successfully' })
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus
  ) {
    const filters: TransactionFilters = {
      userId,
      type,
      status,
    };

    return this.transactionService.getTransactions(filters, page, limit);
  }

  // ========================================
  // ANALYTICS AND REPORTING
  // ========================================

  @Get('analytics/overview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get transaction analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getTransactionAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.transactionService.getTransactionAnalytics(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }

  @Get('analytics/summary')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get transaction summary statistics' })
  @ApiResponse({ status: 200, description: 'Summary statistics retrieved successfully' })
  async getTransactionSummary() {
    // Get various time period summaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [todayStats, yesterdayStats, weekStats, monthStats, yearStats] = await Promise.all([
      this.transactionService.getTransactionAnalytics(today),
      this.transactionService.getTransactionAnalytics(yesterday, today),
      this.transactionService.getTransactionAnalytics(weekStart),
      this.transactionService.getTransactionAnalytics(monthStart),
      this.transactionService.getTransactionAnalytics(yearStart),
    ]);

    return {
      today: todayStats.summary,
      yesterday: yesterdayStats.summary,
      thisWeek: weekStats.summary,
      thisMonth: monthStats.summary,
      thisYear: yearStats.summary,
    };
  }

  // ========================================
  // RISK AND FRAUD MANAGEMENT
  // ========================================

  @Get('risk/high-risk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get high-risk transactions' })
  @ApiResponse({ status: 200, description: 'High-risk transactions retrieved successfully' })
  async getHighRiskTransactions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    const filters: TransactionFilters = {
      isHighRisk: true,
    };

    return this.transactionService.getTransactions(filters, page, limit);
  }

  @Get('risk/under-review')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get transactions under review' })
  @ApiResponse({ status: 200, description: 'Transactions under review retrieved successfully' })
  async getTransactionsUnderReview(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    const filters: TransactionFilters = {
      status: TransactionStatus.UNDER_REVIEW,
    };

    return this.transactionService.getTransactions(filters, page, limit);
  }

  @Post(':transactionId/flag')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Flag transaction for review' })
  @ApiResponse({ status: 200, description: 'Transaction flagged successfully' })
  async flagTransaction(
    @Param('transactionId') transactionId: string,
    @Body() body: { reason: string },
    @Request() req: any
  ) {
    await this.transactionService.flagTransactionForReview(transactionId, body.reason, req.users.id);
    return { message: 'Transaction flagged for review successfully' };
  }

  // ========================================
  // REFUND OPERATIONS
  // ========================================

  @Post(':transactionId/refund')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create refund for transaction' })
  @ApiResponse({ status: 201, description: 'Refund created successfully' })
  async createRefund(
    @Param('transactionId') transactionId: string,
    @Body() body: { amount: number; reason: string },
    @Request() req: any
  ) {
    return this.transactionService.createRefund(
      transactionId,
      body.amount,
      body.reason,
      req.users.id
    );
  }

  // ========================================
  // BULK OPERATIONS
  // ========================================

  @Put('bulk/update')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Bulk update transactions' })
  @ApiResponse({ status: 200, description: 'Transactions updated successfully' })
  async bulkUpdateTransactions(
    @Body() body: { transactionIds: string[]; updateData: UpdateTransactionDto },
    @Request() req: any
  ) {
    return this.transactionService.bulkUpdateTransactions(
      body.transactionIds,
      body.updateData,
      req.users.id
    );
  }

  // ========================================
  // EXPORT OPERATIONS
  // ========================================

  @Get('export/csv')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Export transactions as CSV' })
  @ApiResponse({ status: 200, description: 'Transactions exported successfully' })
  async exportTransactionsCSV(
    @Query('userId') userId?: string,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    const filters: TransactionFilters = {
      userId,
      type,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    return this.transactionService.exportTransactions(filters, 'CSV');
  }

  @Get('export/json')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Export transactions as JSON' })
  @ApiResponse({ status: 200, description: 'Transactions exported successfully' })
  async exportTransactionsJSON(
    @Query('userId') userId?: string,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    const filters: TransactionFilters = {
      userId,
      type,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    return this.transactionService.exportTransactions(filters, 'JSON');
  }

  // ========================================
  // GATEWAY-SPECIFIC OPERATIONS
  // ========================================

  @Get('gateway/:gateway/stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get gateway-specific statistics' })
  @ApiResponse({ status: 200, description: 'Gateway statistics retrieved successfully' })
  async getGatewayStats(@Param('gateway') gateway: string) {
    const filters: TransactionFilters = {
      paymentGateway: gateway.toUpperCase(),
    };

    return this.transactionService.getTransactionAnalytics();
  }

  // ========================================
  // SUBSCRIPTION TRANSACTIONS
  // ========================================

  @Get('subscription/:subscriptionId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get transactions for specific subscription' })
  @ApiResponse({ status: 200, description: 'Subscription transactions retrieved successfully' })
  async getSubscriptionTransactions(
    @Param('subscriptionId') subscriptionId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    const filters: TransactionFilters = {
      subscriptionId,
    };

    return this.transactionService.getTransactions(filters, page, limit);
  }

  @Post('log-action')
  async logUserAction(
    @Body() actionData: {
      action: string;
      details?: any;
      userAgent?: string;
    },
    @Request() req: any,
    @Ip() ipAddress: string
  ) {
    try {
      await this.transactionLogService.logTransaction(req.users.id, {
        action: actionData.action,
        details: actionData.details,
        userAgent: actionData.userAgent || req.get('User-Agent'),
        ipAddress: ipAddress || req.ip || req.connection.remoteAddress
      });

      return { 
        success: true, 
        message: 'Action logged successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to log action',
        error: error.message 
      };
    }
  }
} 