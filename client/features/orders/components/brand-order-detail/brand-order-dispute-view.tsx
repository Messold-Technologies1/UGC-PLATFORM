"use client";

import { OrderChatWidget } from "@/features/orders/components/order-chat-widget";
import type {
  OrderCreatorSnapshot,
  OrderDetailsPublic,
} from "@/features/orders/api/types";
import type { OrderBriefPayload } from "@/features/orders/api/get-order-brief";
import { OrderPageHeader } from "./order-page-header";
import { OrderProgressStepper } from "./order-progress-stepper";
import { OrderStatusBanner } from "./order-status-banner";
import { InprogressOrderDetailsCard } from "./order-inProgress/inprogress-order-details-card";

interface BrandOrderDisputeViewProps {
  orderId: string;
  order: OrderDetailsPublic;
  creator?: OrderCreatorSnapshot;
  brief: OrderBriefPayload | null;
  briefId: string | null;
}

export function BrandOrderDisputeView({
  orderId,
  order,
  creator,
  brief,
  briefId,
}: BrandOrderDisputeViewProps) {
  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
      <OrderPageHeader orderId={orderId} paidAt={order.paidAt} />

      <OrderProgressStepper order={order} />

      <OrderStatusBanner order={order} creator={creator} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <OrderChatWidget
            orderId={orderId}
            role="brand"
            creator={creator}
            headerTitle="Dispute Group Chat"
            headerSubtitle="You, the creator and support"
            hideHeaderAvatar
          />
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-5">
          <InprogressOrderDetailsCard
            order={order}
            brief={brief}
            briefId={briefId}
            orderId={orderId}
          />
        </aside>
      </div>
    </div>
  );
}
