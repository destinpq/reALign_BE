import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('magic-hour/processing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Magic Hour processing webhook',
    description: 'Webhook for Magic Hour AI processing updates',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleMagicHourProcessing(
    @Body() payload: any,
    @Headers('signature') signature: string,
  ) {
    // TODO: Implement Magic Hour processing webhook
    console.log('Magic Hour processing webhook received:', payload);
    return { success: true, message: 'Webhook received' };
  }

  @Post('magic-hour/completed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Magic Hour completion webhook',
    description: 'Webhook for Magic Hour AI job completion',
  })
  async handleMagicHourCompletion(
    @Body() payload: any,
    @Headers('signature') signature: string,
  ) {
    console.log('🎉 Magic Hour completion webhook received:', payload);
    
    try {
      // Extract job ID from payload
      const jobId = payload.id || payload.job_id || payload.jobId;
      
      if (!jobId) {
        console.error('❌ No job ID found in webhook payload');
        return { success: false, message: 'No job ID provided' };
      }
      
      console.log('🔄 Processing completed Magic Hour job:', jobId);
      
      // Call the webhook service to handle the completion
      await this.webhookService.handleMagicHourCompletion(jobId, payload);
      
      return { success: true, message: 'Magic Hour completion processed successfully' };
    } catch (error) {
      console.error('❌ Error processing Magic Hour completion webhook:', error);
      return { success: false, message: 'Error processing webhook' };
    }
  }

  @Post('magic-hour/failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Magic Hour failure webhook',
    description: 'Webhook for Magic Hour AI job failures',
  })
  async handleMagicHourFailure(
    @Body() payload: any,
    @Headers('signature') signature: string,
  ) {
    // TODO: Implement Magic Hour failure webhook
    console.log('Magic Hour failure webhook received:', payload);
    return { success: true, message: 'Webhook received' };
  }

  @Post('magic-hour/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Magic Hour progress webhook',
    description: 'Webhook for Magic Hour AI job progress updates',
  })
  async handleMagicHourProgress(
    @Body() payload: any,
    @Headers('signature') signature: string,
  ) {
    // TODO: Implement Magic Hour progress webhook
    console.log('Magic Hour progress webhook received:', payload);
    return { success: true, message: 'Webhook received' };
  }


} 