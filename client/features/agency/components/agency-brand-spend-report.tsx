"use client";

import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
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
      <div className="py-4">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="py-2 text-sm text-[#b91c1c]">
        Couldn&apos;t load the spend report.
      </p>
    );
  }

  const paidAtCheckoutPaise = Math.max(
    0,
    data.chargedPaise - data.creditsAppliedPaise,
  );

  return (
    <div className="rounded-2xl border-2 border-[#181313] bg-white p-5">
      <h3 className="text-base font-bold text-[#111827]">
        Spent on {brandName ?? "this brand"}
      </h3>
      <p className="mt-1 text-sm text-[#6b7280]">
        Orders you placed inside their account. Refunds and completion credits
        always return to their wallet, so use this to settle up with them.
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Orders placed
          </dt>
          <dd className="mt-1 text-2xl font-bold text-[#111827]">
            {data.orderCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Covered by their credits
          </dt>
          <dd className="mt-1 text-2xl font-bold text-[#111827]">
            {formatINR(data.creditsAppliedPaise / 100)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Paid at checkout
          </dt>
          <dd className="mt-1 text-2xl font-bold text-[#111827]">
            {formatINR(paidAtCheckoutPaise / 100)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-[#6b7280]">
        Total order value {formatINR(data.chargedPaise / 100)}.
      </p>
    </div>
  );
}
