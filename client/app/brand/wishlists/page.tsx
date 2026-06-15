"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Bookmark,
  Users,
  Pencil,
  Trash2,
  Share2,
  Check,
  Loader2,
  X,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWishlistsQuery,
  useWishlistDetailQuery,
  useCreateWishlistMutation,
  useUpdateWishlistMutation,
  useDeleteWishlistMutation,
  useToggleCreatorWishlistMutation,
  useEnableWishlistShareMutation,
  useDisableWishlistShareMutation,
} from "@/features/wishlists/hooks/use-wishlists-query";
import type { WishlistApi } from "@/features/wishlists/api/types";
import { ProfileDrawer } from "@/features/creators/components/browse-creators/profile-drawer";
import { ReelCard } from "@/features/creators/components/browse-creators/reel-card";
import type { Creator } from "@/features/creators/types";
import { mapProfileToListingCreator } from "@/features/creators/api/map-profile-to-creator";
import type { CreatorPublicListItemApi } from "@/features/creators/api/types";
import { SaveToWishlistModal } from "@/features/wishlists/components/save-to-wishlist-modal";

const DOT_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];
function dotColor(index: number): string {
  return DOT_COLORS[index % DOT_COLORS.length]!;
}

function WishlistReelCard({
  creator,
  index,
  wishlistId,
  onOpen,
}: {
  creator: CreatorPublicListItemApi;
  index: number;
  wishlistId: string;
  onOpen: (creator: Creator) => void;
}) {
  const toggleMutation = useToggleCreatorWishlistMutation();
  const [wishlistCreator, setWishlistCreator] = useState<Creator | null>(null);
  const mapped = mapProfileToListingCreator(creator);

  const handleWishlist = useCallback(() => {
    // On the wishlists page the heart removes from this list directly
    toggleMutation.mutate(
      { wishlistId, creatorId: creator.id },
      {
        onSuccess: () => toast.success("Removed from wishlist"),
        onError: () => toast.error("Failed to remove"),
      },
    );
  }, [toggleMutation, wishlistId, creator.id]);

  return (
    <>
      <ReelCard
        creator={mapped}
        index={index}
        onOpen={onOpen}
        onWishlist={handleWishlist}
      />
      {wishlistCreator && (
        <SaveToWishlistModal
          open={!!wishlistCreator}
          onClose={() => setWishlistCreator(null)}
          creatorId={wishlistCreator.id}
          creatorName={wishlistCreator.name}
        />
      )}
    </>
  );
}

function CreateWishlistInline({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState("");
  const createMutation = useCreateWishlistMutation();

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName("");
          onDone?.();
        },
        onError: () => toast.error("Failed to create wishlist"),
      },
    );
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
        }}
        placeholder="New wishlist name"
        autoFocus
        className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
      />
      <button
        type="button"
        onClick={handleCreate}
        disabled={!name.trim() || createMutation.isPending}
        className="flex size-7 items-center justify-center rounded-lg bg-pink-500 text-white disabled:opacity-50"
      >
        {createMutation.isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Check size={13} />
        )}
      </button>
    </div>
  );
}

