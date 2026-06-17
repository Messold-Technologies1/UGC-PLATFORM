"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { WishlistSidebar } from "@/features/wishlists/components/wishlist-sidebar";
import { useWishlistsQuery } from "@/features/wishlists/hooks/use-wishlists-query";

export default function WishlistsPage() {
  const router = useRouter();
  const { data, isLoading } = useWishlistsQuery();
  const wishlists = data?.items ?? [];

  useEffect(() => {
    if (!isLoading && wishlists.length > 0) {
      router.replace(`/brand/wishlists/${wishlists[0]!.id}`);
    }
  }, [isLoading, wishlists, router]);

  return (
    <div className="flex bg-gray-50">
      <aside className="sticky top-24 z-10 w-[300px] shrink-0 self-start p-4 max-h-[calc(100dvh-7rem)] overflow-y-auto">
        <WishlistSidebar wishlists={wishlists} activeId={null} isLoading={isLoading} />
      </aside>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 min-h-[calc(100vh-12rem)]">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm mb-4">
          <Heart className="size-6 text-rose-400" />
        </div>
        <p className="text-lg font-semibold">Select a wishlist</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Choose a wishlist from the sidebar to view its creators.
        </p>
      </div>
    </div>
  );
}
