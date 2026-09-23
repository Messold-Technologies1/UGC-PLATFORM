"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { Building2, Mail, Power, Store, UserRound } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBrandsQuery } from "@/features/admin/hooks/use-brands-query";
import { useSetBrandUserStatusMutation } from "@/features/admin/hooks/use-set-brand-user-status-mutation";
import type { AdminBrandListItemDto } from "@/features/admin/types";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  DEACTIVATED: "Deactivated",
  SUSPENDED: "Suspended",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return <Badge variant="default">Active</Badge>;
  }
  // Deactivated brands stay in the list in full, so the badge is the only thing
  // marking them out — spell it rather than showing the raw enum.
  return <Badge variant="muted">{STATUS_LABELS[status] ?? status}</Badge>;
}

const BRAND_MANAGEMENT_FIXTURE_TOTAL = 24;

const BRAND_MANAGEMENT_FIXTURE_ITEMS: AdminBrandListItemDto[] = [
  {
    userId: "fixture-brand-1",
    brandProfileId: "fixture-profile-1",
    email: "hello@northstar.co",
    name: "Northstar Labs",
    brandName: "Northstar Labs",
    contactFullName: "Anika Rao",
    contactPhone: "+91 98765 43210",
    categories: ["APPAREL_AND_FASHION"],
    logoUrl: null,
    status: "ACTIVE",
    orderCount: 0,
    ongoingOrderCount: 0,
    wishlistCount: 0,
    createdAt: "2026-03-10T09:00:00.000Z",
    updatedAt: "2026-03-10T09:00:00.000Z",
  },
  {
    userId: "fixture-brand-2",
    brandProfileId: "fixture-profile-2",
    email: "team@peakhome.com",
    name: "Peak Home",
    brandName: "Peak Home",
    contactFullName: "Marcus Lee",
    contactPhone: "+91 91234 56789",
    categories: ["APPAREL_AND_FASHION"],
    logoUrl: null,
    status: "ACTIVE",
    orderCount: 2,
    ongoingOrderCount: 0,
    wishlistCount: 1,
    createdAt: "2026-02-18T09:00:00.000Z",
    updatedAt: "2026-02-18T09:00:00.000Z",
  },
  {
    userId: "fixture-brand-3",
    brandProfileId: "fixture-profile-3",
    email: "ops@tailwindcoffee.com",
    name: "Tailwind Coffee",
    brandName: "Tailwind Coffee",
    contactFullName: "Sofia Bennett",
    contactPhone: "+91 99887 76655",
    categories: ["APPAREL_AND_FASHION"],
    logoUrl: null,
    status: "ACTIVE",
    orderCount: 3,
    ongoingOrderCount: 1,
    wishlistCount: 2,
    createdAt: "2026-01-27T09:00:00.000Z",
    updatedAt: "2026-01-27T09:00:00.000Z",
  },
];

