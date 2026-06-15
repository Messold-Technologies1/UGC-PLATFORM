"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, Users, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { Spinner } from "@/components/ui/spinner";
import type { PublicWishlistResponse, WishlistCreator } from "@/features/wishlists/api/types";

async function getPublicWishlist(shareToken: string): Promise<PublicWishlistResponse> {
  const { data } = await api.get<PublicWishlistResponse>(ENDPOINTS.WISHLISTS.PUBLIC(shareToken));
  return data;
}

const POSTER_GRADIENTS = [
  ["#f97316", "#ef4444"],
  ["#8b5cf6", "#ec4899"],
  ["#3b82f6", "#6366f1"],
  ["#10b981", "#14b8a6"],
  ["#f59e0b", "#f97316"],
  ["#06b6d4", "#3b82f6"],
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function posterGradient(index: number) {
  return POSTER_GRADIENTS[index % POSTER_GRADIENTS.length]!;
}

function getMinPrice(creator: WishlistCreator) {
  if (!creator.packages || creator.packages.length === 0) return null;
  return Math.min(...creator.packages.map((p) => Number(p.priceAmount)));
}

function CreatorCard({ creator, index }: { creator: WishlistCreator; index: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(creator.name);
  const [g1, g2] = posterGradient(index);

  const posterUrl =
    !imgError && (creator.portfolioVideos?.[0]?.thumbnailUrl || creator.profileImageUrl)
      ? creator.portfolioVideos?.[0]?.thumbnailUrl || creator.profileImageUrl
      : null;

  const minPrice = getMinPrice(creator);
  const rating = creator.avgRating ? parseFloat(creator.avgRating) : null;
  const categories = creator.categories?.slice(0, 2) ?? [];

  return (
    <div className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Poster */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={creator.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center"
            style={{ background: `linear-gradient(155deg, ${g1}, ${g2})` }}
          >
            <span className="text-4xl font-black text-white/90 tracking-tight">{initials}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Rating badge */}
        {rating !== null && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-amber-600 shadow">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
          </div>
        )}

        {/* Name + location on poster */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6">
          <p className="font-bold text-white text-sm leading-tight truncate">{creator.name}</p>
          {creator.city && (
            <p className="flex items-center gap-1 text-white/70 text-xs mt-0.5 truncate">
              <MapPin size={9} />
              {creator.city}
            </p>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2 p-3">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {minPrice !== null ? (
            <p className="text-sm font-bold text-gray-900">
              ₹{minPrice.toLocaleString("en-IN")}
              <span className="text-xs font-normal text-gray-400 ml-1">starting</span>
            </p>
          ) : (
            <span />
          )}
          <Link
            href="/register/brand"
            className="shrink-0 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-600 transition-colors"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PublicWishlistPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-wishlist", shareToken],
    queryFn: () => getPublicWishlist(shareToken),
    staleTime: 5 * 60_000,
    retry: false,
  });

  return (
    <div className="min-h-screen" style={{ background: "#f8f7f4" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-gray-900">GoCollab</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register/brand"
              className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Spinner className="size-8 text-rose-500" />
          </div>
        ) : isError ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
            <AlertCircle className="size-10 text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">Wishlist not available</h3>
            <p className="mt-2 text-sm text-gray-500">
              This wishlist is no longer shared or the link is invalid.
            </p>
            <Link
              href="/register/brand"
              className="mt-6 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
            >
              Create your own wishlist
            </Link>
          </div>
        ) : data ? (
          <>
            {/* Hero */}
            <div className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {data.brand.logoUrl && (
                <div className="size-16 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <Image
                    src={data.brand.logoUrl}
                    alt={data.brand.brandName}
                    width={64}
                    height={64}
                    className="size-full object-contain p-1"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  Curated by{" "}
                  <span className="text-gray-700">{data.brand.brandName}</span>
                </p>
                <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-tight">
                  {data.name}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  <Users size={14} />
                  {data.creators.length} creator{data.creators.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Creator grid */}
            {data.creators.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <Users className="size-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No creators yet</h3>
                <p className="mt-1 text-sm text-gray-400">This wishlist is empty.</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {data.creators.map((creator, i) => (
                  <CreatorCard key={creator.id} creator={creator} index={i} />
                ))}
              </div>
            )}

            {/* Bottom CTA */}
            <div className="mt-16 rounded-3xl bg-gradient-to-br from-rose-500 to-orange-400 px-8 py-12 text-center text-white shadow-lg">
              <h2 className="text-2xl font-black tracking-tight mb-2">
                Find your perfect creators
              </h2>
              <p className="text-white/80 text-sm mb-6 max-w-md mx-auto">
                Join GoCollab to browse thousands of UGC creators, manage wishlists, and launch campaigns — all in one place.
              </p>
              <Link
                href="/register/brand"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors shadow"
              >
                Get started for free
              </Link>
            </div>

            <p className="mt-8 text-center text-xs text-gray-400">
              Powered by{" "}
              <Link href="/" className="font-semibold text-gray-600 hover:underline">
                GoCollab
              </Link>
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}
