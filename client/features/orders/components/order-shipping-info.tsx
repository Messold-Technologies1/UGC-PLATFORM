"use client";

import { ClipboardList, Clock3, MapPin, RotateCcw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  OrderBrandSnapshot,
  OrderCreatorSnapshot,
  OrderDetailsPublic,
} from "../api/types";

interface OrderShippingInfoProps {
  role?: "brand" | "creator";
  order?: OrderDetailsPublic;
  creator?: OrderCreatorSnapshot;
  brand?: OrderBrandSnapshot;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available yet";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OrderShippingInfo({
  role = "brand",
  order,
  creator,
  brand,
}: OrderShippingInfoProps) {
  if (!order) {
    return (
      <section className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="mb-1 text-lg font-bold text-card-foreground">
                Shipping Information
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                The creator needs the physical product to start filming. Ensure the
                package is dispatched within 48 hours.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Button
              variant="outline"
              className="rounded-xl border-border/60 font-semibold shadow-sm"
            >
              Mark as Shipped
            </Button>
          </div>
        </div>
        <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Creator Shipping Address
            </span>
          </div>
          <div className="text-sm font-medium leading-relaxed text-card-foreground">
            Riya Sharma
            <br />
            Apt 4B, Emerald Heights, Linking Road
            <br />
            Mumbai, MH 400050
            <br />
            India
          </div>
        </div>
      </section>
    );
  }

  const partnerLabel = role === "creator" ? "Brand" : "Creator Base";
  const partnerValue =
    role === "creator" ? brand?.brandName || "Brand partner" : creator?.city || "Remote";

  return (
    <section className="bg-card rounded-3xl p-6 md:p-8 border shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="mb-1 text-lg font-bold text-card-foreground">
              Order Scope
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Snapshot details captured at checkout for this collaboration.
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 md:w-auto">
          <div className="rounded-2xl border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Clock3 className="w-3.5 h-3.5" />
              Delivery Window
            </div>
            <p className="mt-2 text-sm font-semibold text-card-foreground">
              {order.deliveryDaysSnapshot} day
              {order.deliveryDaysSnapshot === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-2xl border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
              Revisions
            </div>
            <p className="mt-2 text-sm font-semibold text-card-foreground">
              {order.revisionCount} used / {order.maxRevisionsSnapshot} included
            </p>
          </div>
          <div className="rounded-2xl border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              {partnerLabel}
            </div>
            <p className="mt-2 text-sm font-semibold text-card-foreground">
              {partnerValue}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Deliverables Snapshot
            </span>
          </div>
          <div className="space-y-2">
            {order.deliverablesSnapshot.length > 0 ? (
              order.deliverablesSnapshot.map((deliverable) => (
                <div
                  key={deliverable}
                  className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-sm font-medium text-card-foreground"
                >
                  {deliverable}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No deliverables snapshot was provided for this order.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/20 p-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            Timeline
          </span>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-semibold text-card-foreground">
                {formatDate(order.createdAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-semibold text-card-foreground">
                {formatDate(order.paidAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Brief submitted</dt>
              <dd className="font-semibold text-card-foreground">
                {formatDate(order.briefSubmittedAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Target deadline</dt>
              <dd className="font-semibold text-card-foreground">
                {formatDate(order.deliveryDeadlineAt)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
