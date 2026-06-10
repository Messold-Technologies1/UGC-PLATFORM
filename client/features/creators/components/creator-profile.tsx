"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Share2 } from "lucide-react";
import { ProfileHeader } from "./profile-header";
import { TrustStrip } from "./trust-strip";
import { AddOnsSection } from "./add-ons-section";
import type { CreatorProfile as CreatorProfileType, Review } from "../types";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { useRazorpayCheckout } from "@/features/payments/hooks/use-razorpay-checkout";
import { useCreatorRatingReviewsQuery } from "../hooks/use-creator-rating-reviews-query";

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-56 w-48 shrink-0 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-6">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="mt-4 h-10 w-full rounded bg-muted" />
      </div>
    </div>
  );
}

const PortfolioTab = dynamic(
  () => import("./portfolio-tab").then((m) => ({ default: m.PortfolioTab })),
  { loading: () => <SectionSkeleton /> },
);

const SidebarPricingCard = dynamic(
  () =>
    import("./sidebar-pricing-card").then((m) => ({
      default: m.SidebarPricingCard,
    })),
  { loading: () => <SidebarSkeleton /> },
);

const InfoCardsSection = dynamic(
  () =>
    import("./info-cards-section").then((m) => ({
      default: m.InfoCardsSection,
    })),
  { loading: () => <SectionSkeleton /> },
);

const SimilarCreatorsSection = dynamic(
  () =>
    import("./similar-creators-section").then((m) => ({
      default: m.SimilarCreatorsSection,
    })),
  { loading: () => <SectionSkeleton /> },
);

const ReviewsTab = dynamic(
  () => import("./reviews-tab").then((m) => ({ default: m.ReviewsTab })),
  { loading: () => <SectionSkeleton /> },
);

interface CreatorProfileProps {
  creator: CreatorProfileType;
  initialPortfolioVideos?: PortfolioVideoApi[];
}

export function CreatorProfile({
  creator,
  initialPortfolioVideos,
}: CreatorProfileProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    creator.packages[0]?.id ?? null,
  );
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  const selectedPackage = useMemo(
    () => creator.packages.find((p) => p.id === selectedPackageId) ?? null,
    [creator.packages, selectedPackageId],
  );
  const selectedAddOns = useMemo(
    () => creator.addOns.filter((addOn) => selectedAddOnIds.includes(addOn.id)),
    [creator.addOns, selectedAddOnIds],
  );
  const reviewsQuery = useCreatorRatingReviewsQuery(
    creator.id,
    { page: 1, limit: 20 },
  );
  const reviewSummary = reviewsQuery.data;
  const reviews = useMemo<Review[]>(
    () =>
      (reviewSummary?.items ?? []).map((item) => ({
        id: item.id,
        author: item.brand.brandName,
        brand: item.packageNameSnapshot || "Order review",
        rating: item.rating,
        date: new Intl.DateTimeFormat("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(item.createdAt)),
        comment: item.review?.trim() || "No written review.",
      })),
    [reviewSummary?.items],
  );
  const overallRating =
    Number.parseFloat(reviewSummary?.avgRating ?? "") || creator.rating || 0;
  const totalReviews = reviewSummary?.reviewCount ?? creator.reviewCount;

  const { isProcessing, startCheckout } = useRazorpayCheckout({
    creator,
    selectedPackage,
    selectedAddOns,
  });

  const handleToggleAddOn = useCallback((id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id)
        ? prev.filter((addOnId) => addOnId !== id)
        : [...prev, id],
    );
  }, []);

  const handleSelectPackage = useCallback((id: string) => {
    setSelectedPackageId(id);
  }, []);

  const handleProceedToCheckout = useCallback(() => {
    if (!selectedPackage) return;
    void startCheckout();
  }, [selectedPackage, startCheckout]);

  return (
    <div className="w-full min-w-0">
      <div className="px-6 sm:px-8 lg:px-10 py-4 flex items-center justify-between">
        {/* <Link
          href="/brand/creators"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to creators
        </Link>

        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Share
          <Share2 className="size-4" />
        </button> */}
      </div>

      <div className="px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <ProfileHeader creator={creator} />
          </div>

          <div className="w-full shrink-0 lg:w-[340px] xl:w-[360px]">
            <div className="sticky top-24">
              <SidebarPricingCard
                packages={creator.packages}
                addOns={creator.addOns}
                selectedPackageId={selectedPackageId}
                selectedAddOnIds={selectedAddOnIds}
                onSelectPackage={handleSelectPackage}
                onToggleAddOn={handleToggleAddOn}
                isProcessing={isProcessing}
                onProceedToCheckout={handleProceedToCheckout}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 lg:px-10">
        {creator.addOns.length > 0 && (
          <AddOnsSection
            addOns={creator.addOns}
            selectedAddOnIds={selectedAddOnIds}
            onToggleAddOn={handleToggleAddOn}
          />
        )}
      </div>

      <div className="px-6 sm:px-8 lg:px-10 mt-8">
        <PortfolioTab
          creatorId={creator.id}
          initialVideos={initialPortfolioVideos}
        />
      </div>

      <div className="px-6 sm:px-8 lg:px-10">
        <InfoCardsSection creator={creator} />
      </div>

      {totalReviews > 0 && (
        <div className="px-6 mt-6 sm:px-8 lg:px-10">
          <ReviewsTab
            reviews={reviews}
            overallRating={overallRating}
            totalReviews={totalReviews}
            isLoading={reviewsQuery.isLoading}
          />
        </div>
      )}

      <div className="px-6 sm:px-8 lg:px-10">
        <SimilarCreatorsSection currentCreatorId={creator.id} />
      </div>

      <TrustStrip />
    </div>
  );
}
