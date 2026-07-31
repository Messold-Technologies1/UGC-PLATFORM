"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, AlertTriangle, Plus, X } from "lucide-react";
import { useAdminLegalPagesQuery } from "@/features/admin/hooks/use-admin-legal-pages-query";
import {
  useDeleteLegalPageMutation,
  useCreateLegalPageMutation,
} from "@/features/admin/hooks/use-admin-legal-page-mutations";
import { Skeleton } from "@/components/ui/skeleton";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminLegalPagesList() {
  const router = useRouter();
  const { data, isLoading, isError } = useAdminLegalPagesQuery();
  const deleteMutation = useDeleteLegalPageMutation();
  const createMutation = useCreateLegalPageMutation();

  const [confirmingSlug, setConfirmingSlug] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newEffectiveDate, setNewEffectiveDate] = useState("");

  const openCreate = () => {
    setNewTitle("");
    setNewSlug("");
    setSlugEdited(false);
    setNewDescription("");
    setNewEffectiveDate("");
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const handleTitleChange = (value: string) => {
    setNewTitle(value);
    if (!slugEdited) setNewSlug(slugify(value));
  };

  // Only title + slug are required; description and effective date are optional.
  const canCreate = newTitle.trim() !== "" && newSlug.trim() !== "";

  const handleCreate = async () => {
    if (!canCreate) return;
    const slug = newSlug.trim();
    try {
      await createMutation.mutateAsync({
        slug,
        title: newTitle.trim(),
        description: newDescription.trim(),
        effectiveDate: newEffectiveDate.trim(),
      });
    } catch {
      // Error toast is handled by the mutation; keep the modal open to retry.
      return;
    }
    setIsCreateOpen(false);
    router.push(`/admin/legal/${slug}`);
  };

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
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 active:scale-95 transition-all shadow-sm whitespace-nowrap"
        >
          <Plus className="size-4" />
          Add New Legal Page
        </button>
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
                      {page.effectiveDate ? (
                        <>
                          <span>•</span>
                          {/* Free-text label — shown as entered, not re-parsed
                              as a date (it may be empty). */}
                          <span>Effective: {page.effectiveDate}</span>
                        </>
                      ) : null}
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

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeCreate}
        >
          <div
            className="glass-panel w-full max-w-lg rounded-2xl border border-border/50 bg-card p-6 space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Add New Legal Page
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create the page, then add content in the editor by hand or by
                  importing a file.
                </p>
              </div>
              <button
                onClick={closeCreate}
                disabled={createMutation.isPending}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Page Title
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Refund Policy"
                  className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setNewSlug(slugify(e.target.value));
                  }}
                  placeholder="refund-policy"
                  className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50 font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Lowercase letters, numbers and hyphens only. Used as{" "}
                  <span className="font-mono">/{newSlug || "your-slug"}</span>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Description (SEO &amp; Subtitle){" "}
                  <span className="normal-case text-muted-foreground/60">
                    — optional
                  </span>
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Short summary shown under the title and used for SEO."
                  className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50 resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Effective Date{" "}
                  <span className="normal-case text-muted-foreground/60">
                    — optional
                  </span>
                </label>
                <input
                  type="text"
                  value={newEffectiveDate}
                  onChange={(e) => setNewEffectiveDate(e.target.value)}
                  placeholder="e.g. June 16, 2026"
                  className="w-full glass-input rounded-lg px-4 py-2 text-sm bg-background/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={closeCreate}
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!canCreate || createMutation.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                {createMutation.isPending ? "Creating..." : "Create Page"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
