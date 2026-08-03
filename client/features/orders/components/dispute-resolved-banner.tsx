"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderActiveDispute } from "@/features/orders/api/types";

interface DisputeResolvedBannerProps {
  dispute?: OrderActiveDispute | null;
  className?: string;
}

const RESOLVED_STATUSES = new Set([
  "RESOLVED_CONTINUE",
  "RESOLVED_CLOSED",
  "RESOLVED_REFUNDED",
]);

function fmtDateTime(val?: string | null): string | null {
  if (!val) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(val));
  } catch {
    return null;
  }
}

/**
 * Persistent notice shown across every order stage once a dispute has been
 * resolved by an admin, carrying the admin's resolution note. The order itself
 * has already returned to its previous flow — this is the trailing record.
 */
export function DisputeResolvedBanner({
  dispute,
  className,
}: DisputeResolvedBannerProps) {
  if (!dispute || !RESOLVED_STATUSES.has(dispute.status)) return null;

  const resolvedAt = fmtDateTime(dispute.resolvedAt);
  const raisedBy = dispute.openedBy === "BRAND" ? "the brand" : "the creator";

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shrink-0">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Dispute resolved</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            A dispute raised by {raisedBy} was resolved by our team
            {resolvedAt ? ` on ${resolvedAt}` : ""}.
          </p>
          {dispute.resolutionNotes ? (
            <div className="mt-3 rounded-md border border-emerald-200 dark:border-emerald-500/20 bg-background/60 p-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Resolution note
              </p>
              <p className="text-sm italic leading-relaxed text-foreground/80">
                &ldquo;{dispute.resolutionNotes}&rdquo;
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
