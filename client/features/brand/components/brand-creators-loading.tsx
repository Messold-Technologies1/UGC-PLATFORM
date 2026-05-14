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
      languages: ["English", "Hindi"],
      deliveryDays: 3,
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
      languages: ["English", "Hindi"],
      deliveryDays: 3,
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
      languages: ["English", "Hindi"],
      deliveryDays: 3,
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
      languages: ["English", "Hindi"],
      deliveryDays: 3,
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
      languages: ["English", "Hindi"],
      deliveryDays: 3,
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
      languages: ["English", "Hindi"],
      deliveryDays: 3,
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
      languages: ["English", "Hindi"],
      deliveryDays: 3,
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
      languages: ["English", "Hindi"],
      deliveryDays: 3,
    },
  ],
  total: 148,
  page: 1,
  limit: 50,
};

function BrandCreatorsFixtureView() {
    return (
    <div className="flex w-full min-w-0 flex-col lg:flex-row lg:items-start gap-8">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:block w-full max-w-[260px] shrink-0 lg:sticky lg:top-[6.5rem]">
        <div className="h-[600px] w-full rounded-lg bg-gray-100/50 animate-pulse" />
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header Title */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#111] tracking-tight">
            Find the right creator for your brand
          </h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">
            Browse creators by style, language, content type, location and more.
          </p>
        </div>

        {/* Search & Request Help Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search niche, style, language, city or keyword"
              defaultValue=""
              readOnly
              className="h-[46px] rounded-lg border-gray-200 py-2.5 pl-11 pr-12 text-[14px] shadow-sm text-gray-900 bg-white"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <SlidersHorizontal className="size-[18px] text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[13px] text-[#6B7280] font-medium hidden sm:inline-block">
              Can't find the right fit?
            </span>
            <div className="inline-flex h-[42px] items-center justify-center rounded-lg border border-[#8B5CF6] px-5 text-[14px] font-semibold text-[#8B5CF6]">
              Request Help
            </div>
          </div>
        </div>

        {/* Active Tags & Sort Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-[32px] w-[200px] rounded-lg bg-gray-100/50 animate-pulse" />
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[13px] font-semibold text-[#6B7280]">
              {BRAND_CREATORS_FIXTURE_DATA.total.toLocaleString()} creators found
            </span>
          </div>
        </div>

        {/* Grid Area */}
        <div className="min-h-[min(22rem,50vh)]">
          <div className="grid w-full gap-x-5 gap-y-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
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
