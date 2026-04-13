import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchCreatorProfileById,
  isCreatorProfileUuid,
} from "@/features/creators/api/fetch-creator-profile";
import { mapProfileItemToCreatorProfile } from "@/features/creators/api/map-profile-to-creator";
import { CheckoutLayout } from "@/features/payments/components/checkout-layout";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ creatorId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { creatorId } = await params;

  if (!isCreatorProfileUuid(creatorId)) {
    return { title: "Checkout" };
  }

  const result = await fetchCreatorProfileById(creatorId);
  if (result.ok) {
    return { title: `Checkout | ${result.profile.displayName}` };
  }
  return { title: "Checkout" };
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const { creatorId } = await params;
  const { package: packageId } = await searchParams;

  if (!isCreatorProfileUuid(creatorId)) {
    notFound();
  }

  const result = await fetchCreatorProfileById(creatorId);

  if (!result.ok) {
    notFound();
  }

  const creator = mapProfileItemToCreatorProfile(result.profile);

  const selectedPackage =
    typeof packageId === "string"
      ? creator.packages.find((p) => p.id === packageId) ?? creator.packages[0] ?? null
      : creator.packages[0] ?? null;

  return (
    <div className="mx-auto max-w-site px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
        <p className="text-muted-foreground mt-2">
          Review your order details and complete payment to collaborate with{" "}
          {creator.name.split(" ")[0]}.
        </p>
      </div>

      <CheckoutLayout creator={creator} selectedPackage={selectedPackage} />
    </div>
  );
}
