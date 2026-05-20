import type { Metadata } from "next";
import { BrandOrdersList } from "@/features/orders/components/brand-order-detail";

export const metadata: Metadata = {
  title: "Orders",
};

export default function BrandOrdersPage() {
  return <BrandOrdersList />;
}
