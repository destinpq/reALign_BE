import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { TransactionLogService } from './transaction-log.service';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [AuditModule, EmailModule, DatabaseModule],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionLogService],
  exports: [TransactionService, TransactionLogService],
})
export class TransactionModule {} 