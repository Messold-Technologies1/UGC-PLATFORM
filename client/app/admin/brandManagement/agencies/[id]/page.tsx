"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  Mail,
  Phone,
  Store,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import OrderRow from "@/components/admin/OrderRow";
import {
  useAdminAgencyDetailQuery,
  useAdminAgencyWishlistsQuery,
} from "@/features/admin/hooks/use-admin-agency-detail-query";
import { useAdminOrdersQuery } from "@/features/admin/hooks/use-admin-orders-query";
import type {
  AdminBrandWishlistCreatorDto,
  AdminBrandWishlistDto,
} from "@/features/admin/types";

const ORDERS_PAGE_SIZE = 10;

function initials(value?: string | null): string {
  if (!value?.trim()) return "?";
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function CollapsibleSection({
  icon,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-6 py-4 text-left transition-colors hover:bg-accent/40"
      >
        <span className="text-primary">{icon}</span>
        <h2 className="font-headline text-xl font-bold">{title}</h2>
        {typeof count === "number" ? (
          <span className="text-sm text-muted-foreground">({count})</span>
        ) : null}
        <ChevronDown
          className={`ml-auto size-5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? <div className="border-t border-border/10">{children}</div> : null}
    </section>
  );
}

function WishlistCreatorChip({
  creator,
}: {
  creator: AdminBrandWishlistCreatorDto;
}) {
  const label = creator.displayName?.trim() || "Creator";
  return (
    <Link
      href={`/admin/creators/${creator.id}`}
      className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 py-1 pl-1 pr-3 transition-colors hover:bg-accent"
      title={label}
    >
      <Avatar className="size-7 rounded-full ring-1 ring-primary/20">
        <AvatarImage
          alt={label}
          className="object-cover"
          src={creator.profileImageUrl || undefined}
        />
        <AvatarFallback className="bg-primary/5 text-[10px] font-bold text-primary">
          {initials(label)}
        </AvatarFallback>
      </Avatar>
      <span className="max-w-[140px] truncate text-xs font-semibold text-foreground">
        {label}
      </span>
    </Link>
  );
}

const WISHLIST_CREATOR_PREVIEW = 5;

function WishlistCard({ wishlist }: { wishlist: AdminBrandWishlistDto }) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(
    0,
    wishlist.creators.length - WISHLIST_CREATOR_PREVIEW,
  );
  const visibleCreators =
    expanded || hiddenCount === 0
      ? wishlist.creators
      : wishlist.creators.slice(0, WISHLIST_CREATOR_PREVIEW);

  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm dark:border-border/50 dark:bg-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="truncate font-bold">{wishlist.name}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {wishlist.shareEnabled ? (
            <Badge variant="outline" className="text-[10px]">
              Shared
            </Badge>
          ) : null}
          <span className="text-xs font-semibold text-muted-foreground">
            {wishlist.creatorCount}{" "}
            {wishlist.creatorCount === 1 ? "creator" : "creators"}
          </span>
        </div>
      </div>
      {wishlist.creators.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No creators in this wishlist.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleCreators.map((c) => (
            <WishlistCreatorChip key={c.id} creator={c} />
          ))}
          {hiddenCount > 0 && !expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex h-9 items-center rounded-full border border-border/50 bg-muted/50 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
            >
              +{hiddenCount} more
            </button>
          ) : null}
          {hiddenCount > 0 && expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex h-9 items-center rounded-full border border-border/50 bg-muted/50 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Show less
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  DEACTIVATED: "Deactivated",
  SUSPENDED: "Suspended",
};

export default function AdminAgencyDetailPage() {
  const { id } = useParams() as { id: string };

  const [ordersPage, setOrdersPage] = useState(1);
  const [wishlistOpen, setWishlistOpen] = useState<boolean | null>(null);
  const [ordersOpen, setOrdersOpen] = useState<boolean | null>(null);
  const [brandsOpen, setBrandsOpen] = useState<boolean | null>(null);

  const agencyQuery = useAdminAgencyDetailQuery(id);
  const wishlistsQuery = useAdminAgencyWishlistsQuery(id);
  const ordersQuery = useAdminOrdersQuery({
    agencyId: id,
    page: ordersPage,
    limit: ORDERS_PAGE_SIZE,
  });

  if (agencyQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (agencyQuery.isError || !agencyQuery.data) {
    return (
      <div className="w-full px-4 py-16 md:px-8">
        <Link
          href="/admin/brandManagement?tab=agencies"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to agencies
        </Link>
        <div className="glass-panel rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground">
          We could not load this agency. It may have been removed.
        </div>
      </div>
    );
  }

  const agency = agencyQuery.data;
  const displayName = agency.agencyName?.trim() || "Unnamed Agency";
  const wishlists = wishlistsQuery.data?.items ?? [];
  const ordersTotal = ordersQuery.data?.total ?? 0;
  const orders = ordersQuery.data?.items ?? [];
  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / ORDERS_PAGE_SIZE));

  const wishlistExpanded =
    wishlistOpen ?? (wishlistsQuery.isLoading || wishlists.length > 0);
  const ordersExpanded =
    ordersOpen ?? (ordersQuery.isLoading || ordersTotal > 0);
  const brandsExpanded =
    brandsOpen ?? agency.brandNames.length > 0;

  return (
    <div className="w-full px-4 py-8 md:px-8">
      <Link
        href="/admin/brandManagement?tab=agencies"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to agencies
      </Link>

      <div className="glass-panel mb-8 flex flex-col gap-6 rounded-2xl p-6 md:flex-row md:items-center">
        {agency.logoUrl ? (
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
            <Image
              src={agency.logoUrl}
              alt={`${displayName} logo`}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-primary">
            <Building2 className="size-8" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="font-headline text-3xl font-extrabold tracking-tight">
              {displayName}
            </h1>
            {agency.status ? (
              <Badge variant={agency.status === "ACTIVE" ? "default" : "muted"}>
                {STATUS_LABELS[agency.status] ?? agency.status}
              </Badge>
            ) : null}
          </div>

          {agency.statusChangedAt && agency.status !== "ACTIVE" ? (
            <p className="mb-1 text-sm text-muted-foreground">
              {STATUS_LABELS[agency.status] ?? agency.status} on{" "}
              {new Date(agency.statusChangedAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {agency.statusChangedByName || agency.statusChangedByEmail
                ? ` by ${agency.statusChangedByName ?? agency.statusChangedByEmail}`
                : null}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {agency.email ? (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-4" />
                {agency.email}
              </span>
            ) : null}
            {agency.contactFullName ? (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4" />
                {agency.contactFullName}
              </span>
            ) : null}
            {agency.contactPhone ? (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-4" />
                {agency.contactPhone}
              </span>
            ) : null}
            {agency.website ? (
              <a
                href={agency.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <Globe className="size-4" />
                Website
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <CollapsibleSection
          icon={<Heart className="size-5" />}
          title="Wishlists"
          count={wishlists.length}
          open={wishlistExpanded}
          onToggle={() => setWishlistOpen(!wishlistExpanded)}
        >
          <div className="p-5">
            {wishlistsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : wishlistsQuery.isError ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Could not load this agency&apos;s wishlists.
              </p>
            ) : wishlists.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                This agency has no wishlists yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {wishlists.map((w) => (
                  <WishlistCard key={w.id} wishlist={w} />
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          icon={<Store className="size-5" />}
          title="Orders"
          count={ordersTotal}
          open={ordersExpanded}
          onToggle={() => setOrdersOpen(!ordersExpanded)}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground dark:bg-card/30">
                <tr>
                  <th className="px-8 py-4">Creator &amp; Brand</th>
                  <th className="px-8 py-4">Package Details</th>
                  <th className="px-8 py-4">Financials</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {ordersQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <Spinner className="mx-auto size-6 text-muted-foreground" />
                    </td>
                  </tr>
                ) : ordersQuery.isError ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-16 text-center text-sm text-muted-foreground"
                    >
                      We could not load this agency&apos;s orders right now.
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-16 text-center text-sm text-muted-foreground"
                    >
                      This agency has no orders yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((item, index) => (
                    <OrderRow
                      key={item.order.id}
                      order={item.order}
                      creator={item.creator}
                      brand={item.brand}
                      delay={index * 40}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {ordersTotal > 0 ? (
            <div className="flex items-center justify-between gap-4 border-t border-border/10 px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Page {ordersPage} of {ordersTotalPages} · {ordersTotal} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ordersPage <= 1 || ordersQuery.isFetching}
                  onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    ordersPage >= ordersTotalPages || ordersQuery.isFetching
                  }
                  onClick={() =>
                    setOrdersPage((p) => Math.min(ordersTotalPages, p + 1))
                  }
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection
          icon={<Building2 className="size-5" />}
          title="Managed brands"
          count={agency.brandCount}
          open={brandsExpanded}
          onToggle={() => setBrandsOpen(!brandsExpanded)}
        >
          <div className="p-5">
            {agency.brandNames.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                This agency has no managed brands yet.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {agency.brandNames.map((brandName) => (
                  <li
                    key={brandName}
                    className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-sm font-bold text-foreground">
                      {initials(brandName)}
                    </span>
                    <span className="min-w-0 truncate text-base font-semibold text-foreground">
                      {brandName}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
