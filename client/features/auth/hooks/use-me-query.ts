"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

/** Matches Nest `UserResponseDto` from `GET /api/auth/me`. */
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type MeResponse = {
  user: AuthUser;
};

export const authMeQueryKey = ["auth", "me"] as const;

export async function fetchAuthMe(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<MeResponse>(ENDPOINTS.AUTH.ME);
    return data.user ?? null;
  } catch {
    return null;
  }
}

export function useMeQuery() {
  return useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchAuthMe,
    staleTime: 60_000,
    retry: false,
  });
}
