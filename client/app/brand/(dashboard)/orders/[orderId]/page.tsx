import { BrandOrderDetailsView } from "@/features/orders/components/brand-order-detail";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return <BrandOrderDetailsView orderId={orderId} />;
}
