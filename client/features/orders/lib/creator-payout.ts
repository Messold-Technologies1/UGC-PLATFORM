import { PLATFORM_FEE_RATE } from "@/features/creators/hooks/creator-profile-form-utils";

export type CreatorOrderPayoutBreakdown = {
  /** What the brand paid (package + add-ons), in INR. */
  orderTotal: number;
  /** GoCollab take (20% of order total), in INR. */
  platformFee: number;
  /** What the creator receives after the platform fee, in INR. */
  creatorEarnings: number;
};

/**
 * Same math as the creator profile package earnings banner:
 * platform fee = round(orderTotal * 20%), creator gets the rest.
 */
export function getCreatorPayoutFromOrderTotal(
  orderTotalInr: number,
): CreatorOrderPayoutBreakdown {
  const orderTotal = Number.isFinite(orderTotalInr)
    ? Math.max(0, orderTotalInr)
    : 0;
  const platformFee = Math.round(orderTotal * PLATFORM_FEE_RATE);
  return {
    orderTotal,
    platformFee,
    creatorEarnings: orderTotal - platformFee,
  };
}

export function resolveOrderTotalInr(order: {
  expectedAmountPaise?: number | null;
  priceAmountSnapshot?: string | null;
}): number {
  if (
    typeof order.expectedAmountPaise === "number" &&
    order.expectedAmountPaise > 0
  ) {
    return order.expectedAmountPaise / 100;
  }
  if (order.priceAmountSnapshot) {
    const parsed = Number.parseFloat(order.priceAmountSnapshot);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return 0;
}

export function formatCreatorPayoutInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
