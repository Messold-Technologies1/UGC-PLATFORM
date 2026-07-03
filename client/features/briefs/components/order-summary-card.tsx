"use client";

import { useMemo } from "react";
import { Check, Info, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format-currency";
import type {
  OrderDetailsPublic,
  OrderCreatorSnapshot,
} from "@/features/orders/api/types";

interface OrderSummaryCardProps {
  orderData?: OrderDetailsPublic;
  creatorData?: OrderCreatorSnapshot;
  isLoading: boolean;
}

export function OrderSummaryCard({
  orderData,
  creatorData,
  isLoading,
}: OrderSummaryCardProps) {
  const pricing = useMemo(() => {
    const packagePrice = orderData ? Number(orderData.priceAmountSnapshot) : 0;
    const addOnsTotal = orderData?.addOnsTotalSnapshot
      ? Number(orderData.addOnsTotalSnapshot)
      : 0;
    const totalPaidPaise = orderData?.expectedAmountPaise ?? 0;
    const totalPaid = Math.round(totalPaidPaise / 100);
    const platformFee = totalPaid - packagePrice - addOnsTotal;

    return { packagePrice, addOnsTotal, totalPaid, platformFee };
  }, [orderData]);

  if (isLoading) {
    return <OrderSummarySkeleton />;
  }

  const { packagePrice, addOnsTotal, totalPaid, platformFee } = pricing;

  return (
    <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden bg-[#FAFBFC]">
      <div className="px-6 py-5">
        <h3 className="text-base font-bold mb-5">Order Summary</h3>

        <div className="flex items-center gap-3 mb-6">
          {creatorData?.profileImageUrl ? (
            <div
              className="size-12 rounded-full bg-cover bg-center shrink-0"
              style={{
                backgroundImage: `url('${creatorData.profileImageUrl}')`,
              }}
            />
          ) : (
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {(creatorData?.displayName ?? "C").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className="font-bold text-sm truncate block">
              {creatorData?.displayName ?? "Creator"}
            </span>
            {creatorData?.city && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {creatorData.city}
              </p>
            )}
          </div>
        </div>

        <Separator className="mb-4" />

        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-foreground/80 uppercase mb-2 tracking-wider">
              Package
            </h4>
            <div className="flex items-start justify-between text-sm font-medium">
              <span className="truncate pr-2">
                {orderData?.packageNameSnapshot ?? "Package"}
              </span>
              <span className="shrink-0">{formatINR(packagePrice)}</span>
            </div>
            {orderData?.deliverablesSnapshot &&
              orderData.deliverablesSnapshot.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {orderData.deliverablesSnapshot.map((d, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • {d}
                    </li>
                  ))}
                </ul>
              )}
          </div>

          {orderData?.addOnsSnapshot && orderData.addOnsSnapshot.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-foreground/80 uppercase mb-2 tracking-wider">
                Add-ons ({orderData.addOnsSnapshot.length})
              </h4>
              <div className="space-y-2">
                {orderData.addOnsSnapshot.map((addon) => (
                  <div
                    key={addon.id}
                    className="flex items-start justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                      <div className="flex size-4 shrink-0 items-center justify-center rounded bg-primary text-white">
                        <Check className="size-3" />
                      </div>
                      <span className="truncate">{addon.name}</span>
                    </div>
                    <span className="font-medium text-foreground shrink-0 pl-2">
                      {formatINR(Number(addon.priceAmount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-5" />

        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Package Price</span>
            <span>{formatINR(packagePrice)}</span>
          </div>
          {addOnsTotal > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Add-ons ({orderData?.addOnsSnapshot?.length ?? 0})</span>
              <span>{formatINR(addOnsTotal)}</span>
            </div>
          )}
          {platformFee > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                Platform Fee <Info className="size-3" />
              </span>
              <span>{formatINR(platformFee)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between font-extrabold text-lg pt-4 border-t">
          <span>Total Paid</span>
          <span>{formatINR(totalPaid)}</span>
        </div>
      </div>

      <div className="bg-primary/5 px-6 py-4 border-t border-primary/10">
        <div className="flex gap-3">
          <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-primary mb-1">
              Your payment is secure
            </h4>
            <p className="text-xs text-primary/80 leading-relaxed">
              The amount is held securely in escrow and will be released to the creator
              only after you approve the content.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OrderSummarySkeleton() {
  return (
    <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden bg-[#FAFBFC]">
      <div className="px-6 py-5 space-y-5">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <Skeleton className="h-3 w-16" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-12" />
          </div>
        </div>
        <div className="flex justify-between pt-4 border-t">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </Card>
  );
}
