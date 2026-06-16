export enum WhatsAppTemplateKey {
  ORDER_BRIEF_SUBMITTED_FOR_CREATOR = 'order_brief_submitted',
  ORDER_BRIEF_ACCEPTED_FOR_BRAND = 'order_brief_accepted',
  ORDER_PRODUCT_SHIPPED_FOR_CREATOR = 'order_product_shipped',
  ORDER_PRODUCT_RECEIVED_FOR_BRAND = 'order_product_received',
  ORDER_REVISION_REQUESTED_FOR_CREATOR = 'order_revision_requested',
  ORDER_CONTENT_ACCEPTED_FOR_CREATOR = 'order_content_accepted',
  ORDER_REJECTED_FOR_BRAND = 'order_rejected_brand',
  ORDER_REJECTED_FOR_CREATOR = 'order_rejected_creator',
  ORDER_REFUNDED_FOR_BRAND = 'order_refunded',

  CREATOR_PROFILE_APPROVED = 'creator_profile_approved',
  CREATOR_PROFILE_REJECTED = 'creator_profile_rejected',
}

export type SendWhatsAppParams = {
  to: string;
  templateKey: WhatsAppTemplateKey;
  variables: string[];
};
