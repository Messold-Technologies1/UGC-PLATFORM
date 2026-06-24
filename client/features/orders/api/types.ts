export interface OrderCreatorSnapshot {
  id: string;
  displayName: string;
  profileImageUrl?: string | null;
  city?: string | null;
}

export interface OrderBrandSnapshot {
  id: string;
  brandName: string;
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
}

export interface OrderAddOnSnapshot {
  id: string;
  name: string;
  priceAmount: string;
  description?: string | null;
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
  refundedAt?: string | null;
}

export interface CreatorRatingReviewBrandSnapshot {
  id: string;
  brandName: string;
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
