import { OrderBriefReview } from "@/features/orders/components/order-brief-review";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CreatorBriefPage({ params }: PageProps) {
  const { orderId } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <OrderBriefReview orderId={orderId} />
    </div>
  );
}
