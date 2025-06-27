import { Module } from '@nestjs/common';
import { S3UploadController } from './s3-upload.controller';
import { S3UploadService } from './s3-upload.service';

@Module({
  controllers: [S3UploadController],
  providers: [S3UploadService],
  exports: [S3UploadService], // Export service so other modules can use it
})
export class S3UploadModule {} 