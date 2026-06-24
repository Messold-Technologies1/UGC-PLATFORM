import { OrderBriefReview } from "@/features/orders/components/order-brief-review";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CreatorBriefPage({ params }: PageProps) {
  const { orderId } = await params;

  return <OrderBriefReview orderId={orderId} />;
}
