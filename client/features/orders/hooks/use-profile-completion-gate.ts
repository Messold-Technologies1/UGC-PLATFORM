"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";

import { useAuth } from "@/providers/auth-provider";
import { useCreatorProfileCompletenessQuery } from "@/features/creators/hooks/use-creator-profile-completeness-query";

export function orderCompleteProfileHref(orderId: string): string {
  return `/creator/orders/${orderId}/complete-profile`;
}

/**
 * Keeps an unfinished profile out of the one step where it actually costs
 * someone: submitting the delivery.
 *
 * Accepting a brief is deliberately not gated — a creator takes the order
 * first and finishes their profile while they shoot — so this only nudges
 * after acceptance (`afterAccepted`) and blocks at submission (`guard`). The
 * API enforces the same rule on submit, and `handleError` catches that refusal
 * for gaps that open mid-order (a revoked Instagram token, a deleted video).
 */
export function useProfileCompletionGate(orderId: string) {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading } = useCreatorProfileCompletenessQuery({
    enabled: Boolean(user),
  });

  const incomplete = Boolean(data && !data.complete);

  const redirect = useCallback(() => {
    router.push(orderCompleteProfileHref(orderId));
  }, [router, orderId]);

  /** Where to send a creator who has just accepted the brief. */
  const afterAccepted = useCallback(
    (fallback: () => void) => {
      if (incomplete) {
        redirect();
        return;
      }
      fallback();
    },
    [incomplete, redirect],
  );

  const guard = useCallback(
    (run: () => void) => {
      // Unknown (still loading, or the query failed) lets the attempt through:
      // the API is the real gate, and `handleError` catches its refusal.
      if (incomplete) {
        redirect();
        return;
      }
      run();
    },
    [incomplete, redirect],
  );

  const handleError = useCallback(
    (error: unknown): boolean => {
      if (
        isAxiosError(error) &&
        error.response?.status === 409 &&
        (error.response.data as { error?: string })?.error ===
          "PROFILE_INCOMPLETE"
      ) {
        redirect();
        return true;
      }
      return false;
    },
    [redirect],
  );

  return {
    /** True once we know the profile is not ready. */
    requiresProfileCompletion: incomplete,
    redirectToCompletion: redirect,
    checking: isLoading,
    afterAccepted,
    guard,
    handleError,
  };
}
