"use client";

import type { OrderDetailsPublic } from "../api/types";

interface OrderFinancialSummaryProps {
  order?: OrderDetailsPublic;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value);
}

export function OrderFinancialSummary({
  order,
}: OrderFinancialSummaryProps) {
  if (!order) {
    return (
      <section className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
        <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Financial Summary
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Base Deliverable</span>
            <span className="font-semibold text-card-foreground">$450.00</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Usage Rights (12m)</span>
            <span className="font-semibold text-card-foreground">$125.00</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Platform Fee</span>
            <span className="font-semibold text-card-foreground">$28.75</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t pt-5">
            <span className="font-bold text-card-foreground">Total Amount</span>
            <span className="text-2xl font-black">
              $603.75
            </span>
          </div>
        </div>
      </section>
    );
  }

  const packageAmount = Number.parseFloat(order.priceAmountSnapshot) || 0;
  const addOnsTotal = Number.parseFloat(order.addOnsTotalSnapshot ?? "0") || 0;
  const totalAmount = order.expectedAmountPaise / 100;

  return (
    <section className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
      <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Financial Summary
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-muted-foreground">
            {order.packageNameSnapshot}
          </span>
          <span className="text-right font-semibold text-card-foreground">
            {formatMoney(packageAmount, order.currency)}
          </span>
        </div>

        {order.addOnsSnapshot.map((addOn) => (
          <div
            key={addOn.id}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="font-medium text-muted-foreground">{addOn.name}</span>
            <span className="text-right font-semibold text-card-foreground">
              {formatMoney(Number.parseFloat(addOn.priceAmount) || 0, order.currency)}
            </span>
          </div>
        ))}

        {order.addOnsSnapshot.length === 0 ? (
          <div className="rounded-2xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            No add-ons were selected for this order.
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-muted-foreground">Add-ons total</span>
            <span className="text-right font-semibold text-card-foreground">
              {formatMoney(addOnsTotal, order.currency)}
            </span>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t pt-5">
          <span className="font-bold text-card-foreground">Total Amount</span>
          <span className="text-2xl font-black">
            {formatMoney(totalAmount, order.currency)}
          </span>
        </div>
      </div>
    </section>
  );
}
