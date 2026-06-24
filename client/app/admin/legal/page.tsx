"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useAdminLegalPagesQuery } from "@/features/admin/hooks/use-admin-legal-pages-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLegalPagesList() {
  const { data, isLoading, isError } = useAdminLegalPagesQuery();

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
          data?.pages.map((page) => (
            <div
              key={page.id}
              className="glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/10 bg-card/10 p-5 transition-colors hover:bg-card/20"
            >
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
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
              <Link
                href={`/admin/legal/${page.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-background px-4 py-2 text-sm font-semibold text-foreground border border-border hover:bg-muted transition-colors shadow-sm whitespace-nowrap"
              >
                {page.draftStatus ? "Continue Editing" : "Edit Page"}
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}
