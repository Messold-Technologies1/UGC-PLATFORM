import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminBrandLedger,
  AdminWithdrawal,
  WalletBalance,
  WalletTransaction,
  WalletWithdrawal,
  WalletWithdrawalStatus,
} from "./types";

// ── Brand ("Credits") ────────────────────────────────────────────────────────

export async function getWalletBalance(): Promise<WalletBalance> {
  const { data } = await api.get<WalletBalance>(ENDPOINTS.WALLET.BALANCE);
  return data;
}

export async function getWalletTransactions(
  limit = 50,
): Promise<WalletTransaction[]> {
  const { data } = await api.get<WalletTransaction[]>(
    ENDPOINTS.WALLET.TRANSACTIONS,
    { params: { limit } },
  );
  return data;
}

export async function getWalletWithdrawals(): Promise<WalletWithdrawal[]> {
  const { data } = await api.get<WalletWithdrawal[]>(
    ENDPOINTS.WALLET.WITHDRAWALS,
  );
  return data;
}

export async function requestWithdrawal(payload: {
  amountPaise: number;
  brandNote?: string;
}): Promise<WalletWithdrawal> {
  const { data } = await api.post<WalletWithdrawal>(
    ENDPOINTS.WALLET.WITHDRAWALS,
    payload,
  );
  return data;
}

export async function cancelWithdrawal(id: string): Promise<WalletWithdrawal> {
  const { data } = await api.post<WalletWithdrawal>(
    ENDPOINTS.WALLET.CANCEL_WITHDRAWAL(id),
    {},
  );
  return data;
}

// ── Admin ("Refunds") ────────────────────────────────────────────────────────

export async function getAdminWithdrawals(
  status?: WalletWithdrawalStatus,
): Promise<AdminWithdrawal[]> {
  const { data } = await api.get<AdminWithdrawal[]>(
    ENDPOINTS.ADMIN.WALLET.WITHDRAWALS,
    { params: status ? { status } : undefined },
  );
  return data;
}

export async function completeWithdrawal(payload: {
  id: string;
  adminNote?: string;
}): Promise<WalletWithdrawal> {
  const { data } = await api.post<WalletWithdrawal>(
    ENDPOINTS.ADMIN.WALLET.COMPLETE_WITHDRAWAL(payload.id),
    { adminNote: payload.adminNote },
  );
  return data;
}

export async function rejectWithdrawal(payload: {
  id: string;
  adminNote?: string;
}): Promise<WalletWithdrawal> {
  const { data } = await api.post<WalletWithdrawal>(
    ENDPOINTS.ADMIN.WALLET.REJECT_WITHDRAWAL(payload.id),
    { adminNote: payload.adminNote },
  );
  return data;
}

export async function getAdminBrandLedger(
  brandId: string,
): Promise<AdminBrandLedger> {
  const { data } = await api.get<AdminBrandLedger>(
    ENDPOINTS.ADMIN.WALLET.BRAND_LEDGER(brandId),
  );
  return data;
}

export async function adjustBrandWallet(payload: {
  brandId: string;
  amountPaise: number;
  reason: string;
}): Promise<WalletBalance> {
  const { data } = await api.post<WalletBalance>(
    ENDPOINTS.ADMIN.WALLET.BRAND_ADJUST(payload.brandId),
    { amountPaise: payload.amountPaise, reason: payload.reason },
  );
  return data;
}
