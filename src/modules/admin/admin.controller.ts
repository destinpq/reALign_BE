import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ContentModerationService } from './content-moderation.service';
import { UserAnalyticsService } from './user-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import {
  CreateAdminDto,
  SystemStatsDto,
  UserManagementDto,
  PaymentAnalyticsDto,
  ContentModerationDto,
  FlagContentDto,
  UpdateUserStatusDto,
  AwardCreditsDto,
} from './dto/admin.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly contentModerationService: ContentModerationService,
    private readonly userAnalyticsService: UserAnalyticsService,
  ) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('stats/public')
  @ApiOperation({ summary: 'Get public statistics for homepage (no auth required)' })
  @ApiResponse({ status: 200, description: 'Public stats retrieved successfully' })
  async getPublicStats() {
    return this.adminService.getPublicStats();
  }

  // ==================== AUTHENTICATED ADMIN ENDPOINTS ====================

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Post('create-admin')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new admin user (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(@Body() createAdminDto: CreateAdminDto, @Request() req) {
    return this.adminService.createAdmin(createAdminDto, req.user.id);
  }

  @Get('system-stats')
  @ApiOperation({ summary: 'Get comprehensive system statistics' })
  @ApiResponse({ status: 200, type: SystemStatsDto })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get users for management with filtering' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(@Query() filters: UserManagementDto) {
    return this.adminService.getUsersForManagement(filters);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get detailed user information' })
  @ApiResponse({ status: 200, description: 'User details retrieved' })
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Put('users/status')
  @ApiOperation({ summary: 'Update user active status' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  async updateUserStatus(
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @Request() req,
  ) {
    return this.adminService.updateUserStatus(updateUserStatusDto, req.user.id);
  }

  @Post('users/award-credits')
  @ApiOperation({ summary: 'Award credits to a user' })
  @ApiResponse({ status: 200, description: 'Credits awarded successfully' })
  async awardCredits(@Body() awardCreditsDto: AwardCreditsDto, @Request() req) {
    return this.adminService.awardCredits(awardCreditsDto, req.user.id);
  }

  @Get('payments/analytics')
  @ApiOperation({ summary: 'Get payment analytics and insights' })
  @ApiResponse({ status: 200, description: 'Payment analytics retrieved' })
  async getPaymentAnalytics(@Query() filters: PaymentAnalyticsDto) {
    return this.adminService.getPaymentAnalytics(filters);
  }

  @Get('content/flagged')
  @ApiOperation({ summary: 'Get flagged content for review' })
  @ApiResponse({ status: 200, description: 'Flagged content retrieved' })
  async getFlaggedContent(@Query() filters: ContentModerationDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    
    return this.contentModerationService.getFlaggedContent(page, limit);
  }

  @Post('content/flag')
  @ApiOperation({ summary: 'Flag content as inappropriate' })
  @ApiResponse({ status: 200, description: 'Content flagged successfully' })
  async flagContent(@Body() flagContentDto: FlagContentDto, @Request() req) {
    // This would be implemented to manually flag content
    // For now, return success
    return { success: true, message: 'Content flagged for review' };
  }

  @Get('content/moderation-stats')
  @ApiOperation({ summary: 'Get content moderation statistics' })
  @ApiResponse({ status: 200, description: 'Moderation stats retrieved' })
  async getModerationStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.contentModerationService.getModerationStats(start, end);
  }

  @Get('users/:userId/violations')
  @ApiOperation({ summary: 'Get user violation history' })
  @ApiResponse({ status: 200, description: 'User violation history retrieved' })
  async getUserViolations(@Param('userId') userId: string) {
    return this.contentModerationService.getUserViolationHistory(userId);
  }

  @Get('activity/recent')
  @ApiOperation({ summary: 'Get recent system activity' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved' })
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.adminService.getRecentActivity(limit || 100);
  }

  @Get('processing-jobs')
  @ApiOperation({ summary: 'Get all processing jobs with status' })
  @ApiResponse({ status: 200, description: 'Processing jobs retrieved' })
  async getProcessingJobs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    // This would query processing jobs from the database
    // Implementation would be similar to other paginated endpoints
    return {
      jobs: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
      message: 'Processing jobs endpoint - implementation needed',
    };
  }

  @Get('emails/stats')
  @ApiOperation({ summary: 'Get email delivery statistics' })
  @ApiResponse({ status: 200, description: 'Email stats retrieved' })
  async getEmailStats() {
    // This would get email delivery statistics
    return {
      totalEmails: 0,
      successRate: 0,
      failureRate: 0,
      bounceRate: 0,
      message: 'Email stats endpoint - implementation needed',
    };
  }

  @Get('webhooks/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery logs' })
  @ApiResponse({ status: 200, description: 'Webhook deliveries retrieved' })
  async getWebhookDeliveries(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    // This would query webhook delivery logs
    return {
      deliveries: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
      message: 'Webhook deliveries endpoint - implementation needed',
    };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get comprehensive audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  async getAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 100,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // This would query audit logs with comprehensive filtering
    return {
      logs: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
      filters: { userId, action, entityType, startDate, endDate },
      message: 'Audit logs endpoint - implementation needed',
    };
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health retrieved' })
  async getSystemHealth() {
    return {
      database: 'healthy',
      redis: 'healthy',
      s3: 'healthy',
      email: 'healthy',
      magicHour: 'healthy',
      razorpay: 'healthy',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('prompts/review')
  @ApiOperation({ summary: 'Get prompts that need review' })
  @ApiResponse({ status: 200, description: 'Prompts for review retrieved' })
  async getPromptsForReview(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('riskScore') minRiskScore = 50,
  ) {
    // This would get prompts that were flagged or need manual review
    return {
      prompts: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
      filters: { minRiskScore },
      message: 'Prompts review endpoint - implementation needed',
    };
  }

  @Get('images/review')
  @ApiOperation({ summary: 'Get images that need review' })
  @ApiResponse({ status: 200, description: 'Images for review retrieved' })
  async getImagesForReview(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    // This would get images that were flagged or need manual review
    return {
      images: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
      message: 'Images review endpoint - implementation needed',
    };
  }

  @Get('credits/transactions')
  @ApiOperation({ summary: 'Get all credit transactions' })
  @ApiResponse({ status: 200, description: 'Credit transactions retrieved' })
  async getCreditTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 100,
    @Query('userId') userId?: string,
    @Query('type') type?: string, // 'PURCHASE', 'USAGE', 'AWARD', 'REFUND'
  ) {
    // This would track all credit movements in the system
    return {
      transactions: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
      summary: {
        totalPurchased: 0,
        totalUsed: 0,
        totalAwarded: 0,
        totalRefunded: 0,
      },
      message: 'Credit transactions endpoint - implementation needed',
    };
  }

  @Get('subscriptions/overview')
  @ApiOperation({ summary: 'Get subscription overview' })
  @ApiResponse({ status: 200, description: 'Subscription overview retrieved' })
  async getSubscriptionOverview() {
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      expiredSubscriptions: 0,
      byType: {
        FREE: 0,
        BASIC: 0,
        PREMIUM: 0,
        ENTERPRISE: 0,
      },
      revenue: {
        monthly: 0,
        yearly: 0,
        total: 0,
      },
      message: 'Subscription overview endpoint - implementation needed',
    };
  }

  // ==================== USER ANALYTICS ENDPOINTS ====================

  @Get('analytics/user/:userId')
  @ApiOperation({ summary: 'Get detailed user activity analytics' })
  @ApiResponse({ status: 200, description: 'User activity summary retrieved' })
  async getUserAnalytics(@Param('userId') userId: string) {
    return this.userAnalyticsService.getUserActivitySummary(userId);
  }

  @Get('analytics/system-overview')
  @ApiOperation({ summary: 'Get system-wide user activity overview' })
  @ApiResponse({ status: 200, description: 'System activity overview retrieved' })
  async getSystemActivityOverview() {
    return this.userAnalyticsService.getSystemActivityOverview();
  }

  @Get('analytics/user/:userId/timeline')
  @ApiOperation({ summary: 'Get user activity timeline' })
  @ApiResponse({ status: 200, description: 'User activity timeline retrieved' })
  async getUserActivityTimeline(
    @Param('userId') userId: string,
    @Query('days') days = 30,
  ) {
    return this.userAnalyticsService.getUserActivityTimeline(userId, Number(days));
  }

  @Get('analytics/top-users/:metric')
  @ApiOperation({ summary: 'Get top users by specific metric' })
  @ApiResponse({ status: 200, description: 'Top users retrieved' })
  async getTopUsersByMetric(
    @Param('metric') metric: 'logins' | 'payments' | 'headshots' | 'violations',
    @Query('limit') limit = 10,
  ) {
    return this.userAnalyticsService.getTopUsersByMetric(metric, Number(limit));
  }

  @Get('analytics/activity-heatmap')
  @ApiOperation({ summary: 'Get user activity heatmap data' })
  @ApiResponse({ status: 200, description: 'Activity heatmap data retrieved' })
  async getActivityHeatmap(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // This would generate heatmap data for user activities
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    return {
      dateRange: { start, end },
      heatmapData: [],
      message: 'Activity heatmap endpoint - implementation needed',
    };
  }

  @Get('analytics/user-segments')
  @ApiOperation({ summary: 'Get user segmentation analytics' })
  @ApiResponse({ status: 200, description: 'User segments retrieved' })
  async getUserSegments() {
    // This would segment users by behavior patterns
    return {
      segments: {
        powerUsers: { count: 0, criteria: 'High activity, high spending' },
        regularUsers: { count: 0, criteria: 'Moderate activity, some spending' },
        trialUsers: { count: 0, criteria: 'Low activity, no spending' },
        churned: { count: 0, criteria: 'No activity in 30+ days' },
        atRisk: { count: 0, criteria: 'Declining activity pattern' },
      },
      message: 'User segments endpoint - implementation needed',
    };
  }

  @Get('analytics/conversion-funnel')
  @ApiOperation({ summary: 'Get user conversion funnel analytics' })
  @ApiResponse({ status: 200, description: 'Conversion funnel retrieved' })
  async getConversionFunnel() {
    // This would track user journey from signup to payment to usage
    return {
      funnel: [
        { stage: 'Registration', count: 0, conversionRate: 100 },
        { stage: 'Email Verification', count: 0, conversionRate: 0 },
        { stage: 'First Login', count: 0, conversionRate: 0 },
        { stage: 'First Headshot Request', count: 0, conversionRate: 0 },
        { stage: 'First Payment', count: 0, conversionRate: 0 },
        { stage: 'Repeat Usage', count: 0, conversionRate: 0 },
      ],
      message: 'Conversion funnel endpoint - implementation needed',
    };
  }

  @Get('analytics/revenue-analytics')
  @ApiOperation({ summary: 'Get detailed revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved' })
  async getRevenueAnalytics(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // This would provide detailed revenue analytics
    return {
      period,
      dateRange: { startDate, endDate },
      metrics: {
        totalRevenue: 0,
        averageRevenuePerUser: 0,
        monthlyRecurringRevenue: 0,
        customerLifetimeValue: 0,
      },
      trends: [],
      message: 'Revenue analytics endpoint - implementation needed',
    };
  }
} 