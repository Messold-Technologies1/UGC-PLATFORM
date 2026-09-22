import { redirect } from "next/navigation";

interface BrandOrderShippingPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function BrandOrderShippingPage({
  params,
}: BrandOrderShippingPageProps) {
  const { orderId } = await params;
  redirect(`/brand/orders/${orderId}`);
}
