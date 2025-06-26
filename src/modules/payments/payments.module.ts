import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { 
  PaymentsService,
  PaymentOrderService,
  PaymentVerificationService,
  AvatarGenerationDataService,
  SubscriptionService
} from './services';
import { PrismaService } from '../../database/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { WebhookModule } from '../webhooks/webhook.module';

@Module({
  imports: [AuditModule, EmailModule, WebhookModule],
  controllers: [PaymentsController],
  providers: [
    PrismaService,
    PaymentsService,
    PaymentOrderService,
    PaymentVerificationService,
    AvatarGenerationDataService,
    SubscriptionService,
  ],
  exports: [
    PaymentsService,
    PaymentOrderService,
    PaymentVerificationService,
    AvatarGenerationDataService,
    SubscriptionService,
  ],
})
export class PaymentsModule {} 