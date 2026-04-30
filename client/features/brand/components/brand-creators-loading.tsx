"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { Search, SlidersHorizontal } from "lucide-react";
import { CreatorsBrowserLoadingShell } from "@/components/dashboard/route-loading-shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatorCard } from "@/features/creators/components/creator-card";
import type { CreatorsListResult } from "@/features/creators/hooks/use-creators-list-query";

const BRAND_CREATORS_FIXTURE_DATA: CreatorsListResult = {
  creators: [
    {
      id: "fixture-creator-1",
      name: "Aisha Khan",
      location: "Mumbai, India",
      rating: 4.9,
      reviewCount: 124,
      startingPrice: 12000,
      ordersCompleted: 96,
      thumbnail: "/globe.svg",
      previewVideoUrl: null,
      previewVideoThumbnail: null,
      tags: ["Skincare", "Hooks", "UGC Ads"],
      available: true,
      storeVisit: false,
      travelAvailable: true,
      gender: "female",
      category: "Beauty",
      categories: ["Beauty", "Lifestyle"],
      industryLabel: "Skincare",
    },
    {
      id: "fixture-creator-2",
      name: "Rohan Mehta",
      location: "Bengaluru, India",
      rating: 4.8,
      reviewCount: 88,
      startingPrice: 9500,
      ordersCompleted: 72,
      thumbnail: "/globe.svg",
      previewVideoUrl: null,
      previewVideoThumbnail: null,
      tags: ["Apps", "Voiceover", "Tech"],
      available: true,
      storeVisit: true,
      travelAvailable: false,
      gender: "male",
      category: "Technology",
      categories: ["Technology", "SaaS"],
      industryLabel: "Apps",
    },
    {
      id: "fixture-creator-3",
      name: "Sana Verma",
      location: "Delhi, India",
      rating: 5,
      reviewCount: 61,
      startingPrice: 15000,
      ordersCompleted: 54,
      thumbnail: "/globe.svg",
      previewVideoUrl: null,
      previewVideoThumbnail: null,
      tags: ["Fashion", "Try-on", "Voice-led"],
      available: true,
      storeVisit: true,
      travelAvailable: true,
      gender: "female",
      category: "Fashion",
      categories: ["Fashion", "Lifestyle"],
      industryLabel: "Apparel",
    },
    {
      id: "fixture-creator-4",
      name: "Kabir Singh",
      location: "Pune, India",
      rating: 4.7,
      reviewCount: 47,
      startingPrice: 8000,
      ordersCompleted: 39,
      thumbnail: "/globe.svg",
      previewVideoUrl: null,
      previewVideoThumbnail: null,
      tags: ["Food", "Restaurant", "Short-form"],
      available: true,
      storeVisit: true,
      travelAvailable: false,
      gender: "male",
      category: "Food",
      categories: ["Food", "Hospitality"],
      industryLabel: "Dining",
    },
    {
      id: "fixture-creator-5",
      name: "Meera Joshi",
      location: "Hyderabad, India",
      rating: 4.9,
      reviewCount: 102,
      startingPrice: 11000,
      ordersCompleted: 84,
      thumbnail: "/globe.svg",
      previewVideoUrl: null,
      previewVideoThumbnail: null,
      tags: ["Wellness", "Explainers", "Testimonials"],
      available: true,
      storeVisit: false,
      travelAvailable: true,
      gender: "female",
      category: "Health",
      categories: ["Health", "Wellness"],
      industryLabel: "Wellness",
    },
    {
      id: "fixture-creator-6",
      name: "Arjun Das",
      location: "Chennai, India",
      rating: 4.6,
      reviewCount: 36,
      startingPrice: 7000,
      ordersCompleted: 28,
      thumbnail: "/globe.svg",
      previewVideoUrl: null,
      previewVideoThumbnail: null,
      tags: ["Fitness", "Voiceover", "Product Demo"],
      available: true,
      storeVisit: false,
      travelAvailable: true,
      gender: "male",
      category: "Fitness",
      categories: ["Fitness", "Lifestyle"],
      industryLabel: "Fitness",
    },
    {
      id: "fixture-creator-7",
      name: "Nisha Patel",
      location: "Ahmedabad, India",
      rating: 4.8,
      reviewCount: 73,
      startingPrice: 9800,
      ordersCompleted: 58,
      thumbnail: "/globe.svg",
      previewVideoUrl: null,
      previewVideoThumbnail: null,
      tags: ["Home", "Voice-led", "Aesthetic"],
      available: true,
      storeVisit: false,
      travelAvailable: false,
      gender: "female",
      category: "Home",
      categories: ["Home", "Decor"],
      industryLabel: "Home Decor",
    },
    {
      id: "fixture-creator-8",
      name: "Dev Malhotra",
      location: "Jaipur, India",
      rating: 4.7,
      reviewCount: 52,
      startingPrice: 8600,
      ordersCompleted: 44,
      thumbnail: "/globe.svg",
      previewVideoUrl: null,
      previewVideoThumbnail: null,
      tags: ["Travel", "Lifestyle", "Hooks"],
      available: true,
      storeVisit: true,
      travelAvailable: true,
      gender: "male",
      category: "Travel",
      categories: ["Travel", "Lifestyle"],
      industryLabel: "Travel",
    },
  ],
  total: 148,
  page: 1,
  limit: 50,
};

function BrandCreatorsFixtureView() {
  return (
    <div className="w-full min-w-0">
      <header className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
        <h1 className="font-headline font-extrabold text-5xl tracking-tight mb-2">
          Browse Creators
        </h1>
        {/* <p className="mt-2 max-w-4xl text-base text-muted-foreground md:text-lg xl:max-w-none">
          Find and hire talented UGC creators to bring your brand story to life.
        </p> */}
        </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 mb-10">
        <div className="flex flex-col gap-4 p-4 py-3 backdrop-blur-sm md:flex-row md:items-center md:gap-6">
          <div className="flex w-full shrink-0 flex-col gap-4 sm:flex-row sm:items-center md:w-auto">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
              >
                <SlidersHorizontal className="size-3.5" />
                All filters
                <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  3
                </span>
              </Button>
            </div>

            <div className="hidden h-8 w-px shrink-0 bg-border md:block" />

            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <p className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {BRAND_CREATORS_FIXTURE_DATA.total.toLocaleString()} creators found
              </p>
            </div>
          </div>

          <div className="group relative min-w-0 w-full flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors" />
            <Input
              placeholder="Search creators, niches, or locations…"
              defaultValue=""
              className="h-10 rounded-2xl py-2.5 pl-11 pr-4 text-sm"
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex min-h-[min(22rem,50vh)] flex-col lg:min-h-112 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="grid w-full gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {BRAND_CREATORS_FIXTURE_DATA.creators.map((creator) => (
              <div key={creator.id} className="min-w-0 h-full">
                <CreatorCard
                  creator={creator}
                  variant="listing"
                  appearance="browse"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrandCreatorsLoadingState() {
  return (
    <BoneyardSkeleton
      name="brand-creators-browser"
      loading
      fallback={<CreatorsBrowserLoadingShell />}
      fixture={<BrandCreatorsFixtureView />}
      transition
    >
      <BrandCreatorsFixtureView />
    </BoneyardSkeleton>
  );
}
