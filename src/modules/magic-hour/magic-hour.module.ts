import { Module } from '@nestjs/common';
import { MagicHourController } from './magic-hour.controller';
import { MagicHourService } from './magic-hour.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MagicHourController],
  providers: [MagicHourService],
  exports: [MagicHourService],
})
export class MagicHourModule {} 