"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Heart,
  Instagram,
  Mail,
  Phone,
  Store,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import OrderRow from "@/components/admin/OrderRow";
import {
  useAdminBrandDetailQuery,
  useAdminBrandWishlistsQuery,
} from "@/features/admin/hooks/use-admin-brand-detail-query";
import { useAdminOrdersQuery } from "@/features/admin/hooks/use-admin-orders-query";
import type { AdminBrandWishlistCreatorDto } from "@/features/admin/types";

function humanizeCategory(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

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

function WishlistCreatorChip({
  creator,
}: {
  creator: AdminBrandWishlistCreatorDto;
}) {
  const label = creator.displayName?.trim() || "Creator";
  return (
    <Link
      href={`/admin/creators/${creator.id}`}
      className="flex items-center gap-2 rounded-full border border-border/40 bg-card/40 py-1 pl-1 pr-3 transition-colors hover:bg-accent/60"
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

export default function AdminBrandDetailPage() {
  const { id } = useParams() as { id: string };

  const brandQuery = useAdminBrandDetailQuery(id);
  const wishlistsQuery = useAdminBrandWishlistsQuery(id);
  const ordersQuery = useAdminOrdersQuery({ brandId: id, limit: 50 });

  if (brandQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (brandQuery.isError || !brandQuery.data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/admin/brandManagement"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to brands
        </Link>
        <div className="glass-panel rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground">
          We could not load this brand. It may have been removed.
        </div>
      </div>
    );
  }

  const brand = brandQuery.data;
  const displayName = brand.brandName ?? brand.name ?? "Unnamed Brand";
  const wishlists = wishlistsQuery.data?.items ?? [];
  const orders = ordersQuery.data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/admin/brandManagement"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to brands
      </Link>

      {/* Header */}
      <div className="glass-panel mb-8 flex flex-col gap-6 rounded-2xl p-6 md:flex-row md:items-center">
        {brand.logoUrl ? (
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
            <Image
              src={brand.logoUrl}
              alt={`${displayName} logo`}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-primary">
            <Store className="size-8" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="font-headline text-3xl font-extrabold tracking-tight">
              {displayName}
            </h1>
            {brand.status ? (
              <Badge variant={brand.status === "ACTIVE" ? "default" : "outline"}>
                {brand.status}
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {brand.email ? (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-4" />
                {brand.email}
              </span>
            ) : null}
            {brand.contactFullName ? (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4" />
                {brand.contactFullName}
              </span>
            ) : null}
            {brand.contactPhone ? (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-4" />
                {brand.contactPhone}
              </span>
            ) : null}
            {brand.website ? (
              <a
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <Globe className="size-4" />
                Website
              </a>
            ) : null}
            {brand.instagramUrl ? (
              <a
                href={brand.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <Instagram className="size-4" />
                Instagram
              </a>
            ) : null}
          </div>

          {brand.categories.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {brand.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-md border border-primary/20 bg-primary-container/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary"
                >
                  {humanizeCategory(c)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Wishlists */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <Heart className="size-5 text-primary" />
          <h2 className="font-headline text-xl font-bold">Wishlists</h2>
          <span className="text-sm text-muted-foreground">
            ({wishlists.length})
          </span>
        </div>

        {wishlistsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : wishlistsQuery.isError ? (
          <div className="glass-panel rounded-2xl border border-border/10 bg-card/10 py-12 text-center text-sm text-muted-foreground">
            Could not load this brand&apos;s wishlists.
          </div>
        ) : wishlists.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-border/10 bg-card/10 py-12 text-center text-sm text-muted-foreground">
            This brand has no wishlists yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {wishlists.map((w) => (
              <div
                key={w.id}
                className="glass-panel rounded-2xl p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="truncate font-bold">{w.name}</h3>
                  <div className="flex shrink-0 items-center gap-2">
                    {w.shareEnabled ? (
                      <Badge variant="outline" className="text-[10px]">
                        Shared
                      </Badge>
                    ) : null}
                    <span className="text-xs font-semibold text-muted-foreground">
                      {w.creatorCount}{" "}
                      {w.creatorCount === 1 ? "creator" : "creators"}
                    </span>
                  </div>
                </div>
                {w.creators.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No creators in this wishlist.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {w.creators.map((c) => (
                      <WishlistCreatorChip key={c.id} creator={c} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Orders */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Store className="size-5 text-primary" />
          <h2 className="font-headline text-xl font-bold">Orders</h2>
          {ordersQuery.data ? (
            <span className="text-sm text-muted-foreground">
              ({ordersQuery.data.total})
            </span>
          ) : null}
        </div>

        <div className="glass-panel overflow-hidden rounded-2xl">
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
                      We could not load this brand&apos;s orders right now.
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-16 text-center text-sm text-muted-foreground"
                    >
                      This brand has no orders yet.
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
        </div>
      </section>
    </div>
  );
}
