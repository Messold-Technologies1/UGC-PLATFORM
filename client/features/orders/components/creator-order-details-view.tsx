"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
// import { OrderChatWidget } from "@/features/orders/components/order-chat-widget";
import { OrderDeliveryStatus } from "@/features/orders/components/order-delivery-status";
import { OrderFinancialSummary } from "@/features/orders/components/order-financial-summary";
import { OrderHeader } from "@/features/orders/components/order-header";
import { OrderShippingInfo } from "@/features/orders/components/order-shipping-info";
import { useGetCreatorOrderDetailsQuery } from "../hooks/use-get-creator-order-details-query";

interface CreatorOrderDetailsViewProps {
  orderId: string;
}

function CreatorOrderDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <Skeleton className="h-5 w-48" />
      </div>

      <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-8">
          <Skeleton className="h-96 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>

        <aside className="flex flex-col gap-8 lg:col-span-4">
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </aside>
      </div>
    </div>
  );
}

export function CreatorOrderDetailsView({
  orderId,
}: CreatorOrderDetailsViewProps) {
  const { data, isLoading, isError, error } =
    useGetCreatorOrderDetailsQuery(orderId);

  if (isLoading) {
    return <CreatorOrderDetailsSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8">
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
                "The creator order details request did not return usable data."}
            </p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/creator/orders">
                <ArrowLeft className="w-4 h-4" />
                Back to orders
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <OrderHeader
        orderId={orderId}
        role="creator"
        order={data.order}
        brand={data.brand}
      />

      <div className="flex flex-col gap-8">
        <OrderDeliveryStatus role="creator" order={data.order} />

        <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-12">
          <div className="flex flex-col gap-8 lg:col-span-8">
            <OrderShippingInfo role="creator" order={data.order} brand={data.brand} />
          </div>

          <aside className="flex flex-col gap-8 lg:col-span-4">
            {/* <OrderChatWidget /> */}
            <OrderFinancialSummary order={data.order} />
          </aside>
        </div>
      </div>
    </div>
  );
}
