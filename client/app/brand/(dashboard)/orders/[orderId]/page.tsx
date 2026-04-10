import { Metadata } from "next";
import { OrderChatLayout } from "@/features/orders/components/order-chat-layout";

export const metadata: Metadata = {
  title: "Order Collaboration",
};

export default function OrderPage({ params }: { params: { orderId: string } }) {
  return (
    <div className="flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden bg-background">
      <OrderChatLayout />
    </div>
  );
}
