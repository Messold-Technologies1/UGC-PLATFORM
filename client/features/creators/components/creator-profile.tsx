"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ProfileHeader } from "./profile-header";
import type { CreatorProfile as CreatorProfileType } from "../types";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { useRazorpayCheckout } from "@/features/payments/hooks/use-razorpay-checkout";

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
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
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
    if (!selectedPackage) {
      return;
    }

    void startCheckout();
  }, [selectedPackage, startCheckout]);

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-8">
          <ProfileHeader creator={creator} />

          <div>
            <div
              className="flex border-b border-border/40"
              role="tablist"
              aria-label="Creator profile sections"
            >
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
                    <motion.span
                      layoutId="creator-tab-underline"
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                      }}
                    />
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
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
                      onSelectPackage={handleSelectPackage}
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
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-24 space-y-6">
            <OrderSummary
              selectedPackage={selectedPackage}
              addOns={creator.addOns}
              selectedAddOnIds={selectedAddOnIds}
              isProcessing={isProcessing}
              onProceedToCheckout={handleProceedToCheckout}
            />

            {/* <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Why Book {creator.name.split(" ")[0]}?
              </h3>
              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Fast Delivery</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Typical turnaround within 72 hours
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">4K Quality</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Shot on professional cinema gear
                    </p>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
