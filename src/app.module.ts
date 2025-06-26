import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WearablesModule } from './modules/wearables/wearables.module';
import { PhotosModule } from './modules/photos/photos.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MagicHourModule } from './modules/magic-hour/magic-hour.module'; // Re-enabled for avatar generation
import { CustomizationsModule } from './modules/customizations/customizations.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebhookModule } from './modules/webhooks/webhook.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';
import { TransactionModule } from './modules/transactions/transaction.module';
import { HealthModule } from './common/health/health.module';
import { AuthLogoutInterceptor } from './guards/auth-logout.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100
      }
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    WearablesModule,
    PhotosModule,
    PaymentsModule,
    MagicHourModule, // Re-enabled for avatar generation
    CustomizationsModule,
    AdminModule,
    WebhookModule,
    AuditModule,
    EmailModule,
    TransactionModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthLogoutInterceptor,
    },
  ],
})
export class AppModule {} 