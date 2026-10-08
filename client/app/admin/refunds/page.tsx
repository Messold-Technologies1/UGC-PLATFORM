"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useAdminBrandCredits,
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

type TabKey = WalletWithdrawalStatus | "ALL" | "CREDITS";

/** Not a withdrawal status — its own view, so it sits outside TAB_DEFS. */
const CREDITS_TAB: TabKey = "CREDITS";

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

function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

/**
 * Credit held across every brand.
 *
 * Three numbers per brand, never one: held money still sits inside the total
 * balance, so a lone "credits" figure overstates what a brand can actually
 * spend while a refund request of theirs is pending.
 */
function BrandCreditsPanel() {
  const [page, setPage] = useState(1);
  const [includeZero, setIncludeZero] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounced so typing a brand name doesn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError } = useAdminBrandCredits({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    includeZero,
    search,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/40 bg-card/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total credits outstanding
          </p>
          <p className="mt-1 text-xl font-bold">
            {inr(data?.totalBalancePaise ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Held for pending refunds
          </p>
          <p className="mt-1 text-xl font-bold">
            {inr(data?.totalHeldPaise ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Reward credits (not refundable)
          </p>
          <p className="mt-1 text-xl font-bold">
            {inr(data?.totalPromoPaise ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Buyers listed
          </p>
          <p className="mt-1 text-xl font-bold">{total}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search brand or agency"
            className="h-9 w-64 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={includeZero}
            onChange={(e) => {
              setIncludeZero(e.target.checked);
              setPage(1);
            }}
            className="size-4 rounded border-border"
          />
          Show buyers with no credits
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
          Could not load buyer credits.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
          {search
            ? "No buyer matches that name."
            : includeZero
              ? "No brands or agencies yet."
              : "No buyer is holding credits right now."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Total credits</th>
                  <th className="px-4 py-3">Held</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr
                    key={`${b.ownerType}:${b.brandId ?? b.agencyId}`}
                    className="border-t border-border/30"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {b.brandName?.trim() ||
                          (b.ownerType === "agency"
                            ? "Unnamed Agency"
                            : "Unnamed Brand")}
                      </span>
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {b.ownerType}
                      </span>
                      {b.contactEmail ? (
                        <span className="block text-xs text-muted-foreground">
                          {b.contactEmail}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {inr(b.balancePaise)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b.heldPaise > 0 ? inr(b.heldPaise) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b.promoPaise > 0 ? (
                        <span
                          title="Earned on completed orders: spendable at checkout, never refundable"
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
                        >
                          {inr(b.promoPaise)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {inr(b.availablePaise)}
                      {b.promoPaise > 0 ? (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {inr(b.refundablePaise)} refundable
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateOnly(b.lastActivityAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total}{" "}
                {total === 1 ? "buyer" : "buyers"}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
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
          <TabsTrigger value={CREDITS_TAB}>Brand Credits</TabsTrigger>
        </TabsList>

        <TabsContent value={CREDITS_TAB} className="mt-4">
          <BrandCreditsPanel />
        </TabsContent>

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
