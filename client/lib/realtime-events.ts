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
  brandName?: string | null;
  packageName?: string;
}

export interface OrderBriefAcceptedEvent {
  orderId: string;
  briefAcceptedAt: string;
  creatorName?: string | null;
  /** ISO string for non-physical orders; null when product receipt triggers the deadline */
  deliveryDueAt: string | null;
  deliveryGraceDeadlineAt: string | null;
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
  deliveryDueAt: string;
  deliveryGraceDeadlineAt: string;
}

export interface OrderRevisionRequestedEvent {
  orderId: string;
  revisionNumber: number;
  note?: string | null;
  revisionsRemaining: number;
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

export interface DeliveryWatermarkReadyEvent {
  orderId: string;
  revisionNumber: number;
}

export interface OrderContentDeliveredEvent {
  orderId: string;
  status: "DELIVERED" | "REVISION_SUBMITTED";
  revisionNumber: number;
  deliveredAt: string;
}

export interface OrderDisputeOpenedEvent {
  orderId: string;
  openedBy: "BRAND" | "CREATOR";
  reason?: string | null;
}

export interface OrderDisputeResolvedEvent {
  orderId: string;
  outcome: "CONTINUED" | "WITHDRAWN" | "REJECTED";
  restoredStatus?: string | null;
  resolutionNotes?: string | null;
}

/**
 * An imported reel's file finished copying into our storage (or failed to).
 *
 * The row itself was saved the moment the creator picked the reel; this is only
 * about the video file catching up, which is why it carries an asset state
 * rather than the video.
 */
export interface PortfolioVideoAssetUpdatedEvent {
  videoId: string;
  creatorProfileId: string;
  assetState: "READY" | "FAILED";
}

export interface ClientToServerEvents {
  /** Admin joins an order's live chat room (dispute group chat). */
  "order-chat:subscribe": (payload: { orderId: string }) => void;
  /** Admin leaves an order's live chat room. */
  "order-chat:unsubscribe": (payload: { orderId: string }) => void;
  /**
   * Admin joins a creator's portfolio room, to watch reels they imported on
   * that creator's behalf settle. Creators need no subscription — these events
   * also go to their own user room.
   */
  "portfolio:subscribe": (payload: { creatorProfileId: string }) => void;
  "portfolio:unsubscribe": (payload: { creatorProfileId: string }) => void;
}

export interface ServerToClientEvents {
  "order.payment": (e: OrderPaymentEvent) => void;
  "order.brief_submitted": (e: OrderBriefSubmittedEvent) => void;
  "order.brief_accepted": (e: OrderBriefAcceptedEvent) => void;
  "order.product_shipped": (e: OrderProductShippedEvent) => void;
  "order.product_received": (e: OrderProductReceivedEvent) => void;
  "order.revision_requested": (e: OrderRevisionRequestedEvent) => void;
  "order.content_delivered": (e: OrderContentDeliveredEvent) => void;
  "order.dispute_opened": (e: OrderDisputeOpenedEvent) => void;
  "order.dispute_resolved": (e: OrderDisputeResolvedEvent) => void;
  "delivery.watermark_ready": (e: DeliveryWatermarkReadyEvent) => void;
  "portfolio.video_asset_updated": (
    e: PortfolioVideoAssetUpdatedEvent,
  ) => void;
  "chat.message": (e: OrderChatMessageEvent) => void;
  "chat.read_updated": (e: OrderChatReadUpdatedEvent) => void;
}
