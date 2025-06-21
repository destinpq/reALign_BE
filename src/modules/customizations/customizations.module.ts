import { Module } from '@nestjs/common';
import { CustomizationsService } from './customizations.service';
import { CustomizationsController } from './customizations.controller';

@Module({
  controllers: [CustomizationsController],
  providers: [CustomizationsService],
  exports: [CustomizationsService],
})
export class CustomizationsModule {} 