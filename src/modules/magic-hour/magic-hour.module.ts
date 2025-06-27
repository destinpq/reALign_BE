import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MagicHourController } from './magic-hour.controller';
import { MagicHourService } from './magic-hour.service';
import { DatabaseModule } from '../../database/database.module';
import { S3UploadModule } from '../s3-upload/s3-upload.module';

@Module({
  imports: [DatabaseModule, HttpModule, S3UploadModule],
  controllers: [MagicHourController],
  providers: [MagicHourService],
  exports: [MagicHourService],
})
export class MagicHourModule {} 