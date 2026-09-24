"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import {
  adjustBrandWallet,
  cancelWithdrawal,
  completeWithdrawal,
  getAdminBrandLedger,
  getAdminWithdrawals,
  getWalletBalance,
  getWalletTransactions,
  getWalletWithdrawals,
  rejectWithdrawal,
  requestWithdrawal,
} from "./api";
import type { WalletWithdrawalStatus } from "./types";

export const walletBalanceQueryKey = ["wallet", "balance"] as const;
export const walletTransactionsQueryKey = ["wallet", "transactions"] as const;
export const walletWithdrawalsQueryKey = ["wallet", "withdrawals"] as const;
export const adminWithdrawalsQueryKey = ["admin", "wallet", "withdrawals"] as const;
export const adminBrandLedgerQueryKey = (brandId: string) =>
  ["admin", "wallet", "brand", brandId] as const;

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
    if (Array.isArray(msg) && msg.length > 0) return msg.join(", ");
  }
  return fallback;
}

// ── Brand ────────────────────────────────────────────────────────────────────

export function useWalletBalance(enabled = true) {
  return useQuery({
    queryKey: walletBalanceQueryKey,
    queryFn: getWalletBalance,
    enabled,
  });
}

export function useWalletTransactions(enabled = true) {
  return useQuery({
    queryKey: walletTransactionsQueryKey,
    queryFn: () => getWalletTransactions(100),
    enabled,
  });
}

export function useWalletWithdrawals(enabled = true) {
  return useQuery({
    queryKey: walletWithdrawalsQueryKey,
    queryFn: getWalletWithdrawals,
    enabled,
  });
}

export function invalidateBrandWallet(
  qc: ReturnType<typeof useQueryClient>,
) {
  void qc.invalidateQueries({ queryKey: walletBalanceQueryKey });
  void qc.invalidateQueries({ queryKey: walletTransactionsQueryKey });
  void qc.invalidateQueries({ queryKey: walletWithdrawalsQueryKey });
}

export function useRequestWithdrawalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: () => toast.success("Refund request submitted"),
    onError: (err) =>
      toast.error(errorMessage(err, "Could not submit the refund request")),
    onSettled: () => invalidateBrandWallet(qc),
  });
}

export function useCancelWithdrawalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelWithdrawal,
    onSuccess: () => toast.success("Refund request cancelled"),
    onError: (err) =>
      toast.error(errorMessage(err, "Could not cancel the request")),
    onSettled: () => invalidateBrandWallet(qc),
  });
}

// ── Admin ──────────────────────────────────────────────────────────────────

export function useAdminWithdrawals(status?: WalletWithdrawalStatus) {
  return useQuery({
    queryKey: [...adminWithdrawalsQueryKey, status ?? "ALL"],
    queryFn: () => getAdminWithdrawals(status),
  });
}

export function useAdminBrandLedger(brandId: string, enabled = true) {
  return useQuery({
    queryKey: adminBrandLedgerQueryKey(brandId),
    queryFn: () => getAdminBrandLedger(brandId),
    enabled: enabled && Boolean(brandId),
  });
}

export function useCompleteWithdrawalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeWithdrawal,
    onSuccess: () => toast.success("Marked as paid"),
    onError: (err) =>
      toast.error(errorMessage(err, "Could not complete the withdrawal")),
    onSettled: () =>
      void qc.invalidateQueries({ queryKey: adminWithdrawalsQueryKey }),
  });
}

export function useRejectWithdrawalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rejectWithdrawal,
    onSuccess: () => toast.success("Withdrawal rejected — credit returned"),
    onError: (err) =>
      toast.error(errorMessage(err, "Could not reject the withdrawal")),
    onSettled: () =>
      void qc.invalidateQueries({ queryKey: adminWithdrawalsQueryKey }),
  });
}

export function useAdjustBrandWalletMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adjustBrandWallet,
    onSuccess: () => toast.success("Balance adjusted"),
    onError: (err) =>
      toast.error(errorMessage(err, "Could not adjust the balance")),
    onSettled: (_data, _err, variables) => {
      void qc.invalidateQueries({
        queryKey: adminBrandLedgerQueryKey(variables.brandId),
      });
    },
  });
}
