"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Plus, Check, Loader2, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useWishlistsQuery,
  useCreatorWishlistStatusQuery,
  useToggleCreatorWishlistMutation,
  useCreateWishlistMutation,
} from "../hooks/use-wishlists-query";

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

interface SaveToWishlistModalProps {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
}

export function SaveToWishlistModal({
  open,
  onClose,
  creatorId,
  creatorName,
}: SaveToWishlistModalProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: wishlistsData, isLoading: loadingLists } = useWishlistsQuery();
  const { data: statusData, isLoading: loadingStatus } =
    useCreatorWishlistStatusQuery(creatorId, { enabled: open });

  const toggleMutation = useToggleCreatorWishlistMutation();
  const createMutation = useCreateWishlistMutation();

  useEffect(() => {
    if (showCreate) inputRef.current?.focus();
  }, [showCreate]);

  const handleToggle = useCallback(
    (wishlistId: string, wishlistName: string) => {
      toggleMutation.mutate(
        { wishlistId, creatorId },
        {
          onSuccess: (result) => {
            if (result.added) {
              toast.success(`Saved to "${wishlistName}"`);
            } else {
              toast.success(`Removed from "${wishlistName}"`);
            }
          },
          onError: () => toast.error("Something went wrong"),
        },
      );
    },
    [toggleMutation, creatorId],
  );

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(
      { name, creatorIds: [creatorId] },
      {
        onSuccess: () => {
          toast.success(`Created "${name}" and saved ${creatorName}`);
          setNewName("");
          setShowCreate(false);
        },
        onError: () => toast.error("Failed to create wishlist"),
      },
    );
  }, [createMutation, creatorId, creatorName, newName]);

  const lists = wishlistsData?.items ?? [];
  const statusMap = new Map(
    (statusData?.items ?? []).map((s) => [s.id, s.saved]),
  );

  const savedWishlist = statusData?.items.find((s) => s.saved);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <BookmarkCheck size={18} className="text-pink-500" />
            <span className="font-semibold text-gray-900 text-sm">
              Save {creatorName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Create new */}
        <div className="border-b border-gray-100 px-4 py-2">
          {showCreate ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                  if (e.key === "Escape") setShowCreate(false);
                }}
                placeholder="Wishlist name"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              />
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={!newName.trim() || createMutation.isPending}
                className="flex size-8 items-center justify-center rounded-lg bg-pink-500 text-white disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-pink-600 hover:bg-pink-50"
            >
              <Plus size={16} /> Create a new wishlist
            </button>
          )}
        </div>

        {/* Wishlist list */}
        <div className="max-h-64 overflow-y-auto py-1">
          {loadingLists || loadingStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : lists.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No wishlists yet
            </p>
          ) : (
            lists.map((list, index) => {
              const saved = statusMap.get(list.id) ?? false;
              const isBusy =
                toggleMutation.isPending &&
                toggleMutation.variables?.wishlistId === list.id;
              return (
                <div
                  key={list.id}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: dotColor(index) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {list.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {list.creatorCount} creator{list.creatorCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(list.id, list.name)}
                    disabled={isBusy}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      saved
                        ? "bg-pink-50 text-pink-600 hover:bg-pink-100"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : saved ? (
                      <>
                        <Check size={12} /> Saved
                      </>
                    ) : (
                      <>
                        <Plus size={12} /> Add
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {savedWishlist && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
            <p className="text-xs text-gray-500">
              Saved to{" "}
              <span className="font-medium text-gray-700">
                {savedWishlist.name}
              </span>
            </p>
            <Link
              href="/brand/wishlists"
              onClick={onClose}
              className="text-xs font-medium text-pink-600 hover:underline"
            >
              View all wishlists →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
