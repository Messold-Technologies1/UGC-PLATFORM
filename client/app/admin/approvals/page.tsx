"use client";

import React, { useState } from "react";
import ReviewDrawer from "@/components/admin/ReviewDrawer";
import CreatorRow from "@/components/admin/CreatorRow";
import { CreatorProfileResponseDto } from "@/features/admin/types";
import { usePendingApprovalsQuery } from "@/features/admin/hooks/use-pending-approvals-query";
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

export default function AdminDashboardPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [selectedCreator, setSelectedCreator] =
    useState<CreatorProfileResponseDto | null>(null);

  const { data, isLoading } = usePendingApprovalsQuery({ page, limit });

  const openDrawer = (creator: CreatorProfileResponseDto) =>
    setSelectedCreator(creator);
  const closeDrawer = () => setSelectedCreator(null);

  const creators = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const showingStart = creators.length === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);

  return (
    <>
      <div className="p-12 max-w-[1400px] mx-auto space-y-8 group selection-active">
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-headline font-extrabold text-5xl tracking-tight mb-2">
                Creator Approval Queue
              </h1>
            </div>
          </div>


        </section>

        <div className="flex items-center justify-end px-2">
          {/* <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mr-2">
              Sort:
            </span>
            <button className="px-4 py-2 rounded-full bg-accent/50 border border-border/50 text-xs font-bold hover:bg-accent transition-all">
              Newest
            </button>
            <button className="px-4 py-2 rounded-full border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
              Followers
            </button>
          </div> */}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isLoading &&
            Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className="glass-panel p-5 rounded-2xl border border-border/10 bg-card/10 flex items-center justify-between"
              >
                <div className="flex items-center space-x-6 w-full">
                  <Skeleton className="h-5 w-5 rounded opacity-50" />
                  <div className="flex items-center space-x-4 flex-1">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="hidden md:flex space-x-2 min-w-[200px]">
                    <Skeleton className="h-7 w-20 rounded-md" />
                    <Skeleton className="h-7 w-24 rounded-md" />
                  </div>
                  <div className="hidden lg:flex flex-col space-y-1.5 min-w-[150px]">
                    <Skeleton className="h-2 w-16 mb-0.5" />
                    <div className="flex -space-x-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 min-w-[120px] justify-end">
                    <Skeleton className="h-9 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          {!isLoading && creators.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              No pending approvals at the moment.
            </div>
          )}
          {creators.map((creator, i) => (
            <CreatorRow
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
            <span className="text-xs text-muted-foreground font-bold border-l border-border uppercase tracking-widest whitespace-nowrap">
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
                <SelectItem
                  value="6"
                  className="text-xs font-bold cursor-pointer"
                >
                  6
                </SelectItem>
                <SelectItem
                  value="15"
                  className="text-xs font-bold cursor-pointer"
                >
                  15
                </SelectItem>
                <SelectItem
                  value="30"
                  className="text-xs font-bold cursor-pointer"
                >
                  30
                </SelectItem>
                <SelectItem
                  value="50"
                  className="text-xs font-bold cursor-pointer"
                >
                  50
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <section className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel p-8 rounded-3xl space-y-6 relative overflow-hidden group">
              {/* <div className="absolute top-0 right-0 p-8">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-secondary">
                  Draft Selection
                </span>
              </div> */}
              <h2 className="font-headline font-extrabold text-2xl tracking-tight">
                Active Review Panel
              </h2>
              <p className="text-muted-foreground text-sm">
                Select a creator from the queue above to see deep-dive metrics,
                content engagement graphs, and audience sentiment analysis
                before final approval.
              </p>
              {/* <div className="flex flex-wrap gap-2">
                <span className="px-4 py-1.5 bg-card/60 rounded-full text-[10px] font-bold text-muted-foreground uppercase">
                  AI Sentiment Score
                </span>
                <span className="px-4 py-1.5 bg-card/60 rounded-full text-[10px] font-bold text-muted-foreground uppercase">
                  Engagement Delta
                </span>
                <span className="px-4 py-1.5 bg-card/60 rounded-full text-[10px] font-bold text-muted-foreground uppercase">
                  Copyright Check
                </span>
              </div> */}
            </div>
            <div className="bg-linear-to-br from-primary/10 to-secondary/10 border border-primary/20 p-8 rounded-3xl flex flex-col justify-between">
              <div>
                <span
                  className="material-symbols-outlined text-primary text-4xl mb-4"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <h2 className="font-headline font-extrabold text-2xl tracking-tight mb-2">
                  Automated Prequalification
                </h2>
                <p className="text-muted-foreground text-sm">
                  Our system has automatically flagged 3 accounts for potential
                  bot activity. These have been moved to the bottom of the list
                  for manual oversight.
                </p>
              </div>
              <div className="mt-6">
                <button className="text-secondary font-bold text-sm flex items-center group">
                  Learn more about vetting logic
                  <span className="material-symbols-outlined ml-2 transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ReviewDrawer
        isOpen={!!selectedCreator}
        onClose={closeDrawer}
        creator={selectedCreator}
      />
    </>
  );
}
