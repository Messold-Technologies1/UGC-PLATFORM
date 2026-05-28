"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, type MouseEvent, Suspense } from "react";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { MapPin, Star, UserRound, LayoutGrid, Banknote, ShieldCheck, Pencil, UserX } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCreatorsListQuery } from "@/features/creators/hooks/use-creators-list-query";
import { useRejectCreatorMutation } from "@/features/admin/hooks/use-reject-creator-mutation";
import { RejectDialog } from "@/components/admin/RejectDialog";
import type { Creator } from "@/features/creators/types";

const CREATOR_MANAGEMENT_FIXTURE_TOTAL = 15;

const CREATOR_MANAGEMENT_FIXTURE_ITEMS: Creator[] = [
  {
    id: "fixture-creator-1",
    name: "Alex Johnson",
    location: "New York, USA",
    rating: 4.8,
    reviewCount: 42,
    startingPrice: 150,
    ordersCompleted: 85,
    thumbnail: "",
    tags: ["Fashion", "Lifestyle"],
    available: true,
    storeVisit: true,
    travelAvailable: true,
    gender: "female",
    category: "Apparel",
    categories: ["Apparel"],
    languages: ["English"],
    deliveryDays: 3,
  },
  {
    id: "fixture-creator-2",
    name: "Sam Smith",
    location: "London, UK",
    rating: 4.9,
    reviewCount: 128,
    startingPrice: 200,
    ordersCompleted: 210,
    thumbnail: "",
    tags: ["Tech", "Review"],
    available: true,
    storeVisit: false,
    travelAvailable: false,
    gender: "male",
    category: "Technology",
    categories: ["Technology"],
    languages: ["English", "Spanish"],
    deliveryDays: 5,
  },
];

