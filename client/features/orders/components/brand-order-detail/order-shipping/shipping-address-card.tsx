"use client";

import { AlertCircle, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CLARITY_MASK } from "@/lib/clarity";

interface ShippingAddressCardProps {
  /**
   * Creator's real shipping address (free-form, may span multiple lines).
   * Display name stays anonymized; phone is shown for courier contact.
   */
  shippingAddress?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
}

export function ShippingAddressCard({
  shippingAddress,
  phone,
  phoneVerified = false,
}: ShippingAddressCardProps) {
  const lines = (shippingAddress ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hasAddress = lines.length > 0;
  const phoneDisplay = phone?.trim() || null;

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h3 className="text-lg font-bold text-foreground">Shipping Address</h3>
        {hasAddress ? (
          <Badge
            variant="secondary"
            className="pointer-events-none rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            Verified by creator
          </Badge>
        ) : null}
      </div>

      <div className="space-y-4 px-6 pb-6">
        {hasAddress ? (
          <div className="space-y-1" {...CLARITY_MASK}>
            {lines.map((line, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            The creator hasn&apos;t added a shipping address yet. It will appear
            here once they do.
          </p>
        )}

        {phoneDisplay ? (
          <div
            className="flex flex-wrap items-center gap-2"
            {...CLARITY_MASK}
          >
            <p className="text-sm font-medium text-foreground">
              Phone:{" "}
              <a
                href={`tel:${phoneDisplay.replace(/\s/g, "")}`}
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                {phoneDisplay}
              </a>
            </p>
            {phoneVerified ? (
              <Badge
                variant="secondary"
                className="pointer-events-none inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                <BadgeCheck className="size-3" aria-hidden />
                Verified
              </Badge>
            ) : null}
          </div>
        ) : null}

        {hasAddress ? (
          <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                <AlertCircle className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Important
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
                  Please ship the product to this address only. Any shipping
                  cost will not be reimbursed.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
