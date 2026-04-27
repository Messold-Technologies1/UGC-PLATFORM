import { CreatorOrderDetailsView } from "@/features/orders/components/creator-order-details-view";

export default async function CreatorOrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return <CreatorOrderDetailsView orderId={orderId} />;
}
