"use client";

import { use, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Share2, Star, AlertCircle, Bookmark, Zap, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { Spinner } from "@/components/ui/spinner";
import { SITE_NAME } from "@/config/site";
import { ReelCard } from "@/features/creators/components/browse-creators/reel-card";
import { ProfileDrawer } from "@/features/creators/components/browse-creators/profile-drawer";
import { mapProfileToListingCreator } from "@/features/creators/api/map-profile-to-creator";
import type { Creator } from "@/features/creators/types";
import { usePublicAuthUser } from "@/features/auth/hooks/use-me-query";
import {
  resolveClientActiveBrandId,
  userCanUseBrandWorkspace,
} from "@/features/brands/lib/active-brand";
import { ImportSharedWishlistDialog } from "@/features/wishlists/components/import-shared-wishlist-dialog";
import type { PublicWishlistResponse, WishlistCreator } from "@/features/wishlists/api/types";
import "@/features/creators/components/browse-creators/browse-creators.css";

async function getPublicWishlist(shareToken: string): Promise<PublicWishlistResponse> {
  const { data } = await api.get<PublicWishlistResponse>(ENDPOINTS.WISHLISTS.PUBLIC(shareToken));
  return data;
}

// Gradients for the hero fan — matched to shared-shortlist mockup
const FAN_GRADIENTS: [string, string][] = [
  ["#8b5cf6", "#ec4899"],
  ["#f97316", "#ef4444"],
  ["#fb923c", "#ef4444"],
  ["#10b981", "#14b8a6"],
  ["#3b82f6", "#06b6d4"],
];

function fanGradient(index: number): [string, string] {
  return FAN_GRADIENTS[index % FAN_GRADIENTS.length]!;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getMinPrice(creator: WishlistCreator): number | null {
  if (!creator.packages?.length) return null;
  return Math.min(...creator.packages.map((p) => Number(p.priceAmount)));
}

function formatSharedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildSubtitle(creators: WishlistCreator[]): string | null {
  const labels = [
    ...new Set(
      creators
        .flatMap((creator) => [
          ...(creator.categories ?? []),
          ...(creator.personaTags ?? []),
        ])
        .map((label) => label.trim())
        .filter(Boolean),
    ),
  ];
  if (labels.length === 0) return null;
  return labels.slice(0, 4).join(" · ");
}

// ── Hero header matching shared shortlist design ─────────────────────────────
function PublicWishlistHero({
  data,
  totalPrice,
  avgRating,
  onShare,
  onOrderCreators,
  orderLabel,
}: {
  data: PublicWishlistResponse;
  totalPrice: number;
  avgRating: number | null;
  onShare: () => void;
  onOrderCreators: () => void;
  orderLabel: string;
}) {
  const sharerName = data.brand.contactFullName?.trim() || data.brand.brandName;
  const subtitle = buildSubtitle(data.creators);

  return (
    <section className="border-b border-gray-200/80 py-6 sm:py-10 lg:py-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="min-w-0 max-w-xl w-full">
          <div className="mb-5 flex w-full max-w-full items-start gap-2.5 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm sm:mb-6 sm:rounded-full sm:items-center">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-pink-500 text-xs font-bold text-white">
              {getInitials(sharerName)}
            </div>
            <p className="min-w-0 text-sm leading-snug text-gray-600">
              <span className="font-semibold text-gray-900">{sharerName}</span>
              {" at "}
              <span className="font-semibold text-gray-900">{data.brand.brandName}</span>
              {" shared a creator shortlist with you"}
            </p>
          </div>

          <div className="mb-3 flex items-center gap-1.5">
            <Bookmark size={13} className="fill-rose-500 text-rose-500" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500">
              Shared Shortlist
            </span>
          </div>

          <h1 className="mb-3 text-2xl font-black tracking-tight text-gray-900 sm:text-4xl sm:leading-[1.05] lg:text-[2.65rem]">
            {data.name}
          </h1>

          {subtitle ? (
            <p className="mb-5 text-base leading-relaxed text-gray-500">{subtitle}</p>
          ) : null}

          <p className="mb-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              {data.creators.length} creator{data.creators.length !== 1 ? "s" : ""}
            </span>
            {totalPrice > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span>
                  from <strong className="font-semibold text-gray-800">₹{totalPrice.toLocaleString("en-IN")}</strong> total
                </span>
              </>
            )}
            {avgRating !== null && avgRating > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <strong className="font-semibold text-gray-800">{avgRating.toFixed(1)}</strong> avg
                </span>
              </>
            )}
            {data.sharedAt && (
              <>
                <span className="text-gray-300">·</span>
                <span>shared {formatSharedDate(data.sharedAt)}</span>
              </>
            )}
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={onOrderCreators}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-600 sm:w-auto"
            >
              <Zap size={15} />
              {orderLabel}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>

          <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-gray-400 sm:mt-5 sm:items-center">
            <Lock size={12} className="shrink-0" />
            You&apos;re viewing a read-only shortlist · no account needed to browse
          </p>
        </div>

        {data.creators.length > 0 ? (
          <div className="hidden w-full min-w-0 items-center justify-center self-center overflow-hidden lg:flex lg:w-auto lg:self-auto">
            <HeroCardFan creators={data.creators} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function isValidImageUrl(url?: string | null): url is string {
  return (
    typeof url === "string" &&
    (url.startsWith("http://") || url.startsWith("https://"))
  );
}

// ── Fan of creator cards shown in hero ──────────────────────────────────────
function FanCard({
  creator,
  index,
  total,
  baseRotation,
  isActive,
  activeIndex,
  onHover,
}: {
  creator: WishlistCreator;
  index: number;
  total: number;
  baseRotation: number;
  isActive: boolean;
  activeIndex: number | null;
  onHover: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [g1, g2] = fanGradient(index);
  const initials = getInitials(creator.name);
  const profileUrl =
    isValidImageUrl(creator.profileImageUrl) && !imgError
      ? creator.profileImageUrl
      : null;

  const fanIsOpen = activeIndex !== null;
  const spread =
    activeIndex === null ? 0 : index < activeIndex ? -14 : index > activeIndex ? 14 : 0;
  const rotation = isActive ? 0 : fanIsOpen ? baseRotation * 0.55 : baseRotation;
  const lift = isActive ? -18 : 0;
  const scale = isActive ? 1.07 : 1;

  return (
    <div
      onMouseEnter={onHover}
      className="relative shrink-0 cursor-pointer overflow-hidden rounded-[24px] border-[3px] border-white shadow-[0_24px_48px_-14px_rgba(15,23,42,0.4)] transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[0_28px_56px_-12px_rgba(15,23,42,0.48)]"
      style={{
        width: 132,
        height: 184,
        marginLeft: index === 0 ? 0 : -44,
        background: profileUrl ? undefined : `linear-gradient(165deg, ${g1} 0%, ${g2} 100%)`,
        transform: `translateX(${spread}px) translateY(${lift}px) rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: "50% 100%",
        zIndex: isActive ? 30 : total - index,
      }}
    >
      {profileUrl ? (
        <Image
          src={profileUrl}
          alt={creator.name}
          fill
          className="object-cover"
          sizes="132px"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="text-[2.15rem] font-black tracking-tight text-white">
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}

function HeroCardFan({ creators }: { creators: WishlistCreator[] }) {
  const shown = creators.slice(0, 5);
  const baseRotations = [-14, -7, 0, 7, 14];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div
      className="flex w-full max-w-full items-end justify-center overflow-hidden px-2 py-4"
      style={{ minHeight: 220 }}
      onMouseLeave={() => setActiveIndex(null)}
    >
      {shown.map((creator, index) => (
        <FanCard
          key={creator.id}
          creator={creator}
          index={index}
          total={shown.length}
          baseRotation={baseRotations[index] ?? 0}
          isActive={activeIndex === index}
          activeIndex={activeIndex}
          onHover={() => setActiveIndex(index)}
        />
      ))}
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
  const router = useRouter();
  const pathname = usePathname();
  const loginHref = `/login?callbackUrl=${encodeURIComponent(pathname)}`;

  const { data: meUser } = usePublicAuthUser();
  const canUseBrand = meUser ? userCanUseBrandWorkspace(meUser) : false;
  const activeBrandId = meUser ? resolveClientActiveBrandId(meUser) : null;

  const [importOpen, setImportOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCreatorId, setDrawerCreatorId] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  const openDrawer = useCallback(
    (creator: Creator) => {
      if (canUseBrand) {
        router.push(`/brand/creators/${creator.id}`);
        return;
      }
      setSelectedCreator(creator);
      setDrawerCreatorId(creator.id);
      setDrawerOpen(true);
    },
    [canUseBrand, router],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-wishlist", shareToken],
    queryFn: () => getPublicWishlist(shareToken),
    staleTime: 0,
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

  const listingCreators = useMemo(
    () => data?.creators.map(mapProfileToListingCreator) ?? [],
    [data?.creators],
  );

  const isSameBrand = !!(
    data?.brandId &&
    activeBrandId &&
    data.brandId === activeBrandId
  );

  const orderLabel = useMemo(() => {
    if (!canUseBrand) return "Order these creators";
    if (isSameBrand) return "Open this shortlist";
    return "Save to my wishlists";
  }, [canUseBrand, isSameBrand]);

  const handleOrderCreators = useCallback(() => {
    if (!canUseBrand) {
      router.push(`/register/brand?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!data) return;
    if (isSameBrand) {
      router.push(`/brand/wishlists/${data.id}`);
      return;
    }
    setImportOpen(true);
  }, [canUseBrand, data, isSameBrand, pathname, router]);

  const registerHref = `/register/brand?callbackUrl=${encodeURIComponent(pathname)}`;
  const getStartedHref = meUser ? "/brand/creators" : registerHref;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#f5f5f3" }}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-white">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:min-h-12 sm:gap-3 sm:px-6 sm:py-0">
          <Link
            href="/"
            prefetch
            className="z-10 flex min-w-0 flex-1 items-center overflow-visible py-0.5 select-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset; matches navbar brand mark */}
            <img
              src="/brand-logo.png"
              alt={`${SITE_NAME} home`}
              width={688}
              height={160}
              className="h-11 w-auto max-w-[calc(100vw-7.5rem)] object-contain object-left sm:h-12 sm:max-w-[min(280px,calc(100vw-14rem))] md:h-14 md:max-w-[min(340px,calc(100vw-18rem))]"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Copy link"
              className="flex size-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm sm:font-medium"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Copy link</span>
            </button>
            <Link
              href={canUseBrand ? "/brand/wishlists" : loginHref}
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 min-[400px]:inline-flex sm:px-4"
            >
              {canUseBrand ? "My wishlists" : "Sign in"}
            </Link>
            <Link
              href={getStartedHref}
              className="rounded-full bg-rose-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-600 sm:px-4 sm:text-sm"
            >
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Get started free</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-[4.75rem] sm:px-6 sm:pt-20 md:px-10 md:pt-28">
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
            <PublicWishlistHero
              data={data}
              totalPrice={totalPrice ?? 0}
              avgRating={avgRating}
              onShare={handleCopyLink}
              onOrderCreators={handleOrderCreators}
              orderLabel={orderLabel}
            />

            {/* ── Creator grid ── */}
            <section className="pb-12 pt-6 sm:pb-16 sm:pt-8">
              <h2 className="mb-4 text-base font-bold text-gray-900 sm:mb-5 sm:text-lg">
                The shortlist{" "}
                <span className="font-normal text-gray-400">{data.creators.length} creators</span>
              </h2>

              {data.creators.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                  <p className="font-semibold text-gray-500">No creators in this shortlist yet.</p>
                </div>
              ) : (
                <div className="reelgrid browse-redesign-scope">
                  {listingCreators.map((creator, index) => (
                    <ReelCard
                      key={creator.id}
                      creator={creator}
                      index={index}
                      onOpen={openDrawer}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Bottom CTA ── */}
            <section className="mb-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-gray-900 px-5 py-8 sm:mb-12 sm:flex-row sm:items-center sm:gap-6 sm:rounded-3xl sm:px-8 sm:py-12">
              <div className="min-w-0">
                <h2 className="mb-1.5 text-xl font-black tracking-tight text-white sm:text-2xl">
                  Build your own creator shortlist
                </h2>
                <p className="max-w-md text-sm text-gray-400">
                  Browse 2,400+ vetted Indian UGC creators, save them into campaigns like this one, and order in a few clicks.
                </p>
              </div>
              <Link
                href={getStartedHref}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-100 sm:w-auto"
              >
                Get started free →
              </Link>
            </section>

            {/* ── Footer ── */}
            <footer className="flex flex-col items-start gap-4 pb-8 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:pb-10">
              <Link href="/" prefetch className="inline-flex shrink-0 items-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- footer brand mark matches site footer */}
                <img
                  src="/brand-logo.png"
                  alt={SITE_NAME}
                  width={688}
                  height={160}
                  className="h-14 w-auto max-w-[min(320px,calc(100vw-180px))] object-contain object-left sm:h-16 md:h-[4.5rem]"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </Link>
              <span className="text-gray-400">
                India&apos;s creator marketplace for brands · © {new Date().getFullYear()}
              </span>
            </footer>
          </>
        ) : null}
      </main>

      <ProfileDrawer
        creatorId={drawerCreatorId}
        open={drawerOpen}
        onClose={closeDrawer}
        creator={selectedCreator}
        landingPage
      />

      {data && importOpen ? (
        <ImportSharedWishlistDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          shareToken={shareToken}
          shortlistName={data.name}
          creatorCount={data.creators.length}
          sourceBrandName={data.brand.brandName}
        />
      ) : null}
    </div>
  );
}