function CreatorManagementLoadingShell({ limit }: { limit: number }) {
  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h2 className="text-xl font-headline font-semibold">
              Creators
            </h2>
            <p className="text-sm text-muted-foreground">
              All registered creators on the platform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: limit }).map((_, index) => (
            <div
              key={index}
              className="glass-panel p-5 rounded-2xl border border-border/10 bg-card/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6 w-full">
                <div className="flex items-center gap-4 min-w-[280px]">
                  <Skeleton className="size-14 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
                  <div className="flex flex-col space-y-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <div className="flex -space-x-2">
                      <Skeleton className="h-8 w-8 rounded-lg border-2 border-background" />
                      <Skeleton className="h-8 w-8 rounded-lg border-2 border-background" />
                      <Skeleton className="h-8 w-8 rounded-lg border-2 border-background" />
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 min-w-[160px]">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <div className="flex space-x-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

interface CreatorManagementContentProps {
  items: Creator[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  rejectPending: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSelectReject: (creator: Creator) => void;
  highlightedCreatorId?: string | null;
}

function CreatorManagementContent({
  items,
  total,
  page,
  limit,
  totalPages,
  rejectPending,
  onPageChange,
  onLimitChange,
  onSelectReject,
  highlightedCreatorId,
}: CreatorManagementContentProps) {
  const showingStart = items.length === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);

  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  useEffect(() => {
    if (highlightedCreatorId && items.some((c) => c.id === highlightedCreatorId)) {
      setActiveHighlight(highlightedCreatorId);
      
      const scrollTimer = setTimeout(() => {
        const element = document.getElementById(`creator-${highlightedCreatorId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);

      const fadeTimer = setTimeout(() => {
        setActiveHighlight(null);
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }, 3000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(fadeTimer);
      };
    }
  }, [highlightedCreatorId, items]);

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h2 className="text-xl font-headline font-semibold">
              Creators
            </h2>
            <p className="text-sm text-muted-foreground">
              All registered creators on the platform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {items.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground glass-panel rounded-2xl border border-border/10 bg-card/10">
              No creators found.
            </div>
          ) : (
            items.map((creator) => {
              const displayName = creator.name || "Unnamed Creator";

              return (
                <div
                  id={`creator-${creator.id}`}
                  key={creator.id}
                  onMouseEnter={() => {
                    if (creator.id === activeHighlight) {
                      setActiveHighlight(null);
                    }
                  }}
                  className={`group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full transition-all duration-300 border-l-4 ${
                    creator.id === activeHighlight
                      ? "border-l-primary bg-primary/10 shadow-xl shadow-primary/20 scale-[1.01]"
                      : "border-l-transparent hover:border-l-primary hover:shadow-lg hover:shadow-primary/5 hover:bg-accent/60"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-6 w-full">
                    <div className="flex items-center gap-6 min-w-[280px]">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-linear-to-tr from-primary to-secondary rounded-full opacity-0 group-hover/item:opacity-100 blur transition-opacity duration-500"></div>
                        {creator.thumbnail && creator.thumbnail !== "/globe.svg" ? (
                          <div className="relative w-14 h-14 overflow-hidden rounded-full border-2 border-border bg-muted z-10 shrink-0">
                            <Image
                              src={creator.thumbnail}
                              alt={`${displayName} profile`}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        ) : (
                          <div className="relative w-14 h-14 flex items-center justify-center rounded-full border-2 border-border bg-card text-primary z-10 shrink-0">
                            <span className="text-lg font-bold font-headline uppercase">
                              {displayName
                                .split(" ")
                                .filter(Boolean)
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-headline font-bold text-lg mb-0.5">
                          {displayName}
                        </h3>
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-primary-container/20 text-primary rounded-md border border-primary/20 uppercase tracking-wider shrink-0">
                            Creator
                          </span>
                          <span className="text-muted-foreground text-xs shrink-0">
                            •
                          </span>
                          <div className="flex items-center text-xs text-muted-foreground truncate min-w-0">
                            <MapPin className="size-3 mr-1 shrink-0 mt-[1px]" />
                            <span className="truncate">{creator.location || "Unknown"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 w-full">
                      <div className="flex flex-col">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                          Rating
                        </p>
                        <div className="flex items-center gap-1 text-sm font-bold text-foreground mt-1">
                          <Star className="size-3 text-yellow-500 fill-yellow-500" />
                          <span>{creator.rating > 0 ? creator.rating.toFixed(1) : "New"}</span>
                          {creator.reviewCount > 0 && (
                            <span className="text-muted-foreground text-xs font-normal">
                              ({creator.reviewCount})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                          Portfolio
                        </p>
                        <div className="flex -space-x-2">
                          {[0, 1, 2].map((i) => {
                            const hasThumb = i === 0 && creator.previewVideoThumbnail && creator.previewVideoThumbnail !== "/globe.svg";
                            return (
                              <div key={i} className="relative h-8 w-8 rounded-lg border-2 border-background bg-muted overflow-hidden flex items-center justify-center shrink-0 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] transition-transform hover:scale-110 hover:z-10 z-0">
                                {hasThumb ? (
                                  <Image src={creator.previewVideoThumbnail!} alt="Portfolio" fill className="object-cover" />
                                ) : (
                                  <LayoutGrid className="size-3 text-muted-foreground/40" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* <div className="flex flex-col">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                          Orders
                        </p>
                        <div className="flex items-center gap-1 text-sm font-bold text-foreground mt-1">
                          <ShieldCheck className="size-3 text-muted-foreground hidden lg:block" />
                          <span>{creator.ordersCompleted} completed</span>
                        </div>
                      </div> */}
                      <div className="flex flex-col">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                          Starting Price
                        </p>
                        <div className="flex items-center gap-1 text-sm font-bold text-foreground mt-1">
                          <Banknote className="size-3 text-muted-foreground hidden lg:block" />
                          <span>
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              minimumFractionDigits: 0,
                            }).format(creator.startingPrice || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 min-w-[160px] w-full md:w-auto mt-2 md:mt-0">
                      <Badge variant={creator.available ? "default" : "secondary"} className={creator.available ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20" : ""}>
                        {creator.available ? "Available" : "Unavailable"}
                      </Badge>
                      <div className="flex items-center space-x-1 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                          <Link href={`/admin/creatorManagement/${creator.id}`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onSelectReject(creator)}
                          disabled={rejectPending}
                        >
                          <UserX className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-border/50 pt-8 mt-12 pb-20 gap-6">
          <div className="flex items-center justify-center md:justify-start space-x-4 min-w-[150px] w-full md:w-auto">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-muted-foreground">Page</span>
              <span className="text-sm font-bold text-foreground">{page}</span>
              <span className="text-sm text-muted-foreground">
                of {totalPages}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-bold border-l border-border pl-4 uppercase tracking-widest whitespace-nowrap">
              Showing: {showingStart}-{showingEnd} of {total} results
            </span>
          </div>

          <div className="flex-1 flex justify-center w-full">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(event: MouseEvent) => {
                      event.preventDefault();
                      onPageChange(Math.max(1, page - 1));
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
                            onPageChange(pageNumber);
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }

                  if (pageNumber === page - 2 || pageNumber === page + 2) {
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
                      onPageChange(Math.min(totalPages, page + 1));
                    }}
                    disabled={page >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          <div className="flex items-center space-x-2 min-w-[150px] justify-center md:justify-end w-full md:w-auto">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
              Rows per page:
            </span>
            <Select
              value={limit.toString()}
              onValueChange={(value) => {
                onLimitChange(Number(value));
                onPageChange(1);
              }}
            >
              <SelectTrigger className="w-[75px] h-8 bg-background/50 border border-border/50 hover:border-border font-bold text-xs focus:ring-1 focus:ring-primary/40 gap-1 px-2.5 transition-colors rounded-lg">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[75px]">
                <SelectItem value="10" className="text-xs font-bold cursor-pointer">
                  10
                </SelectItem>
                <SelectItem value="20" className="text-xs font-bold cursor-pointer">
                  20
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
      </section>
    </>
  );
}

function CreatorManagementPageInner() {
  const searchParams = useSearchParams();
  const highlightedCreatorId = searchParams.get("highlightedCreatorId");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [creatorToReject, setCreatorToReject] = useState<Creator | null>(null);

  const { data, isLoading, isError } = useCreatorsListQuery({ 
    filters: { page, limit } 
  });
  const rejectCreatorMutation = useRejectCreatorMutation();

  const items = data?.creators ?? [];
  const total = data?.total ?? 0;
  const previewItems = isLoading ? CREATOR_MANAGEMENT_FIXTURE_ITEMS : items;
  const previewTotal = isLoading ? CREATOR_MANAGEMENT_FIXTURE_TOTAL : total;
  const previewTotalPages = Math.max(1, Math.ceil(previewTotal / limit));

  const closeDialog = () => {
    if (rejectCreatorMutation.isPending) return;
    setCreatorToReject(null);
  };

  const confirmReject = async (reason: string) => {
    if (!creatorToReject) return;
    await rejectCreatorMutation.mutateAsync({ id: creatorToReject.id, rejectionReason: reason });
    if (items.length === 1 && page > 1) {
      setPage((current) => Math.max(1, current - 1));
    }
    setCreatorToReject(null);
  };

  return (
    <>
      <div className="p-8 space-y-8">
      <section className="space-y-4">
        <h1 className="text-4xl font-headline font-bold">Creator Management</h1>
        <p className="max-w-3xl text-muted-foreground font-body">
          Review and manage all creators currently active on the platform.
        </p>
      </section>

      {isError && !isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground glass-panel rounded-2xl border border-border/10 bg-card/10">
          We could not load the creators list right now. Try again shortly.
        </div>
      ) : (
        <BoneyardSkeleton
          name="admin-creator-management"
          loading={isLoading}
          fallback={<CreatorManagementLoadingShell limit={limit} />}
          fixture={
            <CreatorManagementContent
              items={CREATOR_MANAGEMENT_FIXTURE_ITEMS}
              total={CREATOR_MANAGEMENT_FIXTURE_TOTAL}
              page={1}
              limit={limit}
              totalPages={Math.max(
                1,
                Math.ceil(CREATOR_MANAGEMENT_FIXTURE_TOTAL / limit),
              )}
              rejectPending={false}
              onPageChange={() => {}}
              onLimitChange={() => {}}
              onSelectReject={() => {}}
              highlightedCreatorId={highlightedCreatorId}
            />
          }
          transition
        >
          <CreatorManagementContent
            items={previewItems}
            total={previewTotal}
            page={page}
            limit={limit}
            totalPages={previewTotalPages}
            rejectPending={rejectCreatorMutation.isPending}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onSelectReject={setCreatorToReject}
            highlightedCreatorId={highlightedCreatorId}
          />
        </BoneyardSkeleton>
      )}
    </div>

      <RejectDialog
        isOpen={!!creatorToReject}
        onClose={closeDialog}
        onConfirm={confirmReject}
        isWorking={rejectCreatorMutation.isPending}
      />
    </>
  );
}

export default function CreatorManagementPage() {
  return (
    <Suspense fallback={<CreatorManagementLoadingShell limit={10} />}>
      <CreatorManagementPageInner />
    </Suspense>
  );
}
