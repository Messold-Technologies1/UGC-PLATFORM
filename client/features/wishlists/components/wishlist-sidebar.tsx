"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateWishlistMutation } from "../hooks/use-create-wishlist-mutation";
import type { Wishlist } from "../api/types";

const ACCENT_COLORS = [
  "#3b82f6",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
];

interface WishlistSidebarProps {
  wishlists: Wishlist[];
  activeId: string | null;
  isLoading?: boolean;
}

export function WishlistSidebar({ wishlists, activeId, isLoading }: WishlistSidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const createMutation = useCreateWishlistMutation();

  const totalCreators = wishlists.reduce((sum, w) => sum + w.creatorCount, 0);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    try {
      await createMutation.mutateAsync({ name });
      toast.success(`Wishlist "${name}" created`);
      setNewName("");
      setShowCreate(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create wishlist");
    }
  }

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm border border-border/40 flex flex-col gap-3"
      data-tour="brand-wishlists-sidebar"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">Wishlists</h2>
          {!isLoading && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalCreators} creator{totalCreators !== 1 ? "s" : ""} across {wishlists.length} list{wishlists.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="size-8 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shrink-0"
          aria-label="New wishlist"
          data-tour="brand-wishlists-create"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Inline create input */}
      {showCreate && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name it — e.g. Holi Launch"
            className="flex-1 min-w-0 h-9 rounded-xl border border-border px-3 text-sm outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-200 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowCreate(false);
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || createMutation.isPending}
            className="size-9 rounded-xl bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 disabled:opacity-50 transition-colors shrink-0"
          >
            {createMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRight size={14} />
            )}
          </button>
        </div>
      )}

      {/* Wishlist list */}
      <div className="flex flex-col gap-0.5" data-tour="brand-wishlists-list">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : wishlists.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No wishlists yet</p>
        ) : (
          wishlists.map((w, i) => {
            const isActive = w.id === activeId;
            const color = ACCENT_COLORS[i % ACCENT_COLORS.length]!;
            return (
              <Link
                key={w.id}
                href={`/brand/wishlists/${w.id}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group",
                  isActive
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50 border border-transparent"
                )}
              >
                <div
                  className="w-1 h-7 rounded-full shrink-0"
                  style={{ background: color }}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", isActive ? "text-blue-700" : "text-foreground")}>
                    {w.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {w.creatorCount} creator{w.creatorCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className={cn(
                  "size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isActive ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                )}>
                  {w.creatorCount}
                </span>
              </Link>
            );
          })
        )}
      </div>

      {/* Browse creators button */}
      <Link
        href="/brand/creators"
        data-tour="brand-wishlists-browse"
        className="flex items-center justify-center gap-2 rounded-xl border border-border/60 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-gray-50 transition-colors mt-1"
      >
        <Users size={14} />
        Browse creators
      </Link>
    </div>
  );
}
