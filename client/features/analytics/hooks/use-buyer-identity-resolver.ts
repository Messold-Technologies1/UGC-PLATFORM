"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import {
  agencyProfileMeQueryKey,
  fetchAgencyProfileMe,
} from "@/features/agency/api/fetch-agency-profile-me";
import {
  brandProfileStateQueryKey,
  fetchBrandProfileState,
} from "@/features/brands/api/fetch-brand-profile-state";
import { authMeQueryKey, fetchAuthMe } from "@/features/auth/hooks/use-me-query";
import { buyerWorkspaceBaseForUser } from "@/features/auth/lib/buyer-workspace-path";
import {
  BUYER_PROFILE_STALE_MS,
  type BuyerIdentity,
} from "../lib/buyer-pixel-events";

/**
 * Resolve the acting brand/agency for a pixel event, at the moment the event
 * fires rather than on every render.
 *
 * `SaveToWishlistButton` renders once per creator card, so a subscribing
 * `useQuery` here would mean one observer per card for a value only needed on
 * click. `fetchQuery` reads the shared cache instead — no observer, no
 * re-render, and no request at all while the profile is fresh. Reading rather
 * than subscribing also means a click never races a half-loaded query: the
 * viewer is awaited here, not sampled from whatever had rendered.
 *
 * Returns null when the viewer is not a signed-in brand or agency — some of
 * these screens are also public (a shared shortlist), and an anonymous visitor
 * is not part of the buyer funnel. Never rejects: a profile that can't be read
 * yields a name-less identity, so analytics can't break the flow it reports on.
 */
export function useBuyerIdentityResolver(): () => Promise<BuyerIdentity | null> {
  const queryClient = useQueryClient();
  const pathname = usePathname();

  return useCallback(async (): Promise<BuyerIdentity | null> => {
    let user: Awaited<ReturnType<typeof fetchAuthMe>> = null;
    try {
      user = await queryClient.fetchQuery({
        queryKey: authMeQueryKey,
        queryFn: fetchAuthMe,
        staleTime: BUYER_PROFILE_STALE_MS,
      });
    } catch {
      return null;
    }
    const isBuyer =
      user?.roles?.some((role) => role === "BRAND" || role === "AGENCY") ??
      false;
    if (!user || !isBuyer) return null;

    const accountType =
      buyerWorkspaceBaseForUser(pathname, user) === "/agency"
        ? "agency"
        : "brand";
    try {
      if (accountType === "agency") {
        const profile = await queryClient.fetchQuery({
          queryKey: agencyProfileMeQueryKey,
          queryFn: fetchAgencyProfileMe,
          staleTime: BUYER_PROFILE_STALE_MS,
        });
        return { accountType, accountName: profile.name?.trim() || null };
      }
      const state = await queryClient.fetchQuery({
        queryKey: brandProfileStateQueryKey,
        queryFn: fetchBrandProfileState,
        staleTime: BUYER_PROFILE_STALE_MS,
      });
      return {
        accountType,
        accountName:
          state.kind === "ready"
            ? state.profile.brandName?.trim() || null
            : null,
      };
    } catch {
      // Losing the breakdown beats losing the funnel step.
      return { accountType, accountName: null };
    }
  }, [pathname, queryClient]);
}
