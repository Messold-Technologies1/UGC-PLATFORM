import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { WhatsAppService } from './whatsapp.service';

/** Minimal shape of the Meta WhatsApp webhook POST body (statuses + messages). */
type WhatsAppWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          recipient_id?: string;
          errors?: Array<{
            code?: number;
            title?: string;
            message?: string;
            error_data?: { details?: string };
          }>;
        }>;
        messages?: Array<{ from?: string; type?: string }>;
      };
    }>;
  }>;
};

/**
 * Receiver for Meta WhatsApp Cloud API webhooks at `/api/webhooks/whatsapp`.
 *
 * - GET  handles the one-time subscription verification handshake.
 * - POST receives delivery-status callbacks (sent/delivered/read/failed) and
 *   any inbound messages. Statuses are logged via `WhatsAppService` so an
 *   operator can see whether a message truly reached the phone, instead of only
 *   the `accepted` (queued) line emitted when we call the send API.
 *
 * Configure in WhatsApp Manager > Configuration > Webhooks:
 *   Callback URL: https://<api-host>/api/webhooks/whatsapp
 *   Verify token: WHATSAPP_WEBHOOK_VERIFY_TOKEN
 *   Subscribe to the `messages` field.
 */
@ApiExcludeController()
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {}

  /** Meta subscription verification handshake (echo back hub.challenge). */
  @Get()
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    const result = this.whatsapp.verifyWebhookChallenge(mode, token, challenge);
    if (result === null) {
      throw new ForbiddenException('WhatsApp webhook verification failed');
    }
    // Meta expects the raw challenge string echoed back with 200.
    return result;
  }

  /** Delivery-status + inbound-message callbacks. */
  @Post()
  @HttpCode(HttpStatus.OK)
  handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: WhatsAppWebhookBody,
    // Meta signs the payload; header name is case-insensitive in Express.
  ): void {
    if (!this.verifySignature(req)) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    for (const entry of body?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};

        for (const status of value.statuses ?? []) {
          if (!status.id || !status.status) continue;
          this.whatsapp.noteStatusUpdate({
            messageId: status.id,
            recipient: status.recipient_id,
            status: status.status,
            timestamp: status.timestamp,
            errors: status.errors,
          });
        }

        for (const message of value.messages ?? []) {
          this.logger.log(
            `whatsapp inbound message from=${message.from ?? 'unknown'} type=${message.type ?? 'unknown'}`,
          );
        }
      }
    }
  }

  /**
   * Verify the `X-Hub-Signature-256` header (HMAC-SHA256 of the raw body with
   * the Meta App Secret). Skipped when `WHATSAPP_APP_SECRET` is unset so local
   * dev works without it; enforced whenever the secret is configured.
   */
  private verifySignature(req: Request & { rawBody?: Buffer }): boolean {
    const secret = this.config.get<string>('WHATSAPP_APP_SECRET')?.trim();
    if (!secret) return true; // signature checking disabled

    const header = req.header('x-hub-signature-256');
    if (!header || !header.startsWith('sha256=')) {
      this.logger.warn('whatsapp webhook: missing/invalid signature header');
      return false;
    }
    const raw = req.rawBody;
    if (!raw?.length) {
      this.logger.warn(
        'whatsapp webhook: missing raw body for signature check',
      );
      return false;
    }

    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    const provided = header.slice('sha256='.length);
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(provided, 'hex');
    if (
      expectedBuf.length !== providedBuf.length ||
      !timingSafeEqual(expectedBuf, providedBuf)
    ) {
      this.logger.warn('whatsapp webhook: signature mismatch');
      return false;
    }
    return true;
  }
}
