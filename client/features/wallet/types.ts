// Store-credit ("Credits") client types. Mirror the server DTOs. Amounts are
// integer paise, INR.

export type WalletTransactionType =
  | "ORDER_CANCELLATION_CREDIT"
  | "ORDER_CHECKOUT_DEBIT"
  | "CHECKOUT_REVERSAL_CREDIT"
  | "WITHDRAWAL_DEBIT"
  | "WITHDRAWAL_REVERSAL_CREDIT"
  | "ADMIN_ADJUSTMENT_CREDIT"
  | "ADMIN_ADJUSTMENT_DEBIT";

export type WalletWithdrawalStatus =
  | "REQUESTED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export interface WalletBalance {
  balancePaise: number;
  currency: string;
  /** Sum of pending withdrawal requests, in paise (already debited). */
  pendingWithdrawalPaise: number;
}

export interface WalletTransaction {
  id: string;
  /** Signed: positive credit, negative debit. */
  amountPaise: number;
  balanceAfterPaise: number;
  type: WalletTransactionType;
  reason: string | null;
  orderId: string | null;
  withdrawalId: string | null;
  createdAt: string;
}

export interface WalletWithdrawal {
  id: string;
  amountPaise: number;
  status: WalletWithdrawalStatus;
  brandNote: string | null;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface AdminWithdrawal extends WalletWithdrawal {
  brandId: string;
  brandName: string | null;
  brandBalancePaise: number;
}

export interface AdminBrandLedger {
  balance: WalletBalance;
  transactions: WalletTransaction[];
  withdrawals: WalletWithdrawal[];
}

/** Human-readable label for a ledger row's type. */
export function walletTransactionLabel(type: WalletTransactionType): string {
  switch (type) {
    case "ORDER_CANCELLATION_CREDIT":
      return "Order cancelled — credited";
    case "ORDER_CHECKOUT_DEBIT":
      return "Used at checkout";
    case "CHECKOUT_REVERSAL_CREDIT":
      return "Checkout reversed — returned";
    case "WITHDRAWAL_DEBIT":
      return "Withdrawal requested";
    case "WITHDRAWAL_REVERSAL_CREDIT":
      return "Withdrawal returned";
    case "ADMIN_ADJUSTMENT_CREDIT":
      return "Adjustment — added";
    case "ADMIN_ADJUSTMENT_DEBIT":
      return "Adjustment — removed";
    default:
      return type;
  }
}
