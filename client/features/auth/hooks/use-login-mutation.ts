"use client";

import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser } from "./use-me-query";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user: AuthUser;
};

async function loginWithPassword(
  payload: LoginPayload,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, payload);
  return data;
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: loginWithPassword,
  });
}
