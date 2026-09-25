"use client";

import { useState, type ComponentType } from "react";
import {
  ArrowDownLeft,
  Clock,
  Gift,
  Landmark,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import {
  useCancelWithdrawalMutation,
  useRequestWithdrawalMutation,
  useWalletBalance,
  useWalletTransactions,
  useWalletWithdrawals,
} from "@/features/wallet/hooks";
import {
  walletTransactionLabel,
  type WalletTransactionType,
  type WalletWithdrawalStatus,
} from "@/features/wallet/types";

function inr(paise: number): string {
  const sign = paise < 0 ? "−" : "";
  return sign + "₹" + Math.abs(Math.round(paise / 100)).toLocaleString("en-IN");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Icon + direction for a ledger row. */
function txnVisual(type: WalletTransactionType): {
  Icon: ComponentType<{ className?: string }>;
  isCredit: boolean;
} {
  switch (type) {
    case "ORDER_CANCELLATION_CREDIT":
      return { Icon: Gift, isCredit: true };
    case "CHECKOUT_REVERSAL_CREDIT":
    case "WITHDRAWAL_REVERSAL_CREDIT":
      return { Icon: RotateCcw, isCredit: true };
    case "ADMIN_ADJUSTMENT_CREDIT":
      return { Icon: Plus, isCredit: true };
    case "ORDER_CHECKOUT_DEBIT":
      return { Icon: ShoppingBag, isCredit: false };
    case "WITHDRAWAL_DEBIT":
      return { Icon: Landmark, isCredit: false };
    case "ADMIN_ADJUSTMENT_DEBIT":
      return { Icon: Minus, isCredit: false };
    default:
      return { Icon: Wallet, isCredit: false };
  }
}

const STATUS_BADGE: Record<WalletWithdrawalStatus, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

export default function BrandCreditsPage() {
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: transactions = [] } = useWalletTransactions();
  const { data: withdrawals = [] } = useWalletWithdrawals();
  const requestMutation = useRequestWithdrawalMutation();
  const cancelMutation = useCancelWithdrawalMutation();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [refundFull, setRefundFull] = useState(false);

  // Spendable now = total balance minus funds held for pending withdrawals.
  const availablePaise = balance?.availablePaise ?? 0;
  const availableRupees = Math.floor(availablePaise / 100);
  const heldPaise = balance?.heldPaise ?? 0;

  const pending = withdrawals.filter((w) => w.status === "REQUESTED");
  const history = withdrawals.filter((w) => w.status !== "REQUESTED");

  // Genuine credit received all-time — cancellation credits and admin top-ups
  // only (not withdrawal releases or checkout reversals, which are just money
  // coming back).
  const lifetimeCreditedPaise = transactions
    .filter(
      (t) =>
        t.type === "ORDER_CANCELLATION_CREDIT" ||
        t.type === "ADMIN_ADJUSTMENT_CREDIT",
    )
    .reduce((sum, t) => sum + t.amountPaise, 0);

  const enteredRupees = Number(amount);
  const hasEnteredAmount =
    !refundFull && amount.trim() !== "" && Number.isFinite(enteredRupees);
  const exceedsBalance = hasEnteredAmount && enteredRupees > availableRupees;
  const canSubmit =
    !requestMutation.isPending &&
    availablePaise > 0 &&
    (refundFull ||
      (hasEnteredAmount && enteredRupees > 0 && !exceedsBalance));

  const resetForm = () => {
    setShowForm(false);
    setAmount("");
    setNote("");
    setRefundFull(false);
  };

  const submit = () => {
    const amountPaise = refundFull
      ? availablePaise
      : Math.round(Number(amount) * 100);
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) return;
    if (amountPaise > availablePaise) return;
    requestMutation.mutate(
      { amountPaise, brandNote: note || undefined },
      { onSuccess: resetForm },
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
          Credits
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Store credit from cancelled orders — spend it at checkout, or withdraw
          it to your bank.
        </p>
      </div>

      {/* Balance hero card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#20242f] via-[#15181f] to-[#0c0e13] p-7 text-white shadow-xl sm:p-8">
        <Wallet
          className="pointer-events-none absolute -right-8 -top-8 size-44 text-white/[0.06]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">
              Available credits
            </p>
            <p className="mt-1.5 text-5xl font-extrabold tracking-tight tabular-nums">
              {balanceLoading && transactions.length === 0
                ? "…"
                : inr(availablePaise)}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/70">
              {heldPaise > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" /> {inr(heldPaise)} on hold
                </span>
              )}
              {lifetimeCreditedPaise > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Gift className="size-3.5" /> {inr(lifetimeCreditedPaise)}{" "}
                  credited all-time
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <ShoppingBag className="size-3.5" /> Use at checkout
              </span>
            </div>
          </div>

          {!showForm && (
            <button
              type="button"
              className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#15181f] shadow-sm transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={availableRupees <= 0}
              onClick={() => setShowForm(true)}
            >
              Withdraw / Request refund
            </button>
          )}
        </div>
      </div>

      {/* Withdraw form */}
      {showForm && (
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Landmark className="size-4 text-primary" />
            <h2 className="text-sm font-bold">Request a refund to your bank</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Refund the full amount
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Request {inr(availablePaise)} back to your bank
                </p>
              </div>
              <Switch
                checked={refundFull}
                onCheckedChange={(on) => {
                  setRefundFull(on);
                  if (on) setAmount(String(availableRupees));
                }}
                disabled={availableRupees <= 0}
                aria-label="Refund the full amount"
              />
            </div>

            <div>
              <label
                htmlFor="withdraw-amount"
                className="text-xs font-medium text-muted-foreground"
              >
                Amount to withdraw (max {inr(availablePaise)})
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>
                <input
                  id="withdraw-amount"
                  type="number"
                  min={1}
                  max={availableRupees}
                  value={refundFull ? String(availableRupees) : amount}
                  onChange={(e) => {
                    setRefundFull(false);
                    setAmount(e.target.value);
                  }}
                  disabled={refundFull}
                  aria-invalid={exceedsBalance || undefined}
                  aria-describedby={
                    exceedsBalance ? "withdraw-amount-error" : undefined
                  }
                  className={`w-full rounded-xl border bg-background py-2.5 pl-7 pr-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                    exceedsBalance
                      ? "border-destructive focus-visible:outline-destructive"
                      : "border-border"
                  }`}
                  placeholder="amount"
                />
              </div>
              {exceedsBalance ? (
                <p
                  id="withdraw-amount-error"
                  className="mt-1.5 text-xs font-medium text-destructive"
                  role="alert"
                >
                  This amount is more than your available balance of{" "}
                  {inr(availablePaise)}.
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Payout details / note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="Bank / UPI details for the refund"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
                disabled={!canSubmit}
                onClick={submit}
              >
                {requestMutation.isPending ? "Submitting…" : "Submit request"}
              </button>
              <button
                type="button"
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted/50"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending refund requests */}
      {pending.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-500/20 dark:bg-amber-500/5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Clock className="size-4 text-amber-600" /> Pending refund requests
          </h2>
          <ul className="space-y-2">
            {pending.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-2xl bg-background px-4 py-3 text-sm shadow-sm"
              >
                <div>
                  <span className="font-bold tabular-nums">
                    {inr(w.amountPaise)}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Requested {formatDate(w.createdAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(w.id)}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transaction history */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold">Transaction history</h2>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <Wallet className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No credit activity yet
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              When an order is cancelled, its amount lands here as store credit.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {transactions.map((t) => {
              const { Icon, isCredit } = txnVisual(t.type);
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                      isCredit
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {walletTransactionLabel(t.type)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(t.createdAt)}
                      {t.reason ? ` · ${t.reason}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        isCredit ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {t.amountPaise >= 0 ? "+" : ""}
                      {inr(t.amountPaise)}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Bal {inr(t.balanceAfterPaise)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Refund request history */}
      {history.length > 0 && (
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <ArrowDownLeft className="size-4 text-muted-foreground" /> Refund
            request history
          </h2>
          <ul className="divide-y divide-border/50">
            {history.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <p className="font-bold tabular-nums">{inr(w.amountPaise)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(w.createdAt)}
                    {w.adminNote ? ` · ${w.adminNote}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_BADGE[w.status]}`}
                >
                  {w.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
