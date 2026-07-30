"use client";

import { useMemo, useState } from "react";
import { X, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WishlistCreator } from "@/features/wishlists/api/types";
import type { BulkCheckoutItem } from "@/features/payments/api/create-bulk-checkout";
import { useWishlistBulkCheckout } from "@/features/payments/hooks/use-wishlist-bulk-checkout";

interface BulkCheckoutModalProps {
  onClose: () => void;
  creators: WishlistCreator[];
}

interface Row {
  included: boolean;
  addOnIds: string[];
}

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// A creator is orderable if they have a package with a price. The package id
// is NOT required here — it may be absent from the wishlist response, and the
// server resolves the creator's single package by creatorId at checkout.
function packageOf(creator: WishlistCreator) {
  const pkg = creator.packages?.[0];
  return pkg && pkg.priceAmount != null && pkg.priceAmount !== "" ? pkg : null;
}

export function BulkCheckoutModal({ onClose, creators }: BulkCheckoutModalProps) {
  const { isProcessing, startBulkCheckout } = useWishlistBulkCheckout();

  const orderable = useMemo(
    () => creators.filter((c) => packageOf(c) !== null),
    [creators],
  );
  const notOrderable = useMemo(
    () => creators.filter((c) => packageOf(c) === null),
    [creators],
  );

  const [selection, setSelection] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      orderable.map((c) => {
        const validAddOnIds = (c.selectedAddOnIds ?? []).filter((id) =>
          (c.addOns ?? []).some((a) => a.id === id),
        );
        return [c.id, { included: true, addOnIds: validAddOnIds }];
      }),
    ),
  );

  const toggleInclude = (creatorId: string) =>
    setSelection((prev) => ({
      ...prev,
      [creatorId]: { ...prev[creatorId], included: !prev[creatorId].included },
    }));

  const toggleAddOn = (creatorId: string, addOnId: string) =>
    setSelection((prev) => {
      const row = prev[creatorId];
      const addOnIds = row.addOnIds.includes(addOnId)
        ? row.addOnIds.filter((id) => id !== addOnId)
        : [...row.addOnIds, addOnId];
      return { ...prev, [creatorId]: { ...row, addOnIds } };
    });

  const subtotalFor = (creator: WishlistCreator): number => {
    const pkg = packageOf(creator);
    if (!pkg) return 0;
    const base = Number(pkg.priceAmount) || 0;
    const row = selection[creator.id];
    const addOnTotal = (creator.addOns ?? [])
      .filter((a) => row?.addOnIds.includes(a.id))
      .reduce((sum, a) => sum + (Number(a.priceAmount) || 0), 0);
    return base + addOnTotal;
  };

  const includedCreators = orderable.filter((c) => selection[c.id]?.included);
  const grandTotal = includedCreators.reduce((sum, c) => sum + subtotalFor(c), 0);

  const handlePay = async () => {
    const items: BulkCheckoutItem[] = includedCreators
      .map((c): BulkCheckoutItem | null => {
        const pkg = packageOf(c);
        if (!pkg) return null;
        return {
          creatorId: c.id,
          // Send the package id when we have it; the server resolves the
          // creator's single package when it's omitted.
          ...(pkg.id ? { packageId: pkg.id } : {}),
          addOnIds: selection[c.id]?.addOnIds ?? [],
        };
      })
      .filter((x): x is BulkCheckoutItem => x !== null);
    if (items.length === 0) return;
    await startBulkCheckout(items);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={isProcessing ? undefined : onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Checkout creators</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              One payment places a separate order for each selected creator.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {orderable.map((creator) => {
            const pkg = packageOf(creator)!;
            const row = selection[creator.id];
            const included = row?.included ?? false;
            return (
              <div
                key={creator.id}
                className={`rounded-xl border p-4 transition-colors ${
                  included ? "border-border bg-white" : "border-border/50 bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex flex-1 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() => toggleInclude(creator.id)}
                      disabled={isProcessing}
                      className="mt-1 size-4"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {creator.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.name} · {pkg.deliveryDays} day
                        {pkg.deliveryDays === 1 ? "" : "s"}
                      </p>
                    </div>
                  </label>
                  <div className="whitespace-nowrap text-right text-sm font-semibold">
                    {inr(subtotalFor(creator))}
                  </div>
                </div>

                {included && (creator.addOns?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-border/40 pl-7 pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Add-ons
                    </p>
                    {(creator.addOns ?? []).map((addOn) => (
                      <label
                        key={addOn.id}
                        className="flex cursor-pointer items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row?.addOnIds.includes(addOn.id) ?? false}
                            onChange={() => toggleAddOn(creator.id, addOn.id)}
                            disabled={isProcessing}
                            className="size-3.5"
                          />
                          <span className="text-foreground">{addOn.name}</span>
                        </span>
                        <span className="text-muted-foreground">
                          +{inr(Number(addOn.priceAmount) || 0)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {notOrderable.length > 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              {notOrderable.length} creator
              {notOrderable.length === 1 ? "" : "s"} in this wishlist{" "}
              {notOrderable.length === 1 ? "has" : "have"} no purchasable package
              yet and can&apos;t be checked out.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border p-5">
          <div>
            <p className="text-xs text-muted-foreground">
              {includedCreators.length} order
              {includedCreators.length === 1 ? "" : "s"}
            </p>
            <p className="text-lg font-bold text-foreground">{inr(grandTotal)}</p>
          </div>
          <Button
            onClick={handlePay}
            disabled={includedCreators.length === 0 || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingBag className="size-4" />
            )}
            {isProcessing ? "Processing..." : `Pay ${inr(grandTotal)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
