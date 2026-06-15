"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { Spinner } from "@/components/ui/spinner";
import type { PublicWishlistResponse, WishlistCreator } from "@/features/wishlists/api/types";

async function getPublicWishlist(shareToken: string): Promise<PublicWishlistResponse> {
  const { data } = await api.get<PublicWishlistResponse>(ENDPOINTS.WISHLISTS.PUBLIC(shareToken));
  return data;
}

function CreatorCard({ creator }: { creator: WishlistCreator }) {
  const previewVideo = creator.portfolioVideos?.[0];
  const hasImage = !!creator.profileImageUrl;

  return (
    <div className="flex flex-col rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {previewVideo?.thumbnailUrl ? (
          <Image
            src={previewVideo.thumbnailUrl}
            alt={creator.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : hasImage ? (
          <Image
            src={creator.profileImageUrl!}
            alt={creator.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-primary/5">
            <Users className="size-12 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-sm truncate">{creator.name}</div>
        {creator.city && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{creator.city}</div>
        )}
        {creator.avgRating && (
          <div className="text-xs text-amber-500 mt-0.5">
            ★ {parseFloat(creator.avgRating).toFixed(1)}
          </div>
        )}
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
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-10 md:px-10">
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Spinner className="size-8 text-primary" />
          </div>
        ) : isError ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <AlertCircle className="size-8 text-destructive mb-3" />
            <h3 className="text-lg font-bold">Wishlist not found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This wishlist is no longer available or the link is invalid.
            </p>
          </div>
        ) : data ? (
          <>
            <div className="mb-8">
              {data.brand.logoUrl && (
                <div className="mb-4">
                  <Image
                    src={data.brand.logoUrl}
                    alt={data.brand.brandName}
                    width={80}
                    height={80}
                    className="rounded-xl object-contain"
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-1">
                Curated by <span className="font-semibold text-foreground">{data.brand.brandName}</span>
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight">{data.name}</h1>
              <p className="mt-2 text-muted-foreground">
                {data.creators.length} creator{data.creators.length !== 1 ? "s" : ""}
              </p>
            </div>

            {data.creators.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50 p-6 text-center">
                <Users className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-bold tracking-tight">No creators yet</h3>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {data.creators.map((creator) => (
                  <CreatorCard key={creator.id} creator={creator} />
                ))}
              </div>
            )}

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                Powered by{" "}
                <Link href="/" className="font-semibold text-primary hover:underline">
                  UGC Platform
                </Link>
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
