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
    const { rawBody, json } = resolveWebhookPayload(req, body);
    if (!json) {
      throw new Error('Missing body for SNS webhook');
    }

    await this.webhooks.handleSesSnsWebhook({
      rawBody,
      json,
    });
  }
}

/**
 * SNS may arrive as text/plain; Vercel/Express do not always set rawBody.
 *
 * For SNS signature verification the json MUST be parsed from the original
 * raw bytes — never re-serialised from a JS object — so we always prefer
 * rawBody as the source of truth and only fall back to @Body() when rawBody
 * is unavailable (e.g. unit tests).
 */
function resolveWebhookPayload(
  req: Request & { rawBody?: Buffer },
  body: unknown,
): { rawBody: Buffer; json: unknown } {
  // rawBody is always the preferred path: parse JSON from the exact bytes
  // AWS signed so the string-to-sign matches perfectly.
  if (req.rawBody?.length) {
    let json: unknown;
    try {
      json = JSON.parse(req.rawBody.toString('utf8'));
    } catch {
      // Not valid JSON from rawBody; fall through to body fallbacks below.
      json = null;
    }
    if (json != null) {
      return { rawBody: req.rawBody, json };
    }
  }

  // Fallback 1: body arrived as a plain string (text/plain parsed by express.text).
  if (typeof body === 'string' && body.trim()) {
    const rawBody = Buffer.from(body, 'utf8');
    return { rawBody, json: JSON.parse(body) };
  }

  // Fallback 2: body already parsed to an object by express.json.
  // Re-serialise to get rawBody; signature verification won't work reliably
  // in this path but at least SubscriptionConfirmation can still be processed
  // when SES_SNS_SKIP_SIGNATURE_VERIFY=true.
  if (body != null && typeof body === 'object' && !Buffer.isBuffer(body)) {
    const rawBody = Buffer.from(JSON.stringify(body), 'utf8');
    return { rawBody, json: body };
  }

  return { rawBody: Buffer.alloc(0), json: null };
}

