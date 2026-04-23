import { BrandOrderDetailsView } from "@/features/orders/components/brand-order-details-view";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return <BrandOrderDetailsView orderId={orderId} />;
}
