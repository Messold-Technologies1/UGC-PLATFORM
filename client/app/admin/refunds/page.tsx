"use client";

import { useState } from "react";

import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useAdminWithdrawals,
  useCompleteWithdrawalMutation,
  useRejectWithdrawalMutation,
} from "@/features/wallet/hooks";
import type { WalletWithdrawalStatus } from "@/features/wallet/types";

function inr(paise: number): string {
  return "₹" + Math.round(paise / 100).toLocaleString("en-IN");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const STATUS_TABS: { value: WalletWithdrawalStatus | "ALL"; label: string }[] = [
  { value: "REQUESTED", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

function WithdrawalsTable({
  status,
}: {
  status: WalletWithdrawalStatus | "ALL";
}) {
  const { data, isLoading, isError } = useAdminWithdrawals(
    status === "ALL" ? undefined : status,
  );
  const completeMutation = useCompleteWithdrawalMutation();
  const rejectMutation = useRejectWithdrawalMutation();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
        Could not load refund requests.
      </div>
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
        No refund requests here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Brand</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Balance</th>
            <th className="px-4 py-3">Requested</th>
            <th className="px-4 py-3">Note</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id} className="border-t border-border/30">
              <td className="px-4 py-3 font-medium">
                {w.brandName ?? "—"}
              </td>
              <td className="px-4 py-3 font-semibold">{inr(w.amountPaise)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {inr(w.brandBalancePaise)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(w.createdAt)}
              </td>
              <td className="max-w-[220px] px-4 py-3 text-muted-foreground">
                {w.brandNote ?? "—"}
                {w.adminNote ? (
                  <span className="block text-xs italic">
                    Admin: {w.adminNote}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                  {w.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {w.status === "REQUESTED" ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      disabled={completeMutation.isPending}
                      onClick={() => {
                        const adminNote =
                          window.prompt(
                            "Optional note (e.g. paid via bank transfer):",
                          ) ?? undefined;
                        completeMutation.mutate({ id: w.id, adminNote });
                      }}
                    >
                      Mark paid
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      disabled={rejectMutation.isPending}
                      onClick={() => {
                        const adminNote = window.prompt("Reason for rejection:");
                        if (adminNote === null) return;
                        rejectMutation.mutate({ id: w.id, adminNote });
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminRefundsPage() {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.canManageAdmins);
  const [tab, setTab] = useState<WalletWithdrawalStatus | "ALL">("REQUESTED");

  if (!isSuperAdmin) {
    return (
      <div className="space-y-8 p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Refunds
        </h1>
        <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-20 text-center text-sm text-muted-foreground">
          You don&apos;t have access to refund management. Only designated
          super-admins can process credit refunds.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Refunds
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Brand requests to withdraw store credit to real money. The amount is
          already held from the brand&apos;s balance — pay it off-platform, then
          mark it paid. Rejecting returns the money to their credits.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as WalletWithdrawalStatus | "ALL")}
      >
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {STATUS_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <WithdrawalsTable status={t.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
