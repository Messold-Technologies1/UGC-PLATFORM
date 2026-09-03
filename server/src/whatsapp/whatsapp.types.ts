/**
 * WhatsApp notification types — the WhatsApp twin of `mail.types.ts`.
 *
 * Unlike email, WhatsApp can only send **pre-approved template messages** for
 * business-initiated notifications. `template` below is the template `name`
 * registered and approved in WhatsApp Manager. The mail notifiers derive it
 * from their `EmailTemplateKey` (see `whatsAppTemplateNameForEmail`), so every
 * email that fires also fires the matching WhatsApp template.
 */

/**
 * Opt-in gate, mirroring `MailNotificationGate`. The send is skipped unless the
 * addressed profile has `whatsappNotificationsEnabled = true`.
 */
export type WhatsAppNotificationGate =
  | { profileType: 'creator'; profileId: string }
  | { profileType: 'brand'; profileId: string };

export type SendWhatsAppParams = {
  /** Recipient phone in any format; normalized to E.164 digits before sending. */
  to: string | null | undefined;
  /** Approved template name registered in WhatsApp Manager. */
  template: string;
  /** Values for the template body placeholders {{1}}, {{2}}, ... in order. */
  bodyVars?: string[];
  /**
   * Value for a dynamic URL button (button index 0), appended to the template's
   * approved base URL. Pass a frontend relative path (see `frontendRelativePath`)
   * when the template button base is `${FRONTEND_URL}/{{1}}`. Omit for templates
   * with no button or only static buttons.
   */
  buttonUrlVar?: string;
  /** Opt-in gate; required for notification templates. */
  notificationGate?: WhatsAppNotificationGate;
};
