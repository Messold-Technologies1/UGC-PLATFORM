/**
 * WhatsApp notification types — the WhatsApp twin of `mail.types.ts`.
 *
 * Unlike email, WhatsApp can only send **pre-approved template messages** for
 * business-initiated notifications. Each key below must map to a template you
 * have created and had approved in WhatsApp Manager. The enum value is the
 * template `name` registered with Meta; keep them in sync.
 */
export enum WhatsAppTemplateKey {
  /** Sent to the creator when a brand submits a brief. Body: {{1}}=creator, {{2}}=brand. */
  ORDER_BRIEF_SUBMITTED_FOR_CREATOR = 'order_brief_submitted_for_creator',
}

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
  template: WhatsAppTemplateKey;
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
