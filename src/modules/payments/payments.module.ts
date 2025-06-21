import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { WebhookModule } from '../webhooks/webhook.module';

@Module({
  imports: [AuditModule, EmailModule, WebhookModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {} 