"use client";

import Image from "next/image";
import { useState, type MouseEvent } from "react";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { Building2, Mail, Store, Trash2, UserRound } from "lucide-react";
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
import { useRemoveBrandAccessMutation } from "@/features/admin/hooks/use-remove-brand-access-mutation";
import type { AdminBrandListItemDto } from "@/features/admin/types";

function StatsCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 text-card-foreground">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-headline font-bold text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return <Badge variant="default">Active</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

const BRAND_MANAGEMENT_FIXTURE_TOTAL = 24;

const BRAND_MANAGEMENT_FIXTURE_ITEMS: AdminBrandListItemDto[] = [
  {
    userId: "fixture-brand-1",
    brandProfileId: "fixture-profile-1",
    email: "hello@northstar.co",
    name: "Northstar Labs",
    companyName: "Northstar Labs",
    industry: "Skincare",
    contactPerson: "Anika Rao",
    logoUrl: null,
    status: "ACTIVE",
    createdAt: "2026-03-10T09:00:00.000Z",
    updatedAt: "2026-03-10T09:00:00.000Z",
  },
  {
    userId: "fixture-brand-2",
    brandProfileId: "fixture-profile-2",
    email: "team@peakhome.com",
    name: "Peak Home",
    companyName: "Peak Home",
    industry: "Home Goods",
    contactPerson: "Marcus Lee",
    logoUrl: null,
    status: "ACTIVE",
    createdAt: "2026-02-18T09:00:00.000Z",
    updatedAt: "2026-02-18T09:00:00.000Z",
  },
  {
    userId: "fixture-brand-3",
    brandProfileId: "fixture-profile-3",
    email: "ops@tailwindcoffee.com",
    name: "Tailwind Coffee",
    companyName: "Tailwind Coffee",
    industry: "Food & Beverage",
    contactPerson: "Sofia Bennett",
    logoUrl: null,
    status: "ACTIVE",
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h2 className="text-xl font-headline font-semibold">
              Active Brands
            </h2>
            <p className="text-sm text-muted-foreground">
              Only brands with an active profile are listed here.
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
  removePending: boolean;
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
  removePending,
  onSelectBrand,
  onPageChange,
  onLimitChange,
}: BrandManagementContentProps) {
  const withLogo = items.filter((item) => Boolean(item.logoUrl)).length;
  const coveredIndustries = new Set(
    items.map((item) => item.industry?.trim()).filter(Boolean),
  ).size;

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
          label="Industries"
          value={coveredIndustries}
          helper="Distinct industries represented on the current page."
        />
      </section> */}

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h2 className="text-xl font-headline font-semibold">
              Active Brands
            </h2>
            <p className="text-sm text-muted-foreground">
              Only brands with an active profile are listed here.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {items.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground glass-panel rounded-2xl border border-border/10 bg-card/10">
              No active brands are available right now.
            </div>
          ) : (
            items.map((brand) => {
              const displayName =
                brand.companyName ?? brand.name ?? "Unnamed Brand";

              return (
                <div
                  key={brand.userId}
                  className="group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full transition-all duration-300 hover:bg-accent/60 border-l-4 border-l-transparent hover:border-l-primary hover:shadow-lg hover:shadow-primary/5"
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
                          Industry
                        </p>
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <span className="truncate">
                            {brand.industry ?? "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                          Contact
                        </p>
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <UserRound className="size-4 text-muted-foreground shrink-0 hidden lg:block" />
                          <span className="truncate">
                            {brand.contactPerson ?? "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 min-w-[180px] w-full md:w-auto mt-2 md:mt-0">
                      <StatusBadge status={brand.status} />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onSelectBrand(brand)}
                        disabled={removePending}
                        className="opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Remove
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
            <span className="text-xs text-muted-foreground italic border-l border-border/50 pl-4 hidden md:inline-block">
              Showing {items.length === 0 ? 0 : (page - 1) * limit + 1}-
              {Math.min(page * limit, total)} of {total} results
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
              Removing a brand here deletes the brand profile and permanently
              revokes brand access for that user. The user account itself stays
              in the system.
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
  const removeBrandAccess = useRemoveBrandAccessMutation();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const previewItems = isLoading ? BRAND_MANAGEMENT_FIXTURE_ITEMS : items;
  const previewTotal = isLoading ? BRAND_MANAGEMENT_FIXTURE_TOTAL : total;
  const previewTotalPages = Math.max(1, Math.ceil(previewTotal / limit));

  const closeDialog = () => {
    if (removeBrandAccess.isPending) return;
    setSelectedBrand(null);
  };

  const confirmRemoval = async () => {
    if (!selectedBrand) return;
    await removeBrandAccess.mutateAsync(selectedBrand.userId);
    if (items.length === 1 && page > 1) {
      setPage((current) => Math.max(1, current - 1));
    }
    setSelectedBrand(null);
  };

  return (
    <>
      <div className="p-8 space-y-8">
        <section className="space-y-4">
          <h1 className="text-4xl font-headline font-bold">Brand Management</h1>
          <p className="max-w-3xl text-muted-foreground font-body">
            Review brands that currently have an active profile and remove brand
            access.
          </p>
        </section>

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
                removePending={false}
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
              removePending={removeBrandAccess.isPending}
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
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove Brand Access</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>
              This will permanently remove brand access for{" "}
              <span className="font-semibold text-foreground">
                {selectedBrand?.companyName ??
                  selectedBrand?.name ??
                  selectedBrand?.email}
              </span>
              .
            </p>
            <p>
              Their user account will remain, but the brand profile and brand
              workspace access will be removed.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={closeDialog}
              disabled={removeBrandAccess.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmRemoval()}
              disabled={removeBrandAccess.isPending}
            >
              {removeBrandAccess.isPending
                ? "Removing..."
                : "Remove Brand Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
