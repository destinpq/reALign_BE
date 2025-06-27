import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MagicHourController } from './magic-hour.controller';
import { MagicHourService } from './magic-hour.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, HttpModule],
  controllers: [MagicHourController],
  providers: [MagicHourService],
  exports: [MagicHourService],
})
export class MagicHourModule {} 