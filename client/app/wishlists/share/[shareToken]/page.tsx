import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, Building2, ExternalLink, Bookmark } from "lucide-react";
import { ENDPOINTS } from "@/lib/endpoints";
import { getInitials, posterColor } from "@/lib/utils";
import type { CreatorPublicListItemApi } from "@/features/creators/api/types";

export const revalidate = 300;

async function getSharedWishlist(shareToken: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const base = apiUrl.replace(/\/api$/, "");
  const res = await fetch(
    `${base}${ENDPOINTS.WISHLISTS.PUBLIC(shareToken)}`,
    { next: { revalidate: 300 } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load wishlist");
  return res.json() as Promise<{
    id: string;
    name: string;
    brand: { brandName: string; logoUrl?: string | null };
    creators: CreatorPublicListItemApi[];
  }>;
}

function CreatorCard({
  creator,
  index,
}: {
  creator: CreatorPublicListItemApi;
  index: number;
}) {
  const [g1, g2] = posterColor(index);
  const minPrice = creator.packages
    .map((p) => Number(p.priceAmount))
    .filter((n) => !isNaN(n) && n > 0)
    .sort((a, b) => a - b)[0];
  const rating = creator.avgRating ? Number(creator.avgRating) : null;
  const location = [creator.city, creator.countryName].filter(Boolean).join(", ");
  const categories = creator.facetSelections
    ?.filter((f) => f.dimension === "CONTENT_CATEGORY")
    .slice(0, 2)
    .map((f) => f.label) ?? [];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
      {/* Poster */}
      <div
        className="relative h-44 shrink-0"
        style={{ background: `linear-gradient(155deg, ${g1}, ${g2})` }}
      >
        {creator.profileImageUrl ? (
          <Image
            src={creator.profileImageUrl}
            alt={creator.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-white/70">
              {getInitials(creator.name)}
            </span>
          </div>
        )}

        {rating !== null && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
            <Star size={10} fill="#ffd24a" color="#ffd24a" />
            {rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-semibold text-gray-900 truncate">{creator.name}</p>

        {location && (
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin size={11} /> {location}
          </p>
        )}

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            {minPrice && (
              <>
                <p className="text-[10px] text-gray-400 leading-none">Starting from</p>
                <p className="text-sm font-bold text-gray-900">
                  ₹{minPrice.toLocaleString("en-IN")}
                </p>
              </>
            )}
          </div>
          <Link
            href={`/register/brand`}
            className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
          >
            View <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function SharedWishlistPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const wishlist = await getSharedWishlist(shareToken);
  if (!wishlist) notFound();

  const { name, brand, creators } = wishlist;

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
            GoCollab
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/register/brand"
              className="rounded-full bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Wishlist hero */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100">
              <Bookmark size={22} className="text-pink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt={brand.brandName}
                    width={18}
                    height={18}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <Building2 size={14} className="text-gray-400" />
                )}
                <span>Curated by {brand.brandName}</span>
                <span className="text-gray-300">·</span>
                <span>
                  {creators.length} creator{creators.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/register/brand"
            className="shrink-0 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pink-600"
          >
            Book a creator →
          </Link>
        </div>

        {/* Creators grid */}
        {creators.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Bookmark size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400">This wishlist is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {creators.map((creator, index) => (
              <CreatorCard key={creator.id} creator={creator} index={index} />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-14 rounded-2xl bg-white px-8 py-10 text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Want to work with these creators?
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Sign up as a brand on GoCollab to browse, book, and pay creators
            securely.
          </p>
          <Link
            href="/register/brand"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Get started free →
          </Link>
        </div>
      </main>
    </div>
  );
}
