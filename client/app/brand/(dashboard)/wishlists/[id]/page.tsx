"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Share2,
  Pencil,
  X,
  Plus,
  Check,
  Loader2,
  Lock,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreatorCardSkeleton } from "@/features/creators/components/creator-card";
import { CreatorCard } from "@/features/creators/components/creator-card";
import { ProfileDrawer } from "@/features/creators/components/browse-creators/profile-drawer";
import { mapProfileToListingCreator } from "@/features/creators/api/map-profile-to-creator";
import type { Creator } from "@/features/creators/types";
import { WishlistSidebar } from "@/features/wishlists/components/wishlist-sidebar";
import { DeleteWishlistDialog } from "@/features/wishlists/components/delete-wishlist-dialog";
import { RemoveCreatorsDialog } from "@/features/wishlists/components/remove-creators-dialog";
import { useWishlistsQuery } from "@/features/wishlists/hooks/use-wishlists-query";
import { useWishlistDetailQuery } from "@/features/wishlists/hooks/use-wishlist-detail-query";
import { useEnableWishlistShareMutation } from "@/features/wishlists/hooks/use-enable-wishlist-share-mutation";
import { useDisableWishlistShareMutation } from "@/features/wishlists/hooks/use-disable-wishlist-share-mutation";
import { useUpdateWishlistMutation } from "@/features/wishlists/hooks/use-update-wishlist-mutation";
import "@/features/creators/components/browse-creators/browse-creators.css";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default function WishlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: allData, isLoading: listsLoading } = useWishlistsQuery();
  const wishlists = allData?.items ?? [];

  const { data: wishlist, isLoading: detailLoading } =
    useWishlistDetailQuery(id);
  const enableShareMutation = useEnableWishlistShareMutation(id);
  const disableShareMutation = useDisableWishlistShareMutation(id);
  const updateMutation = useUpdateWishlistMutation(id);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeCreatorsOpen, setRemoveCreatorsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCreatorId, setDrawerCreatorId] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // On mobile the sidebar (wishlist list) sits above the content, so opening a
  // wishlist leaves its creators off-screen at the bottom. Scroll the content
  // into view once it's ready. Re-runs when switching between wishlists.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (detailLoading || !wishlist) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [id, detailLoading, wishlist]);

  const openDrawer = useCallback((creator: Creator) => {
    setSelectedCreator(creator);
    setDrawerCreatorId(creator.id);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const listingCreators = useMemo(
    () => wishlist?.creators.map(mapProfileToListingCreator) ?? [],
    [wishlist?.creators],
  );

  function startEdit() {
    setEditName(wishlist?.name ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === wishlist?.name) {
      setEditing(false);
      return;
    }
    try {
      await updateMutation.mutateAsync({ name: trimmed });
      toast.success("Wishlist renamed");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to rename");
    } finally {
      setEditing(false);
    }
  }

  async function handleShare() {
    try {
      if (wishlist?.shareEnabled && wishlist.shareToken) {
        // Already shared — just copy the link
        const url = `${window.location.origin}/wishlists/share/${wishlist.shareToken}`;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard");
      } else {
        // Enable sharing
        const res = await enableShareMutation.mutateAsync();
        if (res.shareEnabled && res.shareToken) {
          const url = `${window.location.origin}/wishlists/share/${res.shareToken}`;
          await navigator.clipboard.writeText(url);
          toast.success("Sharing enabled — link copied to clipboard");
        }
      }
    } catch {
      toast.error("Failed to enable sharing");
    }
  }

  async function handleMakePrivate() {
    try {
      await disableShareMutation.mutateAsync();
      toast.success("Wishlist is now private");
    } catch {
      toast.error("Failed to disable sharing");
    }
  }

  const totalPrice = (wishlist?.creators ?? [])
    .map((c) => {
      if (!c.packages || c.packages.length === 0) return 0;
      return Math.min(...c.packages.map((p) => Number(p.priceAmount)));
    })
    .reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col bg-gray-50 lg:flex-row flex-1 border-t border-gray-200/60 mt-3 lg:mt-4">
      <aside className="w-full pl-4 sm:pl-6 lg:pl-8 xl:pl-10 2xl:pl-12 pr-4 pt-6 pb-6 lg:sticky lg:top-24 lg:z-10 lg:w-[300px] lg:shrink-0 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
        <WishlistSidebar
          wishlists={wishlists}
          activeId={id}
          isLoading={listsLoading}
        />
      </aside>

      <div
        ref={contentRef}
        className="flex-1 min-w-0 w-full pr-4 sm:pr-6 lg:pr-8 xl:pr-10 2xl:pr-12 pl-4 pt-6 pb-6 scroll-mt-20"
      >
        {detailLoading ? (
          <div className="space-y-4">
            <div className="h-8 w-56 rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-72 rounded-lg bg-muted animate-pulse" />
            <div className="reelgrid reelgrid-wishlist browse-redesign-scope mt-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <CreatorCardSkeleton key={i} appearance="browse" />
              ))}
            </div>
          </div>
        ) : !wishlist ? (
          <p className="text-muted-foreground">Wishlist not found.</p>
        ) : (
          <>
            {!listsLoading && wishlists.length > 0 ? (
              <div
                className="mb-4 lg:hidden"
                data-tour="brand-wishlists-mobile-switch"
              >
                <Select
                  value={id}
                  onValueChange={(wishlistId) =>
                    router.push(`/brand/wishlists/${wishlistId}`)
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white shadow-sm">
                    <SelectValue placeholder="Switch wishlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {wishlists.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.creatorCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-1">
              {editing ? (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-xl sm:text-2xl font-bold border-b-2 border-rose-400 bg-transparent outline-none min-w-0 w-full"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    onBlur={saveEdit}
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={updateMutation.isPending}
                    className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-rose-500 text-white"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                  </button>
                </div>
              ) : (
                <h1
                  className="text-xl sm:text-2xl font-bold tracking-tight cursor-pointer hover:opacity-75 transition-opacity min-w-0 truncate flex-1"
                  onClick={startEdit}
                  title="Click to rename"
                  data-tour="brand-wishlists-title"
                >
                  {wishlist.name}
                </h1>
              )}

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto pb-0.5 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0">
                {/* Add creators */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-xl"
                      asChild
                      aria-label="Add creators"
                    >
                      <Link
                        href="/brand/creators"
                        data-tour="brand-wishlists-add-creators"
                      >
                        <Plus size={15} />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    Browse and add creators
                  </TooltipContent>
                </Tooltip>

                {/* Remove creators */}
                {listingCreators.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setRemoveCreatorsOpen(true)}
                        aria-label="Remove creators"
                        data-tour="brand-wishlists-remove-creators"
                      >
                        <UserMinus size={15} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Remove creators
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Share / Copy link / Make private */}
                {wishlist.shareEnabled ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={handleShare}
                          disabled={enableShareMutation.isPending}
                          aria-label="Copy share link"
                          data-tour="brand-wishlists-share"
                        >
                          {enableShareMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Share2 size={14} />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>
                        Copy share link
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-xl"
                          onClick={handleMakePrivate}
                          disabled={disableShareMutation.isPending}
                          aria-label="Make private"
                          data-tour="brand-wishlists-make-private"
                        >
                          {disableShareMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Lock size={14} />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>
                        Make private
                      </TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-xl"
                        onClick={handleShare}
                        disabled={enableShareMutation.isPending}
                        aria-label="Share wishlist"
                        data-tour="brand-wishlists-share"
                      >
                        {enableShareMutation.isPending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Share2 size={14} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Share wishlist
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Rename */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-xl"
                      onClick={startEdit}
                      disabled={editing || updateMutation.isPending}
                      aria-label="Rename wishlist"
                      data-tour="brand-wishlists-rename"
                    >
                      <Pencil size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    Rename wishlist
                  </TooltipContent>
                </Tooltip>

                {/* Delete */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-xl"
                      onClick={() => setDeleteOpen(true)}
                      aria-label="Delete wishlist"
                      data-tour="brand-wishlists-delete"
                    >
                      <X size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    Delete wishlist
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-5 flex items-center gap-1.5 flex-wrap">
              <span>
                {wishlist.creatorCount} creator
                {wishlist.creatorCount !== 1 ? "s" : ""}
              </span>
              {totalPrice !== undefined && totalPrice > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span>from ₹{totalPrice.toLocaleString("en-IN")} total</span>
                </>
              )}
              <span className="opacity-40">·</span>
              <span>created {timeAgo(wishlist.createdAt)}</span>
            </p>

            <hr className="border-border/40 mb-6" />

            {listingCreators.length === 0 ? (
              <div
                className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center"
                data-tour="brand-wishlists-creators"
              >
                <p className="font-semibold">No creators saved yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse creators and save them to this wishlist.
                </p>
                <Button className="mt-4 rounded-full gap-2" size="sm" asChild>
                  <Link href="/brand/creators">
                    <Plus size={14} /> Browse Creators
                  </Link>
                </Button>
              </div>
            ) : (
              <div
                className="reelgrid reelgrid-wishlist browse-redesign-scope !mt-0"
                data-tour="brand-wishlists-creators"
              >
                {listingCreators.map((creator, index) => (
                  <CreatorCard
                    key={creator.id}
                    creator={creator}
                    index={index}
                    onOpen={openDrawer}
                    isBrand
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ProfileDrawer
        creatorId={drawerCreatorId}
        open={drawerOpen}
        onClose={closeDrawer}
        creator={selectedCreator}
      />

      {wishlist ? (
        <>
          <DeleteWishlistDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            wishlistId={wishlist.id}
            wishlistName={wishlist.name}
            creatorCount={wishlist.creatorCount}
            onDeleted={() => {
              toast.success("Wishlist deleted");
              router.push("/brand/wishlists");
            }}
          />
          <RemoveCreatorsDialog
            open={removeCreatorsOpen}
            onOpenChange={setRemoveCreatorsOpen}
            wishlistId={wishlist.id}
            wishlistName={wishlist.name}
            creators={wishlist.creators}
          />
        </>
      ) : null}
    </div>
  );
}
