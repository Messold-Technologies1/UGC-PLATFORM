export interface OrderCreatorSnapshot {
  id: string;
  displayName: string;
  profileImageUrl?: string | null;
  city?: string | null;
}

export interface OrderBrandSnapshot {
  id: string;
  companyName: string;
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
  hasBrief: boolean;
  deliveryDeadlineAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
