import { redirect } from "next/navigation";

interface AgencyOrderShippingPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function AgencyOrderShippingPage({
  params,
}: AgencyOrderShippingPageProps) {
  const { orderId } = await params;
  redirect(`/agency/orders/${orderId}`);
}
