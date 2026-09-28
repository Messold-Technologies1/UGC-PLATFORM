/**
 * The subset of SES's SNS notification payloads we act on.
 *
 * `mail.messageId` is the id SES returned when the message was accepted, and is
 * what links a bounce, complaint or delivery back to its NotificationLog row.
 */
type SesMailHeader = {
  mail?: {
    messageId?: string;
  };
};

export type SesBounceNotification = SesMailHeader & {
  notificationType: 'Bounce';
  bounce?: {
    bounceType?: string;
    bounceSubType?: string;
    bouncedRecipients?: Array<{ emailAddress?: string }>;
  };
};

export type SesComplaintNotification = SesMailHeader & {
  notificationType: 'Complaint';
  complaint?: {
    complainedRecipients?: Array<{ emailAddress?: string }>;
  };
};

export type SesDeliveryNotification = SesMailHeader & {
  notificationType: 'Delivery';
  delivery?: {
    recipients?: string[];
  };
};

export type SesSnsNotification =
  | SesBounceNotification
  | SesComplaintNotification
  | SesDeliveryNotification;
