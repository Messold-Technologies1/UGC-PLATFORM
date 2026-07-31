"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, AlertTriangle, Plus, X, Search } from "lucide-react";
import { useAdminLegalPagesQuery } from "@/features/admin/hooks/use-admin-legal-pages-query";
import {
  useDeleteLegalPageMutation,
  useCreateLegalPageMutation,
} from "@/features/admin/hooks/use-admin-legal-page-mutations";
import { AdminCreatorListSearch } from "@/features/admin/components/admin-creator-list-search";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminLegalPagesList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, isError } = useAdminLegalPagesQuery({
    page,
    limit,
    search: search.trim() || undefined,
  });
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

  const pages = data?.pages ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showingStart = pages.length === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);
  const searchLoading = isFetching && !isLoading;

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
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Legal Pages
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage terms, privacy policies, and other legal content.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
        >
          <Plus className="size-4" />
          Add New Legal Page
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/40 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminCreatorListSearch
            value={search}
            isLoading={searchLoading}
            placeholder="Search by title or slug…"
            onChange={(next) => {
              setSearch(next);
              setPage(1);
            }}
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows</span>
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[84px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-muted/50 text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Sections</th>
                <th className="px-6 py-4">Effective</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {isLoading &&
                Array.from({ length: limit }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-40" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-9 w-24 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && isError && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-20 text-center text-sm text-muted-foreground"
                  >
                    We could not load legal pages right now. Try again shortly.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && pages.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-20 text-center text-sm text-muted-foreground"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <Search className="size-5 text-muted-foreground/60" />
                      <p>
                        {search.trim()
                          ? `No legal pages match “${search.trim()}”.`
                          : "No legal pages found."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                pages.map((legalPage) => {
                  const isConfirming = confirmingSlug === legalPage.slug;
                  const isDeletingThis =
                    deleteMutation.isPending &&
                    confirmingSlug === legalPage.slug;

                  return (
                    <tr
                      key={legalPage.id}
                      className="align-top transition-colors hover:bg-muted/30"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">
                          {legalPage.title}
                        </p>
                        {isConfirming && (
                          <div className="mt-3 max-w-md space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                              <div className="text-xs text-red-600 dark:text-red-400">
                                <p className="font-semibold">
                                  Permanently delete “{legalPage.title}”?
                                </p>
                                <p className="mt-1 text-red-600/80 dark:text-red-400/80">
                                  Type{" "}
                                  <code className="font-mono font-bold">
                                    {legalPage.slug}
                                  </code>{" "}
                                  to confirm.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                autoFocus
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={legalPage.slug}
                                className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 font-mono text-sm"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={cancelDelete}
                                  disabled={isDeletingThis}
                                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDelete(legalPage.slug)}
                                  disabled={
                                    confirmText !== legalPage.slug ||
                                    isDeletingThis
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 className="size-3.5" />
                                  {isDeletingThis ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                        /{legalPage.slug}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {legalPage.sectionCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {legalPage.effectiveDate || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(legalPage.updatedAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4">
                        {legalPage.draftStatus === "DRAFT" ? (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-500">
                            Draft Saved
                          </span>
                        ) : legalPage.draftStatus === "IN_REVIEW" ? (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                            In Review
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                            Published
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/legal/${legalPage.slug}`}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                          >
                            {legalPage.draftStatus
                              ? "Continue Editing"
                              : "Edit Page"}
                          </Link>
                          <button
                            onClick={() => startDelete(legalPage.slug)}
                            disabled={deleteMutation.isPending || isConfirming}
                            title="Delete this legal page"
                            className="inline-flex items-center justify-center rounded-lg border border-red-500/30 p-2 text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col items-center justify-between gap-6 border-t border-border/50 pb-8 pt-6 md:flex-row">
        <div className="flex w-full min-w-[150px] items-center justify-center space-x-4 md:w-auto md:justify-start">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground">Page</span>
            <span className="text-sm font-bold text-foreground">{page}</span>
            <span className="text-sm text-muted-foreground">of {totalPages}</span>
          </div>
          <span className="whitespace-nowrap border-l border-border pl-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Showing: {showingStart}-{showingEnd} of {total} results
          </span>
        </div>

        <div className="flex w-full flex-1 justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(event: MouseEvent) => {
                    event.preventDefault();
                    setPage((current) => Math.max(1, current - 1));
                  }}
                  disabled={page <= 1}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;

                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= page - 1 && pageNumber <= page + 1)
                ) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={page === pageNumber}
                        onClick={(event: MouseEvent) => {
                          event.preventDefault();
                          setPage(pageNumber);
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }

                if (
                  pageNumber === page - 2 ||
                  pageNumber === page + 2
                ) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={(event: MouseEvent) => {
                    event.preventDefault();
                    setPage((current) => Math.min(totalPages, current + 1));
                  }}
                  disabled={page >= totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeCreate}
        >
          <div
            className="glass-panel w-full max-w-lg space-y-5 rounded-2xl border border-border/50 bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Add New Legal Page
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create the page, then add content in the editor by hand or by
                  importing a file.
                </p>
              </div>
              <button
                onClick={closeCreate}
                disabled={createMutation.isPending}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
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
                  className="glass-input w-full rounded-lg bg-background/50 px-4 py-2 text-sm"
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
                  className="glass-input w-full rounded-lg bg-background/50 px-4 py-2 font-mono text-sm"
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
                  className="glass-input w-full resize-y rounded-lg bg-background/50 px-4 py-2 text-sm"
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
                  className="glass-input w-full rounded-lg bg-background/50 px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={closeCreate}
                disabled={createMutation.isPending}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!canCreate || createMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
