import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MetaWhatsAppSendParams = {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters: string[];
};

type MetaApiErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

@Injectable()
export class MetaWhatsAppConnector {
  private readonly logger = new Logger(MetaWhatsAppConnector.name);
  private readonly accessToken: string | null;
  private readonly phoneNumberId: string | null;
  private readonly apiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken =
      this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim() || null;
    this.phoneNumberId =
      this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim() || null;

    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn(
        'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set; outbound WhatsApp disabled',
      );
    }

    this.apiUrl = `https://graph.facebook.com/v25.0/${this.phoneNumberId}/messages`;
  }

  isConfigured(): boolean {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  async send(params: MetaWhatsAppSendParams): Promise<void> {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error(
        'WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required to send WhatsApp messages',
      );
    }

    const body = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.languageCode },
        components:
          params.bodyParameters.length > 0
            ? [
                {
                  type: 'body',
                  parameters: params.bodyParameters.map((text) => ({
                    type: 'text',
                    text,
                  })),
                },
              ]
            : [],
      },
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const err = (await response.json()) as MetaApiErrorResponse;
        detail = err.error?.message ?? JSON.stringify(err);
      } catch {
        detail = await response.text().catch(() => '(no body)');
      }
      throw new Error(
        `WhatsApp API ${response.status}: ${detail}`,
      );
    }

    this.logger.log(
      `sent whatsapp to=${params.to} template=${params.templateName}`,
    );
  }
}
