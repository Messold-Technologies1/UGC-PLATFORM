"use client";

import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser } from "./use-me-query";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  user: AuthUser;
};

async function registerAccount(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>(
    ENDPOINTS.AUTH.REGISTER,
    payload,
  );
  return data;
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: registerAccount,
  });
}
