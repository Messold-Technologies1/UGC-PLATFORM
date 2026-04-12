import { OrderHeader } from "@/features/orders/components/order-header";
import { OrderDeliveryStatus } from "@/features/orders/components/order-delivery-status";
import { OrderShippingInfo } from "@/features/orders/components/order-shipping-info";
import { OrderChatWidget } from "@/features/orders/components/order-chat-widget";
import { OrderFinancialSummary } from "@/features/orders/components/order-financial-summary";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <OrderHeader orderId={orderId} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <OrderDeliveryStatus />
          <OrderShippingInfo />
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-8">
          <OrderChatWidget />
          <OrderFinancialSummary />
        </aside>
      </div>
    </div>
  );
}
