"use client";

import { useMemo, useState } from "react";
import { Gift, Search } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAdminCreatorsQuery } from "../hooks/use-admin-creators-query";
import { useFirstOrderFreeMutation } from "../hooks/use-first-order-free-mutation";

/**
 * Super-admin control (lives on the Coupons page): pick listed creators whose
 * FIRST order for each brand is free. At checkout the brand pays ₹0, the order
 * is placed without Razorpay, and the creator is paid ₹0. Each brand gets one
 * free order per enabled creator; the next order with them is a normal paid one.
 */
export function FirstOrderFreeCreatorsSection() {
  const [searchInput, setSearchInput] = useState("");
  const search = searchInput.trim();

  const { data, isLoading, isError } = useAdminCreatorsQuery({
    segment: "listed",
    page: 1,
    limit: 20,
    ...(search ? { search } : {}),
  });
  const mutation = useFirstOrderFreeMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const creators = useMemo(() => data?.items ?? [], [data]);

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
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`fof-skeleton-${index}`}
              className="h-14 w-full rounded-xl"
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
          {search
            ? "No listed creators match your search."
            : "No listed creators yet."}
        </div>
      )}

      {!isLoading && !isError && creators.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/40 shadow-sm">
          <ul className="divide-y divide-border/20">
            {creators.map((creator) => {
              const enabled = creator.firstOrderFreeEnabled;
              const isPending = pendingId === creator.id && mutation.isPending;
              return (
                <li
                  key={creator.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
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
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">
                        {creator.displayName}
                      </div>
                      {creator.city && (
                        <div className="truncate text-xs text-muted-foreground">
                          {creator.city}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        enabled
                          ? "text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                          : "text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {enabled ? "First order free" : "Off"}
                    </span>
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
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
