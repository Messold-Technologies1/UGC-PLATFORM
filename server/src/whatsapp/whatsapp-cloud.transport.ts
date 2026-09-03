import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WhatsAppSendParams = {
  /** E.164 digits, no `+` (e.g. `919812345678`). */
  to: string;
  /** Approved template name registered in WhatsApp Manager. */
  templateName: string;
  /** BCP-47 language code, e.g. `en`. */
  language: string;
  /** Body placeholder values, in {{1}}, {{2}}, ... order. */
  bodyVars: string[];
  /** Dynamic URL-button suffix (button index 0), if the template has one. */
  buttonUrlVar?: string;
};

/**
 * Thin transport around the Meta WhatsApp Cloud API `/messages` endpoint — the
 * WhatsApp twin of `SesMailTransport`. Builds the template payload (body +
 * optional dynamic URL button) and POSTs it. No opt-in / enable checks here;
 * `WhatsAppService` owns those, exactly as `MailService` wraps the SES transport.
 */
@Injectable()
export class WhatsAppCloudTransport {
  private readonly logger = new Logger(WhatsAppCloudTransport.name);
  private readonly phoneNumberId: string | null;
  private readonly accessToken: string | null;
  private readonly apiVersion: string;

  constructor(private readonly config: ConfigService) {
    this.phoneNumberId =
      this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim() || null;
    this.accessToken =
      this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim() || null;
    this.apiVersion =
      this.config.get<string>('WHATSAPP_API_VERSION')?.trim() || 'v21.0';

    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn(
        'WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not set; outbound WhatsApp disabled',
      );
    }
  }

  async send(params: WhatsAppSendParams): Promise<void> {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error(
        'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are required to send WhatsApp',
      );
    }

    const components: unknown[] = [];
    if (params.bodyVars.length > 0) {
      components.push({
        type: 'body',
        parameters: params.bodyVars.map((text) => ({ type: 'text', text })),
      });
    }
    if (params.buttonUrlVar) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: params.buttonUrlVar }],
      });
    }

    const body = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.language },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `WhatsApp send failed (HTTP ${res.status}) template=${params.templateName}: ${detail}`,
      );
    }

    const json = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
    };
    const messageId = json.messages?.[0]?.id ?? 'unknown';
    this.logger.log(
      `sent whatsapp template=${params.templateName} to=${params.to} messageId=${messageId}`,
    );
  }
}
