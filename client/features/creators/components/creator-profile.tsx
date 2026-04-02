"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ProfileHeader } from "./profile-header";
import type { CreatorProfile as CreatorProfileType } from "../types";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-6">
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
  { loading: () => <TabSkeleton /> },
);
const PackagesTab = dynamic(
  () => import("./packages-tab").then((m) => ({ default: m.PackagesTab })),
  { loading: () => <TabSkeleton /> },
);
const ReviewsTab = dynamic(
  () => import("./reviews-tab").then((m) => ({ default: m.ReviewsTab })),
  { loading: () => <TabSkeleton /> },
);
const OrderSummary = dynamic(
  () => import("./order-summary").then((m) => ({ default: m.OrderSummary })),
  { loading: () => <SidebarSkeleton /> },
);

interface CreatorProfileProps {
  creator: CreatorProfileType;
  initialPortfolioVideos?: PortfolioVideoApi[];
}

const TABS = ["Portfolio", "Packages", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export function CreatorProfile({
  creator,
  initialPortfolioVideos,
}: CreatorProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Portfolio");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  const selectedPackage = useMemo(
    () => creator.packages.find((p) => p.id === selectedPackageId) ?? null,
    [creator.packages, selectedPackageId],
  );

  const handleToggleAddOn = useCallback((id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }, []);

  return (
    <div className="mx-auto max-w-site px-4 py-8 sm:px-6 lg:px-8">
      <ProfileHeader creator={creator} />

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex border-b border-border" role="tablist" aria-label="Creator profile sections">
            {TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab.toLowerCase()}`}
                id={`tab-${tab.toLowerCase()}`}
                onClick={() => setActiveTab(tab)}
                className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {tab === "Reviews" && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({creator.reviews.length})
                  </span>
                )}
                {activeTab === tab && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div
            className="mt-6"
            role="tabpanel"
            id={`tabpanel-${activeTab.toLowerCase()}`}
            aria-labelledby={`tab-${activeTab.toLowerCase()}`}
          >
            {activeTab === "Portfolio" && (
              <PortfolioTab
                creatorId={creator.id}
                initialVideos={initialPortfolioVideos}
              />
            )}

            {activeTab === "Packages" && (
              <PackagesTab
                packages={creator.packages}
                addOns={creator.addOns}
                selectedPackageId={selectedPackageId}
                selectedAddOnIds={selectedAddOnIds}
                onSelectPackage={setSelectedPackageId}
                onToggleAddOn={handleToggleAddOn}
              />
            )}

            {activeTab === "Reviews" && (
              <ReviewsTab
                reviews={creator.reviews}
                overallRating={creator.rating}
                totalReviews={creator.reviewCount}
              />
            )}
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-24">
            <OrderSummary
              selectedPackage={selectedPackage}
              addOns={creator.addOns}
              selectedAddOnIds={selectedAddOnIds}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
