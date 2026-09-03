import type { ConfigService } from '@nestjs/config';
import { EmailTemplateKey } from './mail.types';
import type { WhatsAppService } from '../whatsapp/whatsapp.service';
import type { WhatsAppNotificationGate } from '../whatsapp/whatsapp.types';
import {
  frontendBaseUrl,
  frontendRelativePath,
} from '../util/frontend-url.util';

/**
 * The WhatsApp template name for a given email template, or null when the email
 * has no WhatsApp twin (currently only the transactional password reset).
 *
 * WhatsApp template names must be `^[a-z0-9_]+$`, so the dash-cased email keys
 * map by replacing `-` with `_` (e.g. `order-content-delivered-for-brand`
 * -> `order_content_delivered_for_brand`). Create + approve each of these in
 * WhatsApp Manager before enabling outbound WhatsApp.
 */
export function whatsAppTemplateNameForEmail(
  key: EmailTemplateKey,
): string | null {
  if (key === EmailTemplateKey.PASSWORD_RESET) return null;
  return key.replace(/-/g, '_');
}

/**
 * Fire the WhatsApp twin of an email notification. Universal contract for every
 * template: body placeholder {{1}} = recipient name (plus any `extraBodyVars`),
 * and a dynamic URL button whose value is the same deep link the email uses
 * (as a frontend relative path). No-ops for templates with no WhatsApp twin,
 * an empty recipient, when WhatsApp is disabled, or when the profile hasn't
 * opted in — all handled inside `WhatsAppService.send`.
 */
export async function sendWhatsAppForEmail(
  whatsapp: WhatsAppService,
  config: ConfigService,
  params: {
    to: string | null | undefined;
    emailKey: EmailTemplateKey;
    recipientName: string;
    actionUrl?: string | null;
    gate: WhatsAppNotificationGate;
    extraBodyVars?: string[];
  },
): Promise<void> {
  const template = whatsAppTemplateNameForEmail(params.emailKey);
  if (!template) return;

  const base = frontendBaseUrl(config);
  const buttonUrlVar = params.actionUrl
    ? frontendRelativePath(base, params.actionUrl)
    : undefined;

  await whatsapp.send({
    to: params.to,
    template,
    bodyVars: [params.recipientName, ...(params.extraBodyVars ?? [])],
    buttonUrlVar,
    notificationGate: params.gate,
  });
}
