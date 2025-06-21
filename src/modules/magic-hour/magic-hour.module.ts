import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MagicHourService } from './magic-hour.service';
import { MagicHourController } from './magic-hour.controller';
import { PhotosModule } from '../photos/photos.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    HttpModule, 
    PhotosModule, 
    PaymentsModule, 
    AuditModule, 
    EmailModule,
    AdminModule,
  ],
  controllers: [MagicHourController],
  providers: [MagicHourService],
  exports: [MagicHourService],
})
export class MagicHourModule {} 