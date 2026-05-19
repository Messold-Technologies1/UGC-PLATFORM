import type { Metadata } from "next";
import { BrandOrderShippingView } from "@/features/orders/components/brand-order-shipping-view";

export const metadata: Metadata = {
  title: "Order Shipping | Brand Dashboard",
  description: "Add shipping details for your order.",
};

interface BrandOrderShippingPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function BrandOrderShippingPage({
  params,
}: BrandOrderShippingPageProps) {
  const { orderId } = await params;
  return <BrandOrderShippingView orderId={orderId} />;
}
