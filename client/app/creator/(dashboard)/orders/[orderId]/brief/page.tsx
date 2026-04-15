import { BriefForm } from "@/features/orders/components/brief-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CreatorBriefPage({ params }: PageProps) {
  const { orderId } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Project Brief</h1>
        <p className="text-muted-foreground mt-2">
          Project details and requirements from the brand.
          <br />
          Order ID: <span className="font-mono text-xs">{orderId}</span>
        </p>
      </div>

      <BriefForm orderId={orderId} readOnly />
    </div>
  );
}
