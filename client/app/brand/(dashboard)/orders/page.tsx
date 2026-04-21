import type { Metadata } from "next";
import { BrandOrdersList } from "@/features/orders/components/brand-orders-list";

export const metadata: Metadata = {
  title: "Orders",
};

export default function BrandOrdersPage() {
  return <BrandOrdersList />;
}
