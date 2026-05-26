import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Razorpay webhook receiver (payments/refunds)' })
  async razorpay(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: unknown,
    @Headers('x-razorpay-signature') signature?: string,
  ): Promise<void> {
    const raw = req.rawBody;
    if (!raw) {
      // Nest should provide rawBody because we enable { rawBody: true } in main.ts
      throw new Error('Missing rawBody for webhook verification');
    }

    await this.webhooks.handleRazorpayWebhook({
      rawBody: raw,
      signature,
      json: body,
    });
  }

  @Post('ses')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Amazon SNS webhook for SES bounces and complaints',
    description:
      'Subscribe HTTPS to gocollab-ses-bounces / gocollab-ses-complaints topics. Handles SubscriptionConfirmation automatically.',
  })
  async ses(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: unknown,
  ): Promise<void> {
    const raw = req.rawBody;
    if (!raw) {
      throw new Error('Missing rawBody for SNS webhook');
    }

    await this.webhooks.handleSesSnsWebhook({
      rawBody: raw,
      json: body,
    });
  }
}

