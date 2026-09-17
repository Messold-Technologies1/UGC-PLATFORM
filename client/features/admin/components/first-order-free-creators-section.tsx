"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Gift, Search } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useFirstOrderFreeCreatorsQuery } from "../hooks/use-first-order-free-creators-query";
import { useFirstOrderFreeMutation } from "../hooks/use-first-order-free-mutation";

/** Cards per page when browsing (a multiple of 4 so the grid stays even). */
const PAGE_SIZE = 24;
/** Search is not paginated — pull a generous single page of matches. */
const SEARCH_SIZE = 50;

/**
 * Super-admin control (a tab on the Coupons page): pick listed creators whose
 * FIRST order for each brand is free. At checkout the brand pays ₹0, the order
 * is placed without Razorpay, and the creator is paid ₹0. Each brand gets one
 * free order per enabled creator; the next order with them is a normal paid one.
 *
 * The browse list is server-paginated (4-up card grid). Search queries across
 * all listed creators independently of the page, so typing resets to a single
 * un-paginated result set.
 */
export function FirstOrderFreeCreatorsSection() {
  const [searchInput, setSearchInput] = useState("");
  const search = searchInput.trim();
  const isSearching = search.length > 0;
  const [page, setPage] = useState(1);

  // A new search is its own view — drop back to the first (and only) result set.
  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading, isError, isFetching } =
    useFirstOrderFreeCreatorsQuery({
      page: isSearching ? 1 : page,
      limit: isSearching ? SEARCH_SIZE : PAGE_SIZE,
      ...(isSearching ? { search } : {}),
    });
  const mutation = useFirstOrderFreeMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const creators = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleToggle = async (id: string, enabled: boolean) => {
    setPendingId(id);
    try {
      await mutation.mutateAsync({ id, enabled });
    } catch {
      // hook toasts on error
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Gift className="size-5 text-primary" />
          First order free creators
        </h2>
        <p className="text-sm text-muted-foreground">
          Each brand&apos;s first order with an enabled creator is free — brand
          pays ₹0, no payment step, and the creator is paid ₹0. The next order
          with that creator is a normal paid checkout.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search listed creators by name"
          className="glass-input w-full rounded-lg bg-background/50 py-2 pl-9 pr-3 text-sm"
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`fof-skeleton-${index}`}
              className="h-14 w-full rounded-2xl"
            />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
          We could not load creators right now. Try again shortly.
        </div>
      )}

      {!isLoading && !isError && creators.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {isSearching
            ? "No listed creators match your search."
            : "No listed creators yet."}
        </div>
      )}

      {!isLoading && !isError && creators.length > 0 && (
        <>
          <div
            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
              isFetching ? "opacity-60 transition-opacity" : ""
            }`}
          >
            {creators.map((creator) => {
              const enabled = creator.firstOrderFreeEnabled;
              const isPending = pendingId === creator.id && mutation.isPending;
              const category = creator.primaryCategory?.trim() || null;
              return (
                <div
                  key={creator.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 px-3 py-2.5 shadow-sm transition-colors hover:bg-muted/20"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {creator.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={creator.profileImageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {creator.displayName?.slice(0, 1).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-semibold text-foreground">
                      {creator.displayName}
                    </span>
                    {category ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {category}
                      </span>
                    ) : null}
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={isPending}
                    onCheckedChange={(checked) =>
                      handleToggle(creator.id, checked)
                    }
                    aria-label={
                      enabled
                        ? "Disable first order free"
                        : "Enable first order free"
                    }
                  />
                </div>
              );
            })}
          </div>

          {!isSearching && totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} creator
                {total === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <ChevronLeft className="size-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isFetching}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
