"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import { useCreatorProfileCompletenessQuery } from "@/features/creators/hooks/use-creator-profile-completeness-query";

export function orderCompleteProfileHref(orderId: string): string {
  return `/creator/orders/${orderId}/complete-profile`;
}

/**
 * An order the brand has signed off but we have not paid out yet — the window
 * where an unfinished profile is the only thing between a creator and their
 * money.
 */
export function isAwaitingCreatorPayment(order: {
  acceptedAt?: string | null;
  creatorPaidAt?: string | null;
}): boolean {
  return Boolean(order.acceptedAt) && !order.creatorPaidAt;
}

/**
 * Whether the signed-in creator still has profile gaps, and the way to the
 * page that lists them.
 *
 * Nothing in the order flow is blocked by this: a creator accepts briefs and
 * submits deliveries with an unfinished profile. It only matters once the
 * brand has approved the work — payouts are released by hand against a bank
 * account and a verified number, so a gap there is a payment that cannot go
 * out. That is when the creator is sent to the completion page.
 */
export function useProfileCompletionGate() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading } = useCreatorProfileCompletenessQuery({
    enabled: Boolean(user),
  });

  const redirectToCompletion = useCallback(
    (orderId: string) => {
      router.replace(orderCompleteProfileHref(orderId));
    },
    [router],
  );

  return {
    /** True once we know the profile is not ready. Undefined-safe: false while loading. */
    requiresProfileCompletion: Boolean(data && !data.complete),
    checking: isLoading,
    redirectToCompletion,
  };
}
