"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Share2, Star, MapPin, CheckCircle, ShoppingCart, AlertCircle, Package, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { Spinner } from "@/components/ui/spinner";
import type { PublicWishlistResponse, WishlistCreator } from "@/features/wishlists/api/types";

async function getPublicWishlist(shareToken: string): Promise<PublicWishlistResponse> {
  const { data } = await api.get<PublicWishlistResponse>(ENDPOINTS.WISHLISTS.PUBLIC(shareToken));
  return data;
}

// Gradient pairs for creator poster backgrounds
const POSTER_GRADIENTS: [string, string][] = [
  ["#f97316", "#ef4444"],   // orange → red
  ["#8b5cf6", "#ec4899"],   // violet → pink
  ["#3b82f6", "#06b6d4"],   // blue → cyan
  ["#10b981", "#14b8a6"],   // emerald → teal
  ["#f59e0b", "#f97316"],   // amber → orange
  ["#6366f1", "#8b5cf6"],   // indigo → violet
  ["#ef4444", "#f97316"],   // red → orange
  ["#14b8a6", "#3b82f6"],   // teal → blue
];

// Tag palette — cycle through soft backgrounds
const TAG_COLORS: [string, string][] = [
  ["#fce7f3", "#9d174d"],
  ["#fef3c7", "#92400e"],
  ["#d1fae5", "#065f46"],
  ["#dbeafe", "#1e40af"],
  ["#ede9fe", "#5b21b6"],
  ["#fee2e2", "#991b1b"],
  ["#f0fdf4", "#14532d"],
  ["#e0f2fe", "#075985"],
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function posterGradient(index: number): [string, string] {
  return POSTER_GRADIENTS[index % POSTER_GRADIENTS.length]!;
}

function tagColor(tag: string): [string, string] {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length]!;
}

function getMinPrice(creator: WishlistCreator): number | null {
  if (!creator.packages?.length) return null;
  return Math.min(...creator.packages.map((p) => Number(p.priceAmount)));
}

function getDeliveryDays(creator: WishlistCreator): number | null {
  if (!creator.packages?.length) return null;
  return Math.min(...creator.packages.map((p) => p.deliveryDays ?? 99));
}

function formatSharedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Fan of creator cards shown in hero ──────────────────────────────────────
function HeroCardFan({ creators }: { creators: WishlistCreator[] }) {
  const shown = creators.slice(0, 5);
  const angles = [-18, -9, 0, 9, 18];
  const offsets = [-48, -24, 0, 24, 48];

  return (
    <div className="relative flex items-center justify-center" style={{ width: 260, height: 220 }}>
      {shown.map((c, i) => {
        const [g1, g2] = posterGradient(i);
        const initials = getInitials(c.name);
        const angle = angles[i] ?? 0;
        const tx = offsets[i] ?? 0;
        return (
          <div
            key={c.id}
            className="absolute rounded-2xl shadow-lg"
            style={{
              width: 110,
              height: 150,
              background: `linear-gradient(150deg, ${g1}, ${g2})`,
              transform: `rotate(${angle}deg) translateX(${tx}px)`,
              zIndex: i,
            }}
          >
            <div className="flex h-full items-center justify-center">
              <span className="text-3xl font-black text-white/90">{initials}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Individual creator card ──────────────────────────────────────────────────
function CreatorCard({ creator, index }: { creator: WishlistCreator; index: number }) {
  const [imgError, setImgError] = useState(false);
  const [g1, g2] = posterGradient(index);
  const initials = getInitials(creator.name);

  const posterUrl =
    !imgError && (creator.portfolioVideos?.[0]?.thumbnailUrl || creator.profileImageUrl)
      ? creator.portfolioVideos?.[0]?.thumbnailUrl || creator.profileImageUrl
      : null;

  const minPrice = getMinPrice(creator);
  const deliveryDays = getDeliveryDays(creator);
  const rating = creator.avgRating ? parseFloat(creator.avgRating) : null;
  const categories = creator.categories?.slice(0, 2) ?? [];
  const orders = creator.collaborationCount ?? 0;
  const verified = rating !== null && rating >= 4.8;

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Poster */}
      <div className="relative" style={{ paddingBottom: "130%" }}>
        <div className="absolute inset-0">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={creator.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="flex h-full items-center justify-center"
              style={{ background: `linear-gradient(150deg, ${g1}, ${g2})` }}
            >
              <span className="text-5xl font-black text-white/90">{initials}</span>
            </div>
          )}

          {/* Bottom overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Rating badge top-left */}
          {rating !== null && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-gray-900 shadow-sm">
              <Star size={9} className="fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </div>
          )}

          {/* Order count top-right */}
          {orders > 0 && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
              <span className="text-gray-400">#</span>{orders}
            </div>
          )}

          {/* Name + location at bottom of poster */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
            <p className="font-bold text-white text-sm leading-tight flex items-center gap-1 truncate">
              {creator.name}
              {verified && <CheckCircle size={12} className="text-blue-400 shrink-0" />}
            </p>
            <p className="text-white/70 text-[11px] mt-0.5 truncate flex items-center gap-1">
              {creator.city && <><MapPin size={9} />{creator.city}</>}
              {creator.city && creator.languages?.length > 0 && <span className="mx-0.5 opacity-50">·</span>}
              {creator.languages?.slice(0, 2).join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2 p-3">
        {/* Category tags */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => {
              const [bg, fg] = tagColor(cat);
              return (
                <span
                  key={cat}
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: bg, color: fg }}
                >
                  {cat}
                </span>
              );
            })}
          </div>
        )}

        {/* Stats row */}
        {orders > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <Package size={10} />
              {orders} orders
            </span>
            {deliveryDays && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {deliveryDays}d delivery
              </span>
            )}
          </div>
        )}

        {/* Price + View button */}
        <div className="flex items-end justify-between gap-2 mt-0.5">
          {minPrice !== null ? (
            <div>
              <p className="text-base font-black text-gray-900">
                ₹{minPrice.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-gray-400 -mt-0.5">
                from{deliveryDays ? ` · ${deliveryDays}d delivery` : ""}
              </p>
            </div>
          ) : (
            <span />
          )}
          <Link
            href="/register/brand"
            className="flex items-center gap-1 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800 transition-colors shrink-0"
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
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

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  }

  // Compute hero stats
  const totalPrice = data?.creators.reduce((sum, c) => {
    const p = getMinPrice(c);
    return sum + (p ?? 0);
  }, 0);
  const avgRating =
    data && data.creators.length > 0
      ? data.creators
          .filter((c) => c.avgRating)
          .reduce((s, c) => s + parseFloat(c.avgRating!), 0) /
        (data.creators.filter((c) => c.avgRating).length || 1)
      : null;

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f3" }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 select-none">
            <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500 text-white font-black text-sm">
              G
            </div>
            <span className="text-lg font-black tracking-tight text-gray-900">GoCollab</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Share2 size={14} />
              Copy link
            </button>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register/brand"
              className="rounded-full bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-600 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 md:px-10">
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Spinner className="size-8 text-rose-500" />
          </div>
        ) : isError ? (
          <div className="my-20 flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <AlertCircle className="size-10 text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">Wishlist not available</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm">
              This shortlist is no longer shared or the link has expired.
            </p>
            <Link
              href="/register/brand"
              className="mt-6 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
            >
              Create your own shortlist
            </Link>
          </div>
        ) : data ? (
          <>
            {/* ── Hero ── */}
            <section className="py-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: meta */}
              <div className="max-w-lg">
                {/* Sharer attribution */}
                {data.brand.contactFullName && (
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600 shrink-0">
                      {getInitials(data.brand.contactFullName)}
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{data.brand.contactFullName}</span>
                      {" "}at{" "}
                      <span className="font-semibold text-gray-900">{data.brand.brandName}</span>
                      {" "}shared a creator shortlist with you
                    </p>
                  </div>
                )}

                {/* Label */}
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500 inline-block" />
                  <span className="text-xs font-bold uppercase tracking-widest text-rose-500">
                    Shared Shortlist
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-tight mb-3">
                  {data.name}
                </h1>

                {/* Stats line */}
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 mb-6">
                  <span className="font-medium text-gray-700">
                    {data.creators.length} creator{data.creators.length !== 1 ? "s" : ""}
                  </span>
                  {totalPrice !== undefined && totalPrice > 0 && (
                    <>
                      <span className="opacity-30">·</span>
                      <span>from ₹{totalPrice.toLocaleString("en-IN")} total</span>
                    </>
                  )}
                  {avgRating !== null && avgRating > 0 && (
                    <>
                      <span className="opacity-30">·</span>
                      <span className="flex items-center gap-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {avgRating.toFixed(1)} avg
                      </span>
                    </>
                  )}
                  {data.sharedAt && (
                    <>
                      <span className="opacity-30">·</span>
                      <span>shared {formatSharedDate(data.sharedAt)}</span>
                    </>
                  )}
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/register/brand"
                    className="flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-600 transition-colors shadow-sm"
                  >
                    <ShoppingCart size={15} />
                    Order these creators
                  </Link>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 size={14} />
                    Share
                  </button>
                </div>

                {/* Fine print */}
                <p className="mt-4 text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-gray-300 inline-block" />
                  You&apos;re viewing a read-only shortlist · no account needed to browse
                </p>
              </div>

              {/* Right: fanned cards */}
              {data.creators.length > 0 && (
                <div className="hidden lg:flex items-center justify-center shrink-0 w-72">
                  <HeroCardFan creators={data.creators} />
                </div>
              )}
            </section>

            {/* ── Creator grid ── */}
            <section className="pb-16">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                The shortlist{" "}
                <span className="text-gray-400 font-normal">{data.creators.length} creators</span>
              </h2>

              {data.creators.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                  <p className="font-semibold text-gray-500">No creators in this shortlist yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {data.creators.map((creator, i) => (
                    <CreatorCard key={creator.id} creator={creator} index={i} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Bottom CTA ── */}
            <section className="mb-12 rounded-3xl bg-gray-900 px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-1.5">
                  Build your own creator shortlist
                </h2>
                <p className="text-gray-400 text-sm max-w-md">
                  Browse 2,400+ vetted Indian UGC creators, save them into campaigns like this one, and order in a few clicks.
                </p>
              </div>
              <Link
                href="/register/brand"
                className="shrink-0 flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Get started free →
              </Link>
            </section>

            {/* ── Footer ── */}
            <footer className="flex items-center justify-between pb-10 text-xs text-gray-400">
              <Link href="/" className="flex items-center gap-1.5">
                <div className="flex size-5 items-center justify-center rounded bg-rose-500 text-white font-black text-[10px]">
                  G
                </div>
                <span className="font-semibold text-gray-600">GoCollab</span>
              </Link>
              <span>India&apos;s creator marketplace for brands · © {new Date().getFullYear()}</span>
            </footer>
          </>
        ) : null}
      </main>
    </div>
  );
}
