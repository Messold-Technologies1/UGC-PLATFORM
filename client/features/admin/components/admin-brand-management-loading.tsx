"use client";

import Image from "next/image";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminBrandListItemDto } from "../types";

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
const BRAND_MANAGEMENT_FIXTURE_LIMIT = 10;

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
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h2 className="text-xl font-headline font-semibold">Active Brands</h2>
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

function BrandManagementFixtureContent() {
  const totalPages = Math.max(
    1,
    Math.ceil(BRAND_MANAGEMENT_FIXTURE_TOTAL / BRAND_MANAGEMENT_FIXTURE_LIMIT),
  );

  return (
    <>
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatsCard
          label="Total Brands"
          value={BRAND_MANAGEMENT_FIXTURE_TOTAL}
          helper="All active brands currently returned by the admin API."
        />
        <StatsCard
          label="Logos Uploaded"
          value={0}
          helper="Brands on this page that have a logo configured."
        />
        <StatsCard
          label="Industries"
          value={3}
          helper="Distinct industries represented on the current page."
        />
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h2 className="text-xl font-headline font-semibold">Active Brands</h2>
            <p className="text-sm text-muted-foreground">
              Only brands with an active profile are listed here.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {BRAND_MANAGEMENT_FIXTURE_ITEMS.map((brand) => {
            const displayName = brand.companyName ?? brand.name ?? "Unnamed Brand";

            return (
              <div
                key={brand.userId}
                className="group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full transition-all duration-300 border-l-4 border-l-transparent"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6 w-full">
                  <div className="flex items-center gap-6 min-w-[280px]">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-linear-to-tr from-primary to-secondary rounded-full opacity-0 blur transition-opacity duration-500"></div>
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
                        <span className="text-muted-foreground text-xs">•</span>
                        <p className="truncate text-xs text-muted-foreground">
                          Added {new Date(brand.createdAt).toLocaleDateString()}
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
                        <span className="truncate">{brand.industry ?? "—"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                        Contact
                      </p>
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <UserRound className="size-4 text-muted-foreground shrink-0 hidden lg:block" />
                        <span className="truncate">{brand.contactPerson ?? "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 min-w-[180px] w-full md:w-auto mt-2 md:mt-0">
                    <StatusBadge status={brand.status} />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="opacity-100 md:opacity-0 transition-opacity"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-border/50 pt-8 mt-12 pb-20 gap-6">
          <div className="flex items-center justify-center md:justify-start space-x-4 min-w-[150px] w-full md:w-auto">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-muted-foreground">Page</span>
              <span className="text-sm font-bold text-foreground">1</span>
              <span className="text-sm text-muted-foreground">
                of {totalPages}
              </span>
            </div>
            <span className="text-xs text-muted-foreground italic border-l border-border/50 pl-4 hidden md:inline-block">
              Showing 1-{BRAND_MANAGEMENT_FIXTURE_ITEMS.length} of{" "}
              {BRAND_MANAGEMENT_FIXTURE_TOTAL} results
            </span>
          </div>

          <div className="flex-1 flex justify-center w-full">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious disabled />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    1
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">{totalPages}</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          <div className="flex items-center space-x-2 min-w-[150px] justify-center md:justify-end w-full md:w-auto">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
              Rows per page:
            </span>
            <Select value={BRAND_MANAGEMENT_FIXTURE_LIMIT.toString()}>
              <SelectTrigger className="w-[75px] h-8 bg-background/50 border border-border/50 hover:border-border font-bold text-xs focus:ring-1 focus:ring-primary/40 gap-1 px-2.5 transition-colors rounded-lg">
                <SelectValue placeholder={BRAND_MANAGEMENT_FIXTURE_LIMIT.toString()} />
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

export function AdminBrandManagementLoadingState() {
  return (
    <div className="p-8 space-y-8">
      <section className="space-y-4">
        <h1 className="text-4xl font-headline font-bold">Brand Management</h1>
        <p className="max-w-3xl text-muted-foreground font-body">
          Review brands that currently have an active profile and remove brand
          access without deleting the underlying user account.
        </p>
      </section>

      <BoneyardSkeleton
        name="admin-brand-management"
        loading
        fallback={<BrandManagementLoadingShell limit={BRAND_MANAGEMENT_FIXTURE_LIMIT} />}
        fixture={<BrandManagementFixtureContent />}
        transition
      >
        <BrandManagementFixtureContent />
      </BoneyardSkeleton>
    </div>
  );
}
