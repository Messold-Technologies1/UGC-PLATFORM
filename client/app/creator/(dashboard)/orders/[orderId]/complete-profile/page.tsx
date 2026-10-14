import { OrderProfileCompletionGate } from "@/features/orders/components/order-profile-gate/order-profile-completion-gate";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CreatorOrderCompleteProfilePage({
  params,
}: PageProps) {
  const { orderId } = await params;

  return <OrderProfileCompletionGate orderId={orderId} />;
}
