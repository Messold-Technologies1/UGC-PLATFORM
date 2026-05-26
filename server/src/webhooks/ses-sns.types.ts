export type SesBounceNotification = {
  notificationType: 'Bounce';
  bounce?: {
    bounceType?: string;
    bounceSubType?: string;
    bouncedRecipients?: Array<{ emailAddress?: string }>;
  };
};

export type SesComplaintNotification = {
  notificationType: 'Complaint';
  complaint?: {
    complainedRecipients?: Array<{ emailAddress?: string }>;
  };
};

export type SesSnsNotification = SesBounceNotification | SesComplaintNotification;
