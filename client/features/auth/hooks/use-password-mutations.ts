"use client";

import { useMutation } from "@tanstack/react-query";
import {
  changePassword,
  forgotPassword,
  resetPassword,
} from "@/features/auth/api/password";

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload: { token: string; newPassword: string }) =>
      resetPassword(payload.token, payload.newPassword),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: changePassword,
  });
}
