import { CreatorOrderDetailsView } from "@/features/orders/components/creator-order-detail/creator-order-details-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CreatorOrderDetailsPage({ params }: PageProps) {
  const { orderId } = await params;

  return <CreatorOrderDetailsView orderId={orderId} />;
}