function BrandManagementLoadingShell({ limit }: { limit: number }) {
  return (
    <div className="space-y-8">
      {/* <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatsCard
          label="Total Brands"
          value="..."
          helper="All active brands currently returned by the admin API."
        />
        <StatsCard
          label="Logos Uploaded"
          value="..."
          helper="Brands on this page that have a logo configured."
        />
        <StatsCard
          label="Industries"
          value="..."
          helper="Distinct industries represented on the current page."
        />
      </section> */}

      <section className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: limit }).map((_, index) => (
            <div
              key={index}
              className="glass-panel p-5 rounded-2xl border border-border/10 bg-card/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6 w-full">
                <div className="flex items-center gap-4 min-w-[250px]">
                  <Skeleton className="size-11 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 min-w-[200px]">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

interface BrandManagementContentProps {
  items: AdminBrandListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusPending: boolean;
  onSelectBrand: (brand: AdminBrandListItemDto) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

function BrandManagementContent({
  items,
  total,
  page,
  limit,
  totalPages,
  statusPending,
  onSelectBrand,
  onPageChange,
  onLimitChange,
}: BrandManagementContentProps) {
  const router = useRouter();
  const showingStart = items.length === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);

  const openBrand = (brand: AdminBrandListItemDto) => {
    if (brand.brandProfileId) {
      router.push(`/admin/brandManagement/${brand.brandProfileId}`);
    }
  };

  // const withLogo = items.filter((item) => Boolean(item.logoUrl)).length;
  // const distinctContactNames = new Set(
  //   items.map((item) => item.contactFullName?.trim()).filter(Boolean),
  // ).size;
  return (
    <>
      {/* <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatsCard
          label="Total Brands"
          value={total}
          helper="All active brands currently returned by the admin API."
        />
        <StatsCard
          label="Logos Uploaded"
          value={withLogo}
          helper="Brands on this page that have a logo configured."
        />
        <StatsCard
          label="Contacts"
          value={distinctContactNames}
          helper="Distinct contact names on the current page."
        />
      </section> */}

      <section className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {items.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground glass-panel rounded-2xl border border-border/10 bg-card/10">
              No active brands are available right now.
            </div>
          ) : (
            items.map((brand) => {
              const displayName =
                brand.brandName?.trim() || "Unnamed Brand";

              return (
                <div
                  key={brand.userId}
                  role={brand.brandProfileId ? "button" : undefined}
                  tabIndex={brand.brandProfileId ? 0 : undefined}
                  onClick={() => openBrand(brand)}
                  onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                    if (
                      brand.brandProfileId &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      openBrand(brand);
                    }
                  }}
                  className={`group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full transition-all duration-300 hover:bg-accent/60 border-l-4 border-l-transparent hover:border-l-primary hover:shadow-lg hover:shadow-primary/5${
                    brand.brandProfileId ? " cursor-pointer" : ""
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-6 w-full">
                    <div className="flex items-center gap-6 min-w-[280px]">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-linear-to-tr from-primary to-secondary rounded-full opacity-0 group-hover/item:opacity-100 blur transition-opacity duration-500"></div>
                        {brand.logoUrl ? (
                          <div className="relative w-14 h-14 overflow-hidden rounded-full border-2 border-border bg-muted z-10 shrink-0">
                            <Image
                              src={brand.logoUrl}
                              alt={`${displayName} logo`}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        ) : (
                          <div className="relative w-14 h-14 flex items-center justify-center rounded-full border-2 border-border bg-card text-primary z-10 shrink-0">
                            <Store className="size-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-headline font-bold text-lg mb-0.5">
                          {displayName}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-primary-container/20 text-primary rounded-md border border-primary/20 uppercase tracking-wider">
                            Brand
                          </span>
                          <span className="text-muted-foreground text-xs">
                            •
                          </span>
                          <p className="truncate text-xs text-muted-foreground">
                            Added{" "}
                            {new Date(brand.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 w-full">
                      <div className="flex flex-col">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                          Email
                        </p>
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <Mail className="size-4 text-muted-foreground shrink-0 hidden lg:block" />
                          <span className="truncate">{brand.email}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                          Contact name
                        </p>
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <UserRound className="size-4 text-muted-foreground shrink-0 hidden lg:block" />
                          <span className="truncate">
                            {brand.contactFullName ?? "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                          Mobile
                        </p>
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <span className="truncate">
                            {brand.contactPhone ?? "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 min-w-[180px] w-full md:w-auto mt-2 md:mt-0">
                      <StatusBadge status={brand.status} />
                      <Button
                        variant={
                          brand.status === "ACTIVE" ? "destructive" : "default"
                        }
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBrand(brand);
                        }}
                        disabled={statusPending}
                        className="opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity"
                      >
                        <Power className="mr-2 size-4" />
                        {brand.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </Button>
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
            <span className="text-xs text-muted-foreground font-bold border-l border-border uppercase tracking-widest whitespace-nowrap">
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
                <SelectItem
                  value="10"
                  className="text-xs font-bold cursor-pointer"
                >
                  10
                </SelectItem>
                <SelectItem
                  value="20"
                  className="text-xs font-bold cursor-pointer"
                >
                  20
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
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Permanent Brand Removal
            </h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Removing a brand permanently deletes the user account and all
              related brand data. Brands with ongoing orders cannot be removed.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default function BrandManagementPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedBrand, setSelectedBrand] =
    useState<AdminBrandListItemDto | null>(null);

  const { data, isLoading, isError } = useBrandsQuery({ page, limit });
  const setBrandUserStatus = useSetBrandUserStatusMutation();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const previewItems = isLoading ? BRAND_MANAGEMENT_FIXTURE_ITEMS : items;
  const previewTotal = isLoading ? BRAND_MANAGEMENT_FIXTURE_TOTAL : total;
  const previewTotalPages = Math.max(1, Math.ceil(previewTotal / limit));

  const closeDialog = () => {
    if (setBrandUserStatus.isPending) return;
    setSelectedBrand(null);
  };

  // Reactivating a deactivated brand is the same call with the flag flipped.
  const selectedIsActive = selectedBrand?.status === "ACTIVE";

  const confirmStatusChange = async () => {
    if (!selectedBrand) return;
    try {
      await setBrandUserStatus.mutateAsync({
        userId: selectedBrand.userId,
        active: !selectedIsActive,
      });
      // The row stays in the list with a new status, so paging is untouched.
      setSelectedBrand(null);
    } catch {
      // Error toast is handled by the mutation.
    }
  };

  const selectedName =
    selectedBrand?.brandName ??
    selectedBrand?.name ??
    selectedBrand?.email ??
    "this brand";
  const selectedOrderCount = selectedBrand?.orderCount ?? 0;
  const selectedOngoingCount = selectedBrand?.ongoingOrderCount ?? 0;
  const selectedWishlistCount = selectedBrand?.wishlistCount ?? 0;

  return (
    <>
      <div className="p-8 space-y-8">
        {isError && !isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground glass-panel rounded-2xl border border-border/10 bg-card/10">
            We could not load the brand list right now. Try again shortly.
          </div>
        ) : (
          <BoneyardSkeleton
            name="admin-brand-management"
            loading={isLoading}
            fallback={<BrandManagementLoadingShell limit={limit} />}
            fixture={
              <BrandManagementContent
                items={BRAND_MANAGEMENT_FIXTURE_ITEMS}
                total={BRAND_MANAGEMENT_FIXTURE_TOTAL}
                page={1}
                limit={limit}
                totalPages={Math.max(
                  1,
                  Math.ceil(BRAND_MANAGEMENT_FIXTURE_TOTAL / limit),
                )}
                statusPending={false}
                onSelectBrand={() => {}}
                onPageChange={() => {}}
                onLimitChange={() => {}}
              />
            }
            transition
          >
            <BrandManagementContent
              items={previewItems}
              total={previewTotal}
              page={page}
              limit={limit}
              totalPages={previewTotalPages}
              statusPending={setBrandUserStatus.isPending}
              onSelectBrand={setSelectedBrand}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </BoneyardSkeleton>
        )}
      </div>

      <Dialog
        open={!!selectedBrand}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-md gap-5 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedIsActive
                ? "Deactivate this brand?"
                : "Reactivate this brand?"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Are you sure you want to{" "}
              {selectedIsActive ? "deactivate" : "reactivate"}{" "}
              <span className="font-semibold text-foreground">
                {selectedName}
              </span>
              ?
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/40 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Orders
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {selectedOrderCount}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Wishlists
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {selectedWishlistCount}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 px-3 py-2.5 col-span-2 sm:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ongoing
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {selectedOngoingCount}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {selectedIsActive ? (
                <>
                  They will be signed out and blocked from logging in. Nothing
                  is deleted — their orders, wishlists and brand data stay
                  exactly as they are, and you can reactivate them at any time.
                </>
              ) : (
                <>
                  They will be able to log in again and pick up where they left
                  off, with all of their orders, wishlists and brand data
                  intact.
                </>
              )}
            </p>
          </div>

          <DialogFooter className="mx-0 mb-0 grid grid-cols-2 gap-3 border-0 bg-transparent p-0 sm:justify-stretch">
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl text-sm font-semibold"
              onClick={closeDialog}
              disabled={setBrandUserStatus.isPending}
            >
              No
            </Button>
            <Button
              variant={selectedIsActive ? "destructive" : "default"}
              className="h-11 w-full rounded-xl text-sm font-semibold"
              onClick={() => void confirmStatusChange()}
              disabled={setBrandUserStatus.isPending}
            >
              {setBrandUserStatus.isPending
                ? selectedIsActive
                  ? "Deactivating..."
                  : "Activating..."
                : "Yes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
