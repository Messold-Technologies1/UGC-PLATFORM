export type OrderPaymentKind =
  | "captured"
  | "failed"
  | "refund_processed"
  | "refund_failed";

export interface OrderPaymentEvent {
  kind: OrderPaymentKind;
  orderId: string;
  [extra: string]: unknown;
}

export interface OrderBriefSubmittedEvent {
  orderId: string;
  briefSubmittedAt: string;
}

export interface OrderBriefAcceptedEvent {
  orderId: string;
  briefAcceptedAt: string;
}

export interface OrderProductShippedEvent {
  orderId: string;
  courierName: string;
  trackingId?: string | null;
  dispatchedAt: string;
}

export interface OrderProductReceivedEvent {
  orderId: string;
  productReceivedAt: string;
}

export interface OrderChatMessage {
  id: string;
  orderId: string;
  senderUserId: string;
  type: "TEXT" | "VOICE";
  text?: string | null;
  audioUrl?: string | null;
  audioDurationMs?: number | null;
  audioMimeType?: string | null;
  clientMessageId?: string | null;
  createdAt: string;
}

export interface OrderChatMessageEvent {
  orderId: string;
  message: OrderChatMessage;
}

export interface OrderChatReadUpdatedEvent {
  orderId: string;
  userId: string;
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
}

export interface OrderBriefAcceptedEvent {
  orderId: string;
  briefAcceptedAt: string;
  /** ISO string for non-physical orders; null when product receipt triggers the deadline */
  deliveryDeadlineAt: string | null;
}

export interface OrderProductReceivedEvent {
  orderId: string;
  productReceivedAt: string;
  deliveryDeadlineAt: string;
}

export interface ServerToClientEvents {
  "order.payment": (e: OrderPaymentEvent) => void;
  "order.brief_submitted": (e: OrderBriefSubmittedEvent) => void;
  "order.brief_accepted": (e: OrderBriefAcceptedEvent) => void;
  "order.product_shipped": (e: OrderProductShippedEvent) => void;
  "order.product_received": (e: OrderProductReceivedEvent) => void;
  "chat.message": (e: OrderChatMessageEvent) => void;
  "chat.read_updated": (e: OrderChatReadUpdatedEvent) => void;
}
