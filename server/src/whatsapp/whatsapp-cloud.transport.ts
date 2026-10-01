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

  /**
   * POST the template to Meta and return the assigned message id (`wamid...`).
   *
   * The Cloud API only ever reports `accepted` here — it means Meta queued the
   * message, NOT that it reached the phone. The real `sent`/`delivered`/`read`/
   * `failed` outcome arrives asynchronously on the status webhook, keyed by this
   * same id (see `WhatsAppWebhookController` / `WhatsAppService.noteStatusUpdate`).
   */
  async send(params: WhatsAppSendParams): Promise<string> {
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
    this.logger.log(
      `[whatsapp] request template=${params.templateName} url=${url} payload=${JSON.stringify(body)}`,
    );

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(
        `[whatsapp] request failed template=${params.templateName} to=${params.to}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }

    const raw = await res.text().catch(() => '');
    this.logger.log(
      `[whatsapp] response template=${params.templateName} status=${res.status} body=${raw || '<empty>'}`,
    );

    if (!res.ok) {
      throw new Error(
        `WhatsApp send failed (HTTP ${res.status}) template=${params.templateName}: ${raw}`,
      );
    }

    let json: { messages?: Array<{ id?: string }> } = {};
    try {
      json = raw
        ? (JSON.parse(raw) as { messages?: Array<{ id?: string }> })
        : {};
    } catch {
      json = {};
    }
    const messageId = json.messages?.[0]?.id ?? 'unknown';
    // NOTE: this is Meta ACCEPTING the message (queued), not delivery. The
    // delivered/read/failed outcome is logged later from the status webhook.
    this.logger.log(
      `accepted whatsapp template=${params.templateName} to=${params.to} messageId=${messageId} (queued — awaiting delivery status)`,
    );
    return messageId;
  }

  /**
   * Send a one-time passcode using an **authentication-category** template.
   *
   * Authentication templates are their own shape: the code goes in the body
   * placeholder *and* again as the button parameter, because the button is the
   * "copy code" / autofill affordance that carries the passcode to the user's
   * clipboard. Sending the same code twice is the documented payload, not a
   * mistake.
   *
   * `sub_type` is configurable because Meta's expected value depends on how the
   * template was built in WhatsApp Manager (`url` for the standard one-tap /
   * copy-code authentication button). If Meta rejects the send with a component
   * error, flip WHATSAPP_OTP_BUTTON_SUBTYPE rather than redeploying.
   *
   * Returns the `wamid`. As with {@link send}, that means Meta ACCEPTED the
   * message — the delivered/failed outcome (including 131026 "not on WhatsApp")
   * arrives later on the status webhook.
   */
  async sendAuthenticationCode(params: {
    /** E.164 digits, no `+`. */
    to: string;
    templateName: string;
    language: string;
    code: string;
  }): Promise<string> {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error(
        'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are required to send WhatsApp',
      );
    }

    const buttonSubType =
      this.config.get<string>('WHATSAPP_OTP_BUTTON_SUBTYPE')?.trim() || 'url';

    const body = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.language },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: params.code }],
          },
          {
            type: 'button',
            sub_type: buttonSubType,
            index: '0',
            parameters: [{ type: 'text', text: params.code }],
          },
        ],
      },
    };

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    // Deliberately NOT logging the payload here (unlike `send`): it carries the
    // live passcode, which must not land in application logs.
    this.logger.log(
      `[whatsapp] request template=${params.templateName} url=${url} (authentication; payload redacted)`,
    );

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text().catch(() => '');
    if (!res.ok) {
      this.logger.error(
        `[whatsapp] auth template send failed status=${res.status} body=${raw || '<empty>'}`,
      );
      throw new Error(
        `WhatsApp send failed (HTTP ${res.status}) template=${params.templateName}: ${raw}`,
      );
    }

    let json: { messages?: Array<{ id?: string }> } = {};
    try {
      json = raw
        ? (JSON.parse(raw) as { messages?: Array<{ id?: string }> })
        : {};
    } catch {
      json = {};
    }
    const messageId = json.messages?.[0]?.id ?? 'unknown';
    this.logger.log(
      `accepted whatsapp auth template=${params.templateName} to=${params.to} messageId=${messageId} (queued — awaiting delivery status)`,
    );
    return messageId;
  }
}
