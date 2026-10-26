"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAgencySpendReport } from "@/features/agency/api/agency-brand-links";
import { formatINR } from "@/lib/format-currency";

/**
 * What this agency has spent inside one brand's account.
 *
 * Reconciliation, not accounting. Money always lands in the brand's wallet —
 * including a refund for an order the agency paid by card — so an agency that
 * fronts cash needs a record of what it funded to settle up off-platform.
 *
 * The split is the whole point: wallet credit was the brand's money already,
 * while the charged remainder is what someone actually paid at checkout.
 *
 * Rendered as an inset panel because it opens inside a row of the managed-brand
 * list, so it must read as part of that row rather than as a second card.
 */
export function AgencyBrandSpendReport({
  brandId,
  brandName,
}: {
  brandId: string;
  brandName: string | null;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["agency", "spend-report", brandId],
    queryFn: () => fetchAgencySpendReport(brandId),
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-muted/40 px-4 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="rounded-2xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        Couldn&apos;t load the spend report for {brandName ?? "this brand"}.
      </p>
    );
  }

  const paidAtCheckoutPaise = Math.max(
    0,
    data.chargedPaise - data.creditsAppliedPaise,
  );

  return (
    <div className="rounded-2xl bg-muted/40 px-4 py-3">
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">
            Orders
          </dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums">
            {data.orderCount}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">
            Their credits
          </dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums">
            {formatINR(data.creditsAppliedPaise / 100)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">
            Paid at checkout
          </dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums">
            {formatINR(paidAtCheckoutPaise / 100)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Total order value {formatINR(data.chargedPaise / 100)}. Refunds return
        to the brand&apos;s wallet, so settle up with them directly.
      </p>
    </div>
  );
}
