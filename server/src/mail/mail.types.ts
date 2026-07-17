
export enum EmailTemplateKey {
  CREATOR_PROFILE_APPROVED = 'creator-profile-approved',
  CREATOR_PROFILE_REJECTED = 'creator-profile-rejected',
  CREATOR_PROFILE_COMPLETION_REMINDER = 'creator-profile-completion-reminder',
  ORDER_BRIEF_SUBMITTED_FOR_CREATOR = 'order-brief-submitted-for-creator',
  ORDER_BRIEF_ACCEPTED_FOR_BRAND = 'order-brief-accepted-for-brand',
  ORDER_PRODUCT_SHIPPED_FOR_CREATOR = 'order-product-shipped-for-creator',
  ORDER_PRODUCT_RECEIVED_FOR_BRAND = 'order-product-received-for-brand',
  ORDER_REVISION_REQUESTED_FOR_CREATOR = 'order-revision-requested-for-creator',
  ORDER_CONTENT_DELIVERED_FOR_BRAND = 'order-content-delivered-for-brand',
  ORDER_CONTENT_ACCEPTED_FOR_CREATOR = 'order-content-accepted-for-creator',
  ORDER_COMPLETED_FOR_BRAND = 'order-completed-for-brand',
  ORDER_REJECTED_FOR_BRAND = 'order-rejected-for-brand',
  ORDER_REJECTED_FOR_CREATOR = 'order-rejected-for-creator',
  ORDER_REFUNDED_FOR_BRAND = 'order-refunded-for-brand',
  PASSWORD_RESET = 'password-reset',
}

export type EmailTemplateContext = Record<
  string,
  string | number | boolean | null | undefined
>;

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type MailNotificationGate =
  | { profileType: 'creator'; profileId: string }
  | { profileType: 'brand'; profileId: string };

export type SendMailParams = {
  to: string;
  templateKey: EmailTemplateKey;
  context: EmailTemplateContext;
  /** Required for profile/order mail; omitted for transactional mail (e.g. password reset). */
  notificationGate?: MailNotificationGate;
};
