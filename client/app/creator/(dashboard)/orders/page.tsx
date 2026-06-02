import type { Metadata } from "next";
import { CreatorOrdersList } from "@/features/orders/components/creator-order-detail/creator-orders-list";

export const metadata: Metadata = {
  title: "Orders",
};

export default function CreatorOrdersPage() {
  return <CreatorOrdersList />;
}
