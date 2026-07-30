"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Trash2, AlertTriangle } from "lucide-react";
import { useAdminLegalPagesQuery } from "@/features/admin/hooks/use-admin-legal-pages-query";
import { useDeleteLegalPageMutation } from "@/features/admin/hooks/use-admin-legal-page-mutations";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLegalPagesList() {
  const { data, isLoading, isError } = useAdminLegalPagesQuery();
  const deleteMutation = useDeleteLegalPageMutation();

  const [confirmingSlug, setConfirmingSlug] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const startDelete = (slug: string) => {
    setConfirmingSlug(slug);
    setConfirmText("");
  };

  const cancelDelete = () => {
    setConfirmingSlug(null);
    setConfirmText("");
  };

  const handleDelete = async (slug: string) => {
    await deleteMutation.mutateAsync(slug);
    cancelDelete();
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Legal Pages
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage terms, privacy policies, and other legal content.
          </p>
        </div>
      </div>

      {isError && !isLoading && (
        <div className="rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground glass-panel">
          We could not load legal pages right now. Try again shortly.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="glass-panel flex items-center justify-between gap-4 rounded-2xl border border-border/10 bg-card/10 p-5"
            >
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
          ))}

        {!isLoading && data?.pages.length === 0 && (
          <div className="rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground glass-panel">
            No legal pages found.
          </div>
        )}

        {!isLoading &&
          data?.pages.map((page) => {
            const isConfirming = confirmingSlug === page.slug;
            const isDeletingThis =
              deleteMutation.isPending && confirmingSlug === page.slug;

            return (
              <div
                key={page.id}
                className="glass-panel flex flex-col gap-4 rounded-2xl border border-border/10 bg-card/10 p-5 transition-colors hover:bg-card/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-foreground text-lg">
                        {page.title}
                      </h3>
                      {page.draftStatus === "DRAFT" && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                          Draft Saved
                        </span>
                      )}
                      {page.draftStatus === "IN_REVIEW" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                          In Review
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>/{page.slug}</span>
                      <span>•</span>
                      <span>{page.sectionCount} sections</span>
                      <span>•</span>
                      <span>
                        Effective:{" "}
                        {format(new Date(page.effectiveDate), "MMM d, yyyy")}
                      </span>
                      <span>•</span>
                      <span>
                        Last Updated:{" "}
                        {format(new Date(page.updatedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/legal/${page.slug}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-background px-4 py-2 text-sm font-semibold text-foreground border border-border hover:bg-muted transition-colors shadow-sm whitespace-nowrap"
                    >
                      {page.draftStatus ? "Continue Editing" : "Edit Page"}
                    </Link>
                    <button
                      onClick={() => startDelete(page.slug)}
                      disabled={deleteMutation.isPending || isConfirming}
                      title="Delete this legal page"
                      className="inline-flex items-center justify-center rounded-lg border border-red-500/30 p-2 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {isConfirming && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="size-5 text-red-500 mt-0.5 shrink-0" />
                      <div className="text-sm text-red-600 dark:text-red-400">
                        <p className="font-semibold">
                          Permanently delete “{page.title}”?
                        </p>
                        <p className="mt-1 text-red-600/80 dark:text-red-400/80">
                          This removes the page and its entire version history.
                          The public page will fall back to its built-in
                          default. This cannot be undone. Type{" "}
                          <code className="font-mono font-bold">
                            {page.slug}
                          </code>{" "}
                          to confirm.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={page.slug}
                        className="flex-1 glass-input rounded-lg px-3 py-2 text-sm bg-background/50 font-mono"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelDelete}
                          disabled={isDeletingThis}
                          className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(page.slug)}
                          disabled={
                            confirmText !== page.slug || isDeletingThis
                          }
                          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          <Trash2 className="size-4" />
                          {isDeletingThis ? "Deleting..." : "Delete Page"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
