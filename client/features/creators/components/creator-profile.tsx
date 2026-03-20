"use client";

import { useState } from "react";
import { ProfileHeader } from "./profile-header";
import { PortfolioTab } from "./portfolio-tab";
import { PackagesTab } from "./packages-tab";
import { ReviewsTab } from "./reviews-tab";
import { OrderSummary } from "./order-summary";
import type { CreatorProfile as CreatorProfileType } from "../types";

interface CreatorProfileProps {
  creator: CreatorProfileType;
}

const TABS = ["Portfolio", "Packages", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export function CreatorProfile({ creator }: CreatorProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Portfolio");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  const selectedPackage =
    creator.packages.find((p) => p.id === selectedPackageId) ?? null;

  function handleToggleAddOn(id: string) {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <ProfileHeader creator={creator} />

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab}
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

          <div className="mt-6">
            {activeTab === "Portfolio" && (
              <PortfolioTab items={creator.portfolio} />
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