export default function WishlistsPage() {
  const { data, isLoading } = useWishlistsQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCreator, setDrawerCreator] = useState<Creator | null>(null);

  const updateMutation = useUpdateWishlistMutation();
  const deleteMutation = useDeleteWishlistMutation();
  const shareMutation = useEnableWishlistShareMutation();
  const unshareMutation = useDisableWishlistShareMutation();

  const wishlists = data?.items ?? [];
  const selected =
    wishlists.find((w) => w.id === selectedId) ?? wishlists[0] ?? null;
  const activeId = selected?.id ?? null;

  const { data: detail, isLoading: detailLoading } =
    useWishlistDetailQuery(activeId);

  const openDrawer = useCallback((creator: Creator) => {
    setDrawerCreator(creator);
    setDrawerOpen(true);
  }, []);

  const handleSelect = (wishlist: WishlistApi) => {
    setSelectedId(wishlist.id);
    setEditingName(false);
  };

  const handleStartEdit = () => {
    setEditingName(true);
    setEditedName(selected?.name ?? "");
  };

  const handleSaveEdit = () => {
    if (!selected || !editedName.trim()) return;
    updateMutation.mutate(
      { id: selected.id, name: editedName.trim() },
      {
        onSuccess: () => setEditingName(false),
        onError: () => toast.error("Failed to rename"),
      },
    );
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(selected.id, {
      onSuccess: () => setSelectedId(null),
      onError: () => toast.error("Failed to delete"),
    });
  };

  const handleShare = () => {
    if (!selected) return;
    if (selected.shareEnabled && selected.shareToken) {
      // Already shared — just copy the link
      const url = `${window.location.origin}/wishlists/share/${selected.shareToken}`;
      void navigator.clipboard
        .writeText(url)
        .then(() =>
          toast.success(`Share link for "${selected.name}" copied`),
        );
      return;
    }
    shareMutation.mutate(selected.id, {
      onSuccess: (result) => {
        const url = `${window.location.origin}/wishlists/share/${result.shareToken}`;
        void navigator.clipboard.writeText(url).then(() => {
          toast.success(`Share link for "${selected.name}" copied`);
        });
      },
      onError: () => toast.error("Failed to generate share link"),
    });
  };

  const handleMakePrivate = () => {
    if (!selected) return;
    unshareMutation.mutate(selected.id, {
      onSuccess: () => toast.success(`"${selected.name}" is now private`),
      onError: () => toast.error("Failed to make private"),
    });
  };

  const totalCreators = wishlists.reduce((s, w) => s + w.creatorCount, 0);
  const minPrice = detail?.creators
    .flatMap((c) => c.packages.map((p) => Number(p.priceAmount)))
    .filter((n) => !isNaN(n) && n > 0)
    .sort((a, b) => a - b)[0];

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-100 bg-white">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Wishlists</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalCreators} creator{totalCreators !== 1 ? "s" : ""} across{" "}
              {wishlists.length} list{wishlists.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="flex size-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            {showCreate ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>

        {showCreate && (
          <CreateWishlistInline onDone={() => setShowCreate(false)} />
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-200" />
            </div>
          ) : wishlists.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400">
              No wishlists yet
            </p>
          ) : (
            wishlists.map((w, index) => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleSelect(w)}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 ${
                  (selectedId ?? wishlists[0]?.id) === w.id ? "bg-pink-50" : ""
                }`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: dotColor(index) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {w.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {w.creatorCount} creator{w.creatorCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 p-3">
          <Link
            href="/brand/creators"
            className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            <Users size={15} /> Browse creators
          </Link>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex flex-1 flex-col overflow-hidden bg-[#f4f4f5]">
        {!selected && !isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-pink-50">
              <Bookmark size={24} className="text-pink-500" />
            </div>
            <p className="text-lg font-semibold text-gray-800">
              No wishlists yet
            </p>
            <p className="text-sm text-gray-400">
              Save creators you love to a wishlist
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600"
            >
              <Plus size={16} /> Create your first wishlist
            </button>
          </div>
        ) : selected ? (
          <>
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 shrink-0">
              <div>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      autoFocus
                      className="rounded-lg border border-gray-200 px-2 py-1 text-base font-semibold outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                    />
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                      className="flex size-7 items-center justify-center rounded-lg bg-pink-500 text-white"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="flex size-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <h1 className="text-lg font-semibold text-gray-900">
                    {selected.name}
                  </h1>
                )}
                <p className="mt-0.5 text-xs text-gray-400">
                  {selected.creatorCount} creator
                  {selected.creatorCount !== 1 ? "s" : ""}
                  {minPrice
                    ? ` · from ₹${minPrice.toLocaleString("en-IN")} total`
                    : ""}
                  {" · created "}
                  {formatDistanceToNow(new Date(selected.createdAt), {
                    addSuffix: true,
                  })}
                  {selected.shareEnabled && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                      <Share2 size={10} /> Shared
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/brand/creators"
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus size={13} /> Add creators
                </Link>

                {/* Share / Make private toggle */}
                {selected.shareEnabled ? (
                  <>
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={shareMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                      title="Copy share link"
                    >
                      <Share2 size={13} /> Copy link
                    </button>
                    <button
                      type="button"
                      onClick={handleMakePrivate}
                      disabled={unshareMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="Make private"
                    >
                      {unshareMutation.isPending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Lock size={13} />
                      )}{" "}
                      Make private
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={shareMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    title="Share wishlist"
                  >
                    {shareMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Share2 size={13} />
                    )}{" "}
                    Share
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  title="Rename"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  title="Delete wishlist"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            </div>

            {/* Creator grid */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-gray-300" />
                </div>
              ) : !detail?.creators.length ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <Bookmark size={32} className="text-gray-200" />
                  <p className="text-sm text-gray-400">
                    This wishlist is empty
                  </p>
                  <Link
                    href="/brand/creators"
                    className="text-sm font-medium text-pink-600 hover:underline"
                  >
                    Browse creators →
                  </Link>
                </div>
              ) : (
                <div className="reelgrid browse-redesign-scope">
                  {detail.creators.map((creator, index) => (
                    <div key={creator.id} className="min-w-0 h-full">
                      <WishlistReelCard
                        creator={creator}
                        index={index}
                        wishlistId={activeId!}
                        onOpen={openDrawer}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>

      <ProfileDrawer
        creatorId={drawerCreator?.id ?? null}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        creator={drawerCreator}
      />
    </div>
  );
}
