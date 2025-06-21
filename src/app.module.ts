import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WearablesModule } from './modules/wearables/wearables.module';
import { PhotosModule } from './modules/photos/photos.module';
import { CustomizationsModule } from './modules/customizations/customizations.module';
import { MagicHourModule } from './modules/magic-hour/magic-hour.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';
import { AdminModule } from './modules/admin/admin.module';
import { TransactionModule } from './modules/transactions/transaction.module';
import { WebhookModule } from './modules/webhooks/webhook.module';
import { HealthModule } from './common/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    WearablesModule,
    PhotosModule,
    CustomizationsModule,
    MagicHourModule,
    PaymentsModule,
    AuditModule,
    EmailModule,
    AdminModule,
    TransactionModule,
    WebhookModule,
    HealthModule,
  ],
})
export class AppModule {} 