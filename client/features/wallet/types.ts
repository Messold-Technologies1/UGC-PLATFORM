// Store-credit ("Credits") client types. Mirror the server DTOs. Amounts are
// integer paise, INR.

export type WalletTransactionType =
  | "ORDER_CANCELLATION_CREDIT"
  | "ORDER_CHECKOUT_DEBIT"
  | "CHECKOUT_REVERSAL_CREDIT"
  | "WITHDRAWAL_DEBIT"
  | "WITHDRAWAL_REVERSAL_CREDIT"
  | "ADMIN_ADJUSTMENT_CREDIT"
  | "ADMIN_ADJUSTMENT_DEBIT"
  | "ORDER_COMPLETION_CREDIT";

export type WalletWithdrawalStatus =
  | "REQUESTED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export interface WalletBalance {
  /** Total credit owned (spendable + held), in paise. */
  balancePaise: number;
  /** Locked by pending withdrawal requests, in paise. */
  heldPaise: number;
  /** Reward credit inside the balance: spendable at checkout, never refundable. */
  promoPaise: number;
  /** Spendable now (balance - held), in paise. Reward credit included. */
  availablePaise: number;
  /** Withdrawable now (balance - held - reward), in paise. */
  refundablePaise: number;
  currency: string;
  /** Alias of heldPaise, kept for existing callers. */
  pendingWithdrawalPaise: number;
}

export interface WalletTransaction {
  id: string;
  /** Signed: positive credit, negative debit. */
  amountPaise: number;
  balanceAfterPaise: number;
  /** Signed effect on the non-refundable reward balance; 0 for ordinary rows. */
  promoPaise: number;
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

/** A brand or agency credit position in the admin Credits list. */
export interface AdminBrandCredit {
  ownerType: "brand" | "agency";
  brandId: string | null;
  agencyId: string | null;
  brandName: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  /** Total credit owned (spendable + held), in paise. */
  balancePaise: number;
  /** Locked by pending withdrawal requests, in paise. */
  heldPaise: number;
  /** Reward credit inside the balance: spendable at checkout, never refundable. */
  promoPaise: number;
  /** Spendable now (balance - held), in paise. */
  availablePaise: number;
  /** Withdrawable now (balance - held - reward), in paise. */
  refundablePaise: number;
  currency: string;
  /** Last wallet movement; null if the owner has never held credit. */
  lastActivityAt: string | null;
}

export interface AdminBrandCreditsPage {
  items: AdminBrandCredit[];
  total: number;
  /** Sums across every match, not just the current page. */
  totalBalancePaise: number;
  totalHeldPaise: number;
  /** Platform-wide non-refundable reward liability. */
  totalPromoPaise: number;
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
    case "ORDER_COMPLETION_CREDIT":
      return "Order completed — reward credit";
    default:
      return type;
  }
}
