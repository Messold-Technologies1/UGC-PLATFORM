import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaWhatsAppConnector } from './meta-whatsApp.connector';
import { TimeoutError, withTimeout } from '../util/with-timeout';
import type { SendWhatsAppParams } from './whatsapp.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly sendTimeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly transport: MetaWhatsAppConnector,
  ) {
    this.sendTimeoutMs = this.config.get<number>(
      'WHATSAPP_SEND_TIMEOUT_MS',
      10_000,
    );
  }

  isEnabled(): boolean {
    if (this.config.get<string>('WHATSAPP_ENABLED') !== 'true') return false;
    return this.transport.isConfigured();
  }

  async send(params: SendWhatsAppParams): Promise<void> {
    const to = this.normalizePhone(params.to);
    if (!to) {
      this.logger.warn(
        `skip whatsapp template=${params.templateKey}: empty or invalid phone`,
      );
      return;
    }

    if (!this.isEnabled()) {
      this.logger.debug(
        `skip whatsapp template=${params.templateKey} to=${to} (whatsapp disabled or credentials unset)`,
      );
      return;
    }

    try {
      await withTimeout(
        this.transport.send({
          to,
          templateName: params.templateKey,
          languageCode: 'en',
          bodyParameters: params.variables,
        }),
        this.sendTimeoutMs,
        `WhatsApp send template=${params.templateKey}`,
      );
    } catch (err) {
      if (err instanceof TimeoutError) {
        this.logger.warn(
          `whatsapp timeout template=${params.templateKey} to=${to}: ${err.message}`,
        );
      }
      throw err;
    }
  }

  private normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return null;

    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (digits.length === 10) {
      digits = `91${digits}`;
    }

    if (digits.length < 11) return null;

    return digits;
  }
}
