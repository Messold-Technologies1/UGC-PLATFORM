import {
  BadRequestException,
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
  @ApiOperation({ summary: 'Razorpay webhook receiver (payments only — refunds are handled manually by admins)' })
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
    const { rawBody, json } = resolveSnsWebhookPayload(req, body);
    if (!json) {
      throw new BadRequestException('Missing body for SNS webhook');
    }

    await this.webhooks.handleSesSnsWebhook({
      rawBody,
      json,
    });
  }
}

/** Parse SNS body from raw bytes (required for signature verification). */
function resolveSnsWebhookPayload(
  req: Request & { rawBody?: Buffer },
  body: unknown,
): { rawBody: Buffer; json: unknown } {
  if (req.rawBody?.length) {
    try {
      return {
        rawBody: req.rawBody,
        json: JSON.parse(req.rawBody.toString('utf8')) as unknown,
      };
    } catch {
      throw new BadRequestException('SNS webhook body is not valid JSON');
    }
  }

  // express.text on /api/webhooks/ses sets body to a string when rawBody verify missed
  if (typeof body === 'string' && body.trim()) {
    const rawBody = Buffer.from(body, 'utf8');
    try {
      return { rawBody, json: JSON.parse(body) as unknown };
    } catch {
      throw new BadRequestException('SNS webhook body is not valid JSON');
    }
  }

  // application/json (Nest rawBody: true) — body already parsed
  if (body != null && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return {
      rawBody: Buffer.from(JSON.stringify(body), 'utf8'),
      json: body,
    };
  }

  return { rawBody: Buffer.alloc(0), json: null };
}

