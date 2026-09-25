"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
import type {
  AdminWithdrawal,
  WalletWithdrawalStatus,
} from "@/features/wallet/types";

const PAGE_SIZE = 10;

function inr(paise: number): string {
  return "₹" + Math.round(paise / 100).toLocaleString("en-IN");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type TabKey = WalletWithdrawalStatus | "ALL";

const TAB_DEFS: { value: TabKey; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "REQUESTED", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
];

function WithdrawalRow({ w }: { w: AdminWithdrawal }) {
  const completeMutation = useCompleteWithdrawalMutation();
  const rejectMutation = useRejectWithdrawalMutation();
  return (
    <tr className="border-t border-border/30">
      <td className="px-4 py-3 font-medium">{w.brandName ?? "—"}</td>
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
          <span className="block text-xs italic">Admin: {w.adminNote}</span>
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
  );
}

export default function AdminRefundsPage() {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.canManageAdmins);

  // One fetch of all requests — powers the counts, the tab filter and paging.
  const { data, isLoading, isError } = useAdminWithdrawals();
  const [tab, setTab] = useState<TabKey>("ALL");
  const [page, setPage] = useState(1);

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-20 text-center text-sm text-muted-foreground">
          You don&apos;t have access to refund management. Only designated
          super-admins can process credit refunds.
        </div>
      </div>
    );
  }

  const all = data ?? [];
  const counts: Record<string, number> = {
    ALL: all.length,
    REQUESTED: all.filter((w) => w.status === "REQUESTED").length,
    COMPLETED: all.filter((w) => w.status === "COMPLETED").length,
    REJECTED: all.filter((w) => w.status === "REJECTED").length,
  };

  const filtered = tab === "ALL" ? all : all.filter((w) => w.status === tab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (clampedPage - 1) * PAGE_SIZE,
    clampedPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-5 p-8">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as TabKey);
          setPage(1);
        }}
      >
        <TabsList>
          {TAB_DEFS.map((t) => {
            const count = counts[t.value];
            const highlight = t.value === "REQUESTED" && count > 0;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                {t.label}
                {count > 0 && (
                  <span
                    className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                      highlight
                        ? "bg-red-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TAB_DEFS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
                Could not load refund requests.
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
                No refund requests here.
              </div>
            ) : (
              <>
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
                        <WithdrawalRow key={w.id} w={w} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Page {clampedPage} of {totalPages} · {filtered.length}{" "}
                      {filtered.length === 1 ? "request" : "requests"}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        disabled={clampedPage <= 1}
                        onClick={() => setPage(clampedPage - 1)}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        disabled={clampedPage >= totalPages}
                        onClick={() => setPage(clampedPage + 1)}
                        aria-label="Next page"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
