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
    // TODO: Implement Magic Hour completion webhook
    console.log('Magic Hour completion webhook received:', payload);
    return { success: true, message: 'Webhook received' };
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

  @Post('razorpay/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Razorpay payment webhook',
    description: 'Webhook for Razorpay payment events',
  })
  async handleRazorpayPayment(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    try {
      console.log('🎯 Razorpay webhook received:', {
        fullPayload: payload,
        event: payload.event,
        paymentId: payload.payload?.payment?.entity?.id || payload.payment?.id,
        amount: payload.payload?.payment?.entity?.amount || payload.payment?.amount,
        status: payload.payload?.payment?.entity?.status || payload.payment?.status,
      });

      // Handle different payment events - try multiple payload structures
      const eventType = payload.event;
      const paymentData = payload.payload?.payment?.entity || payload.payment || payload;

      switch (eventType) {
        case 'payment.authorized':
          console.log('💳 Payment authorized:', paymentData?.id);
          await this.webhookService.handlePaymentAuthorized(paymentData);
          break;

        case 'payment.captured':
          console.log('✅ Payment captured:', paymentData?.id);
          await this.webhookService.handlePaymentCaptured(paymentData);
          break;

        case 'payment.failed':
          console.log('❌ Payment failed:', paymentData?.id);
          await this.webhookService.handlePaymentFailed(paymentData);
          break;

        default:
          console.log('📝 Unhandled webhook event:', eventType);
          
          // If it's a test webhook, acknowledge it
          if (!eventType || eventType === 'test' || payload.test) {
            console.log('✅ Test webhook acknowledged');
            return { success: true, message: 'Test webhook acknowledged' };
          }
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('❌ Error processing Razorpay webhook:', error);
      return { success: false, message: 'Webhook processing failed' };
    }
  }
} 