import { redirect } from "next/navigation";

export default async function CreatorOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  redirect(`/creator/orders/${orderId}/brief`);
}
