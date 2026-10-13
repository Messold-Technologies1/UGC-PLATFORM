"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  agencyProfileMeQueryKey,
  fetchAgencyProfileMe,
} from "@/features/agency/api/fetch-agency-profile-me";
import {
  brandProfileStateQueryKey,
  fetchBrandProfileState,
} from "@/features/brands/api/fetch-brand-profile-state";
import { useBuyerWorkspaceBase } from "@/features/auth/hooks/use-buyer-workspace-base";
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
 * re-render, and no request at all while the profile is fresh.
 *
 * Never rejects: a profile that can't be read yields a name-less identity, so
 * analytics can't break the flow it is reporting on.
 */
export function useBuyerIdentityResolver(): () => Promise<BuyerIdentity> {
  const queryClient = useQueryClient();
  const isAgency = useBuyerWorkspaceBase() === "/agency";

  return useCallback(async (): Promise<BuyerIdentity> => {
    const accountType = isAgency ? "agency" : "brand";
    try {
      if (isAgency) {
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
      return { accountType, accountName: null };
    }
  }, [isAgency, queryClient]);
}
