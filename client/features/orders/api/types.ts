export interface OrderCreatorSnapshot {
  id: string;
  displayName: string;
  profileImageUrl?: string | null;
  city?: string | null;
  avgRating?: string | null;
  reviewCount?: number;
  /**
   * Creator's shipping address for physical-product orders. Recipient name and
   * phone are intentionally omitted server-side to keep the creator anonymized.
   */
  shippingAddress?: string | null;
}

export interface OrderBrandSnapshot {
  id: string;
  brandName: string | null;
  logoUrl?: string | null;
}

export interface OrderListSummary {
  id: string;
  status: string;
  packageNameSnapshot: string;
  priceAmountSnapshot: string;
  currency: string;
  deliveryDaysSnapshot: number;
  paidAt?: string | null;
  briefSubmittedAt?: string | null;
  briefAcceptedAt?: string | null;
  hasBrief: boolean;
  requiresPhysicalProductShipment: boolean;
  courierName?: string | null;
  trackingId?: string | null;
  dispatchedAt?: string | null;
  productReceivedAt?: string | null;
  briefId?: string;
  deliveryDueAt?: string | null;
  deliveryGraceDeadlineAt?: string | null;
  createdAt: string;
  updatedAt: string;
  expectedAmountPaise?: number;
  refundedAt?: string | null;
  /** When the latest dispute was opened — use for "Disputed on". */
  disputeOpenedAt?: string | null;
  /** When the latest dispute was resolved — use for "Rejected on". */
  disputeResolvedAt?: string | null;
}

export interface OrderAddOnSnapshot {
  id: string;
  name: string;
  priceAmount: string;
  description?: string | null;
}

export interface OrderCurrentRevision {
  revisionNumber: number;
  note?: string | null;
  requestedAt: string;
}

export type OrderDisputeOpenedBy = "BRAND" | "CREATOR";

export interface OrderActiveDispute {
  status: "OPEN" | "RESOLVED_CONTINUE" | "RESOLVED_REFUNDED" | "RESOLVED_CLOSED";
  openedBy: OrderDisputeOpenedBy;
  reason: string;
  openedAt: string;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
}

export interface OrderDetailsPublic extends OrderListSummary {
  deliverablesSnapshot: string[];
  maxRevisionsSnapshot: number;
  addOnsSnapshot: OrderAddOnSnapshot[];
  addOnsTotalSnapshot?: string | null;
  expectedAmountPaise: number;
  deliveredAt?: string | null;
  acceptedAt?: string | null;
  creatorPaidAt?: string | null;
  revisionCount: number;
  /** Revisions granted by one paid extra-revisions purchase. */
  revisionsPerPurchase: number;
  /** Price (paise) to buy one extra-revisions add-on; null when unavailable. */
  revisionAddOnUnitPaise?: number | null;
  /** Whether the brand can buy extra revisions for this order. */
  revisionAddOnAvailable: boolean;
  /** Usage-rights days granted by one paid extension block. */
  usageRightsPerPurchase: number;
  /** Base usage-rights days every order includes. */
  usageRightsBaseDays: number;
  /** Extra usage-rights days the brand has purchased on this order. */
  usageRightsExtraDays: number;
  /** Price (paise) for one usage-rights extension block; null when unavailable. */
  usageRightsAddOnUnitPaise?: number | null;
  /** Whether the brand can buy extra usage-rights time (only after completion). */
  usageRightsAddOnAvailable: boolean;
  /** Total paid for mid-order extra-revisions purchases (paise). Brand details only. */
  extraRevisionsPaidPaise: number;
  /** Number of paid extra-revisions purchases. Brand details only. */
  extraRevisionsPurchases: number;
  /** Total paid for post-order usage-rights extensions (paise). Brand details only. */
  extraUsageRightsPaidPaise: number;
  currentRevision?: OrderCurrentRevision;
  dispute?: OrderActiveDispute;
}

export interface CreatorRatingReviewBrandSnapshot {
  id: string;
  brandName: string | null;
  logoUrl?: string | null;
}

export interface CreatorRatingReview {
  id: string;
  orderId: string;
  creatorId: string;
  rating: number;
  review?: string | null;
  packageNameSnapshot?: string | null;
  brand: CreatorRatingReviewBrandSnapshot;
  createdAt: string;
}
