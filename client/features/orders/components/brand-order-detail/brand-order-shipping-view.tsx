"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetOrderBriefQuery } from "@/features/orders/hooks/use-get-order-brief-query";
import { useGetBrandOrderDetailsQuery } from "../../hooks/use-get-brand-order-details-query";
import { useRouter } from "next/navigation";
import { OrderPageHeader } from "./order-page-header";
import { OrderProgressStepper } from "./order-progress-stepper";
import { CreatorProfileCard } from "./creator-profile-card";
import { OrderSummaryCard } from "./order-summary-card";
import { NeedHelpCard } from "./support-tips-card";
import { ShippingDetailsCard } from "./order-shipping/shipping-details-card";
import { ShippingTimelineCard } from "./order-shipping/shipping-timeline-card";
import { ShippingAddressCard } from "./order-shipping/shipping-address-card";
import { PaymentSecuredBanner } from "./payment-secured-banner";

import { InprogressShippingCard } from "./order-inProgress/inprogress-shipping-card";

interface BrandOrderShippingViewProps {
  orderId: string;
}

function BrandOrderShippingSkeleton() {
  return (
    <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-44" />
      </div>

      <Skeleton className="h-28 w-full rounded-2xl" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <Skeleton className="h-[450px] w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function BrandOrderShippingView({
  orderId,
}: BrandOrderShippingViewProps) {
  const { data, isLoading, isError, error } =
    useGetBrandOrderDetailsQuery(orderId);
  const { data: orderBriefData } = useGetOrderBriefQuery(orderId);
  const router = useRouter();

  const handleStepClick = (label: string) => {
    if (label === "Awaiting\nShipment") return;
    router.push(`/brand/orders/${orderId}?preview=${encodeURIComponent(label)}`);
  };

  if (isLoading) {
    return <BrandOrderShippingSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                Unable to load this order
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                {error?.message ||
                  "The brand order details request did not return usable data."}
              </p>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/brand/orders/${orderId}`}>
                  <ArrowLeft className="w-4 h-4" />
                  Back to order details
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { order, creator } = data;
  const briefId = order.briefId ?? orderBriefData?.brief?.id ?? null;

  // Once content is delivered (or later), leave the shipping page so the brand
  // sees the live delivered/completed UI without a manual refresh.
  useEffect(() => {
    const leaveShipping = [
      "DELIVERED",
      "REVISION_REQUESTED",
      "REVISION_SUBMITTED",
      "ACCEPTED",
      "CREATOR_PAYMENT_DONE",
    ];
    if (leaveShipping.includes(order.status)) {
      router.replace(`/brand/orders/${orderId}`);
    }
  }, [order.status, orderId, router]);

  return (
    <div className="w-full min-w-0 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-5">
      <OrderPageHeader orderId={orderId} paidAt={order.paidAt} />

      <OrderProgressStepper 
        order={order} 
        onStepClick={handleStepClick}
        previewState="Awaiting\nShipment"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <div className="flex flex-col gap-5 lg:col-span-8">
          {order.dispatchedAt ? (
            <InprogressShippingCard
              courierPartner={(order as any).courierName}
              trackingId={(order as any).trackingId}
              shippedAt={order.dispatchedAt}
              productReceivedAt={(order as any).productReceivedAt}
            />
          ) : (
            <ShippingDetailsCard
              orderId={orderId}
              creatorName={creator.displayName || "Creator"}
            />
          )}
          <ShippingTimelineCard />
          <PaymentSecuredBanner />
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-4">
          <CreatorProfileCard creator={creator} order={order} />
          <ShippingAddressCard shippingAddress={creator.shippingAddress} />
          <OrderSummaryCard order={order} orderId={orderId} briefId={briefId} brief={orderBriefData?.brief ?? null} />
          <NeedHelpCard />
        </aside>
      </div>
    </div>
  );
}
