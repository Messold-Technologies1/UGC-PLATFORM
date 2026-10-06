"use client";

import { useQuery } from "@tanstack/react-query";
import {
  agencyProfileMeQueryKey,
  fetchAgencyProfileMe,
} from "@/features/agency/api/fetch-agency-profile-me";

export function useAgencyProfileMeQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: agencyProfileMeQueryKey,
    queryFn: fetchAgencyProfileMe,
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60_000,
    retry: false,
  });
}
