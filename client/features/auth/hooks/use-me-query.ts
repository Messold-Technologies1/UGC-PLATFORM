"use client";

import { useQuery } from "@tanstack/react-query";
import api, { persistAuthMeSnapshot } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
export type WorkspaceRole = "CREATOR" | "BRAND" | "ADMIN" | "AGENCY";

export type CreatorApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SHORTLISTED"
  | "SELF_COMPLETED";

export type AccessibleBrandSummary = {
  id: string;
  brandName: string | null;
  logoUrl: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  roles: WorkspaceRole[];
  primaryRole: WorkspaceRole | null;
  hasCreatorProfile: boolean;
  /** Set when `roles` includes CREATOR; null if no creator profile yet. */
  creatorApprovalStatus?: CreatorApprovalStatus | null;
  /** Creator's one-way Go-Live latch. Drives the post-login redirect to finish setup. */
  creatorProfileComplete?: boolean;
  hasBrandProfile: boolean;
  hasAgencyProfile: boolean;
  brandAccessRevoked: boolean;
  activeBrandProfileId: string | null;
  accessibleBrands: AccessibleBrandSummary[];
  /** Whether this admin can open Settings and create other admin users. */
  canManageAdmins?: boolean;
};

export type MeResponse = {
  user: AuthUser;
};

export const authMeQueryKey = ["auth", "me"] as const;

export async function fetchAuthMe(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<MeResponse>(ENDPOINTS.AUTH.ME);
    const user = data.user ?? null;
    persistAuthMeSnapshot(user);
    return user;
  } catch {
    persistAuthMeSnapshot(null);
    return null;
  }
}

export function useMeQuery() {
  return useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchAuthMe,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}

/** Public pages (shared shortlists, creator profiles) — always re-fetch on mount. */
export function usePublicAuthUser(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchAuthMe,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
    enabled: options?.enabled ?? true,
  });
}
