"use client";

import { formatINR } from "@/lib/format-currency";
import {
  PLATFORM_FEE_RATE,
  calculateOrderEarningsPreview,
  type AddOnDraft,
} from "@/features/creators/hooks/creator-profile-form-utils";

type PackageEarningsBannerProps = {
  packagePriceAmount: string;
  selectedAddOnSlugs: string[];
  addOnDrafts: Record<string, AddOnDraft>;
};

export function PackageEarningsBanner({
  packagePriceAmount,
  selectedAddOnSlugs,
  addOnDrafts,
}: PackageEarningsBannerProps) {
  const platformFeePercent = Math.round(PLATFORM_FEE_RATE * 100);
  const selectedAddOnPrices = selectedAddOnSlugs.map(
    (slug) => addOnDrafts[slug]?.priceAmount ?? "",
  );
  const preview = calculateOrderEarningsPreview({
    packagePriceAmount,
    selectedAddOnPrices,
  });

  if (!preview) {
    return (
      <div
        className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
        role="status"
      >
        GoCollab takes {platformFeePercent}% of the complete order value (base
        package + add-ons). Enter a package price to see your estimated payout.
      </div>
    );
  }

  const hasAddOns = preview.addOnsTotal > 0;

  return (
    <div
      className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
      role="status"
      aria-live="polite"
    >
      <p className="font-medium">
        Estimated payout when a brand books this package
      </p>
      <div className="mt-2 space-y-1 text-muted-foreground">
        <p>
          Total order value:{" "}
          <span className="font-medium text-foreground">
            {formatINR(preview.orderTotal)}
          </span>
          {hasAddOns ? (
            <span>
              {" "}
              ({formatINR(preview.packagePrice)} package +{" "}
              {formatINR(preview.addOnsTotal)} add-ons)
            </span>
          ) : null}
        </p>
        <p>
          GoCollab platform fee ({platformFeePercent}%):{" "}
          <span className="font-medium text-foreground">
            {formatINR(preview.platformFee)}
          </span>
        </p>
        <p className="text-foreground">
          You receive:{" "}
          <strong className="text-base">
            {formatINR(preview.creatorEarnings)}
          </strong>
        </p>
      </div>
    </div>
  );
}
