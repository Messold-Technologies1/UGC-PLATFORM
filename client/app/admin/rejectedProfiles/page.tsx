"use client";

import React, { useState } from "react";
import ReviewDrawer from "@/components/admin/ReviewDrawer";
import RejectedCreatorRow from "@/components/admin/RejectedCreatorRow";
import { RejectedCreatorApprovalListItemDto } from "@/features/admin/types";
import { useRejectedApprovalsQuery } from "@/features/admin/hooks/use-rejected-approvals-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { AdminCreatorListSearch } from "@/features/admin/components/admin-creator-list-search";

export default function RejectedProfilesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [search, setSearch] = useState("");
  const [selectedCreator, setSelectedCreator] =
    useState<RejectedCreatorApprovalListItemDto | null>(null);

  const { data, isLoading, isFetching } = useRejectedApprovalsQuery({
    page,
    limit,
    search: search.trim() || undefined,
  });

  const openDrawer = (creator: RejectedCreatorApprovalListItemDto) =>
    setSelectedCreator(creator);
  const closeDrawer = () => setSelectedCreator(null);

  const creators = data?.items ?? [];
  const searchLoading = isFetching && !isLoading;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const showingStart = creators.length === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);

  return (
    <>
      <div className="p-12 w-full space-y-8 group selection-active">
        <section className="space-y-2">
          <h1 className="font-headline font-extrabold text-5xl tracking-tight">
            Rejected Profiles
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Creator applications that were rejected. Review details, edit the
            profile, or approve to reinstate them on the platform.
          </p>
        </section>

        <AdminCreatorListSearch
          value={search}
          isLoading={searchLoading}
          onChange={(next) => {
            setSearch(next);
            setPage(1);
          }}
        />

        <div className="relative grid grid-cols-1 gap-4">
          {searchLoading ? (
            <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-background/40 backdrop-blur-[1px]" />
          ) : null}
          {isLoading &&
            Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className="glass-panel p-5 rounded-2xl border border-border/10 bg-card/10"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full max-w-md" />
                  </div>
                </div>
              </div>
            ))}
          {!isLoading && creators.length === 0 && (
            <div className="py-20 text-center text-muted-foreground glass-panel rounded-2xl border border-border/10">
              {search.trim()
                ? "No rejected profiles match your search."
                : "No rejected profiles at the moment."}
            </div>
          )}
          {creators.map((creator, i) => (
            <RejectedCreatorRow
              key={creator.id}
              creator={creator}
              delay={i * 100}
              onReview={() => openDrawer(creator)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-8 mt-12 pb-20">
          <div className="flex items-center space-x-4 min-w-[150px]">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-muted-foreground">Page</span>
              <span className="text-sm font-bold text-foreground">{page}</span>
              <span className="text-sm text-muted-foreground">
                of {totalPages}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-bold border-l border-border uppercase tracking-widest whitespace-nowrap pl-4">
              Showing: {showingStart}-{showingEnd} of {total} results
            </span>
          </div>

          <div className="flex-1">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    disabled={page <= 1}
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;

                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= page - 1 && pageNum <= page + 1)
                  ) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={page === pageNum}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            setPage(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }

                  if (pageNum === page - 2 || pageNum === page + 2) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    disabled={page >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          <div className="flex items-center space-x-2 min-w-[150px] justify-end">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
              Rows per page:
            </span>
            <Select
              value={limit.toString()}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[75px] h-8 bg-background/50 border border-border/50 hover:border-border font-bold text-xs focus:ring-1 focus:ring-primary/40 gap-1 px-2.5 transition-colors rounded-lg">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[75px]">
                <SelectItem value="6" className="text-xs font-bold cursor-pointer">
                  6
                </SelectItem>
                <SelectItem value="15" className="text-xs font-bold cursor-pointer">
                  15
                </SelectItem>
                <SelectItem value="30" className="text-xs font-bold cursor-pointer">
                  30
                </SelectItem>
                <SelectItem value="50" className="text-xs font-bold cursor-pointer">
                  50
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ReviewDrawer
        isOpen={!!selectedCreator}
        onClose={closeDrawer}
        creator={selectedCreator}
      />
    </>
  );
}
