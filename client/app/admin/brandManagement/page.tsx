"use client";

import Image from "next/image";
import { useMemo, useState, type MouseEvent } from "react";
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

export default function BrandManagementPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedBrand, setSelectedBrand] = useState<AdminBrandListItemDto | null>(
    null,
  );

  const { data, isLoading, isError } = useBrandsQuery({ page, limit });
  const removeBrandAccess = useRemoveBrandAccessMutation();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const stats = useMemo(() => {
    const withLogo = items.filter((item) => Boolean(item.logoUrl)).length;
    const coveredIndustries = new Set(
      items.map((item) => item.industry?.trim()).filter(Boolean),
    ).size;
    return {
      totalBrands: total,
      logosUploaded: withLogo,
      coveredIndustries,
    };
  }, [items, total]);

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
            access without deleting the underlying user account.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatsCard
            label="Total Brands"
            value={isLoading ? "..." : stats.totalBrands}
            helper="All active brands currently returned by the admin API."
          />
          <StatsCard
            label="Logos Uploaded"
            value={isLoading ? "..." : stats.logosUploaded}
            helper="Brands on this page that have a logo configured."
          />
          <StatsCard
            label="Industries"
            value={isLoading ? "..." : stats.coveredIndustries}
            helper="Distinct industries represented on the current page."
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-headline font-semibold">Active Brands</h2>
              <p className="text-sm text-muted-foreground">
                Only brands with an active profile are listed here.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Rows:
              </span>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[88px]">
                  <SelectValue placeholder={limit.toString()} />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Brand
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Industry
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact Person
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading &&
                  Array.from({ length: limit }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <Skeleton className="size-11 rounded-xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Skeleton className="h-4 w-44" />
                      </td>
                      <td className="px-6 py-5">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-6 py-5">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-6 py-5">
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Skeleton className="ml-auto h-9 w-24 rounded-md" />
                      </td>
                    </tr>
                  ))}

                {!isLoading && isError && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-sm text-muted-foreground"
                    >
                      We could not load the brand list right now. Try again shortly.
                    </td>
                  </tr>
                )}

                {!isLoading && !isError && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-sm text-muted-foreground"
                    >
                      No active brands are available right now.
                    </td>
                  </tr>
                )}

                {items.map((brand) => {
                  const displayName =
                    brand.companyName ?? brand.name ?? "Unnamed Brand";

                  return (
                    <tr
                      key={brand.userId}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          {brand.logoUrl ? (
                            <div className="relative size-11 overflow-hidden rounded-xl border border-border bg-muted">
                              <Image
                                src={brand.logoUrl}
                                alt={`${displayName} logo`}
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            </div>
                          ) : (
                            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Store className="size-5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {displayName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              Added {new Date(brand.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Mail className="size-4 text-muted-foreground" />
                          <span className="truncate">{brand.email}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-foreground">
                        {brand.industry ?? "—"}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <UserRound className="size-4 text-muted-foreground" />
                          <span>{brand.contactPerson ?? "—"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge status={brand.status} />
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedBrand(brand)}
                          disabled={removeBrandAccess.isPending}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {items.length === 0 ? 0 : (page - 1) * limit + 1}-
              {Math.min(page * limit, total)} of {total} brands
            </div>

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
                      setPage((current) => Math.min(totalPages, current + 1));
                    }}
                    disabled={page >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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
      </div>

      <Dialog open={!!selectedBrand} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove Brand Access</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>
              This will permanently remove brand access for{" "}
              <span className="font-semibold text-foreground">
                {selectedBrand?.companyName ?? selectedBrand?.name ?? selectedBrand?.email}
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
              {removeBrandAccess.isPending ? "Removing..." : "Remove Brand Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
