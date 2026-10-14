"use client";

import { brandDisplayName } from "@/features/brands/lib/brand-display";
import { useAuth } from "@/providers/auth-provider";
import { useCreatorProfileCompletenessQuery } from "@/features/creators/hooks/use-creator-profile-completeness-query";
import { groupMissingByStep } from "@/features/creators/lib/profile-completeness-steps";
import {
  getCreatorPayoutFromOrderTotal,
  resolveOrderTotalInr,
} from "@/features/orders/lib/creator-payout";
import { useGetCreatorOrderDetailsQuery } from "@/features/orders/hooks/use-get-creator-order-details-query";
import { getCreatorOrdersPageHref } from "@/features/orders/components/creator-order-detail/creator-orders-tabs";
import { OrderProfileCompletionGateView } from "./order-profile-completion-gate-view";

export type OrderProfileCompletionGateProps = {
  orderId: string;
};

/**
 * Wires the gate view to the live checklist and this order. The checklist is
 * re-read on window focus, so fixing a gap in another tab clears it here
 * without a manual refresh.
 */
export function OrderProfileCompletionGate({
  orderId,
}: OrderProfileCompletionGateProps) {
  const { user } = useAuth();

  const completeness = useCreatorProfileCompletenessQuery({
    enabled: Boolean(user),
  });
  const { data: orderDetails } = useGetCreatorOrderDetailsQuery(orderId);

  const order = orderDetails?.order;
  const brand = orderDetails?.brand;
  const missing = completeness.data?.missing ?? [];

  return (
    <OrderProfileCompletionGateView
      loading={completeness.isLoading}
      groups={groupMissingByStep(missing)}
      totalGaps={missing.length}
      isComplete={Boolean(completeness.data?.complete)}
      orderHref={getCreatorOrdersPageHref(orderId, order?.status)}
      returnTo={`/creator/orders/${orderId}/complete-profile`}
      order={{
        brandName: brandDisplayName(
          brand?.clientBrandName || brand?.brandName || "Brand",
        ),
        packageName: order?.packageNameSnapshot ?? null,
        payoutInr: getCreatorPayoutFromOrderTotal(
          resolveOrderTotalInr({
            expectedAmountPaise: order?.expectedAmountPaise,
            priceAmountSnapshot: order?.priceAmountSnapshot,
          }),
        ).creatorEarnings,
      }}
    />
  );
}
