import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ContentModerationService } from './content-moderation.service';
import { UserAnalyticsService } from './user-analytics.service';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { PaymentsModule } from '../payments/payments.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [AuditModule, EmailModule, PaymentsModule, DatabaseModule],
  controllers: [AdminController],
  providers: [AdminService, ContentModerationService, UserAnalyticsService],
  exports: [AdminService, ContentModerationService, UserAnalyticsService],
})
export class AdminModule {} 