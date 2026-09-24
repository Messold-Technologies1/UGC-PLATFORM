"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";

import {
  useCancelWithdrawalMutation,
  useRequestWithdrawalMutation,
  useWalletBalance,
  useWalletTransactions,
  useWalletWithdrawals,
} from "@/features/wallet/hooks";
import { walletTransactionLabel } from "@/features/wallet/types";

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

export default function BrandCreditsPage() {
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: transactions = [] } = useWalletTransactions();
  const { data: withdrawals = [] } = useWalletWithdrawals();
  const requestMutation = useRequestWithdrawalMutation();
  const cancelMutation = useCancelWithdrawalMutation();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const availableRupees = Math.floor((balance?.balancePaise ?? 0) / 100);
  const pendingRupees = Math.round((balance?.pendingWithdrawalPaise ?? 0) / 100);

  const pending = withdrawals.filter((w) => w.status === "REQUESTED");
  const history = withdrawals.filter((w) => w.status !== "REQUESTED");

  const submit = () => {
    const rupees = Number(amount);
    if (!Number.isFinite(rupees) || rupees <= 0) return;
    if (rupees > availableRupees) return;
    requestMutation.mutate(
      { amountPaise: Math.round(rupees * 100), brandNote: note || undefined },
      {
        onSuccess: () => {
          setShowForm(false);
          setAmount("");
          setNote("");
        },
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Wallet className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Credits</h1>
          <p className="text-sm text-muted-foreground">
            Store credit from cancelled orders. Use it at checkout, or request a
            refund to your bank.
          </p>
        </div>
      </div>

      {/* Balance card */}
      <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Available credits</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">
          {balanceLoading ? "…" : inr(balance?.balancePaise ?? 0)}
        </p>
        {pendingRupees > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {inr(balance?.pendingWithdrawalPaise ?? 0)} pending withdrawal
          </p>
        )}
        <div className="mt-4">
          {showForm ? (
            <div className="space-y-3 rounded-2xl bg-muted/40 p-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Amount to withdraw (max {inr(balance?.balancePaise ?? 0)})
                </label>
                <input
                  type="number"
                  min={1}
                  max={availableRupees}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="₹ amount"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Payout details / note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Bank / UPI details for the refund"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  disabled={
                    requestMutation.isPending ||
                    Number(amount) <= 0 ||
                    Number(amount) > availableRupees
                  }
                  onClick={submit}
                >
                  Submit request
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={availableRupees <= 0}
              onClick={() => setShowForm(true)}
            >
              Withdraw / Request refund
            </button>
          )}
        </div>
      </div>

      {/* Pending withdrawals */}
      {pending.length > 0 && (
        <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold">Pending refund requests</h2>
          <ul className="space-y-2">
            {pending.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-semibold">{inr(w.amountPaise)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDate(w.createdAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-muted-foreground underline disabled:opacity-50"
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
      <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">Transaction history</h2>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No credit activity yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {walletTransactionLabel(t.type)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.createdAt)}
                    {t.reason ? ` · ${t.reason}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      t.amountPaise >= 0
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-foreground"
                    }
                  >
                    {t.amountPaise >= 0 ? "+" : ""}
                    {inr(t.amountPaise)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bal {inr(t.balanceAfterPaise)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Completed / rejected history */}
      {history.length > 0 && (
        <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold">Refund request history</h2>
          <ul className="divide-y divide-border/40">
            {history.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{inr(w.amountPaise)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(w.createdAt)}
                    {w.adminNote ? ` · ${w.adminNote}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
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
