"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAgencyBrandLinksQuery,
  useForceUnlinkMutation,
} from "@/features/admin/hooks/use-agency-brand-links-query";
import type { AdminAgencyBrandLinkStatus } from "@/features/admin/api/fetch-agency-brand-links";

const STATUS_VARIANT: Record<
  AdminAgencyBrandLinkStatus,
  "default" | "secondary" | "outline" | "muted"
> = {
  ACTIVE: "default",
  PENDING: "secondary",
  REJECTED: "outline",
  REVOKED: "muted",
};

const STATUS_LABEL: Record<AdminAgencyBrandLinkStatus, string> = {
  ACTIVE: "Managing",
  PENDING: "Awaiting agency",
  REJECTED: "Declined",
  REVOKED: "Ended",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

/**
 * Which agencies manage which brands.
 *
 * Shows ended and declined rows too, not just live ones: when someone asks
 * "why can't this agency see the brand any more", the answer is almost always
 * in a row the brand-facing and agency-facing lists both hide.
 */
export default function AdminAgencyBrandLinksPage() {
  const [agencyId, setAgencyId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [applied, setApplied] = useState<{
    agencyId?: string;
    brandId?: string;
  }>({});

  const { data, isLoading } = useAgencyBrandLinksQuery(applied);
  const forceUnlink = useForceUnlinkMutation();

  const links = data ?? [];

  return (
    <div className="space-y-6 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Agency ↔ brand links
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who manages whom. Links are created by the brand redeeming an
          agency&apos;s Partner ID and accepted by the agency — support can end
          one, but cannot create one.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({
            agencyId: agencyId.trim() || undefined,
            brandId: brandId.trim() || undefined,
          });
        }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Agency ID
          </label>
          <Input
            value={agencyId}
            onChange={(event) => setAgencyId(event.target.value)}
            placeholder="uuid"
            className="w-[280px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Brand ID
          </label>
          <Input
            value={brandId}
            onChange={(event) => setBrandId(event.target.value)}
            placeholder="uuid"
            className="w-[280px]"
          />
        </div>
        <Button type="submit">Filter</Button>
        {applied.agencyId || applied.brandId ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setAgencyId("");
              setBrandId("");
              setApplied({});
            }}
          >
            Clear
          </Button>
        ) : null}
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Agency</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Requested</th>
                <th className="px-4 py-3 font-semibold">Responded</th>
                <th className="px-4 py-3 font-semibold">Ended</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{link.agency.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {link.agency.contactEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {link.brand.brandName ?? "Unnamed brand"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[link.status]}>
                      {STATUS_LABEL[link.status]}
                    </Badge>
                    {link.revokedReason ? (
                      <div className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                        {link.revokedReason}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{formatDate(link.requestedAt)}</td>
                  <td className="px-4 py-3">{formatDate(link.respondedAt)}</td>
                  <td className="px-4 py-3">{formatDate(link.revokedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {link.status === "ACTIVE" || link.status === "PENDING" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={forceUnlink.isPending}
                        onClick={() => {
                          const reason = window.prompt(
                            `End ${link.agency.name}'s link to ${
                              link.brand.brandName ?? "this brand"
                            }? The brand keeps every order the agency placed.\n\nReason (optional):`,
                          );
                          // prompt returns null on cancel, "" on OK with no text.
                          if (reason === null) return;
                          forceUnlink.mutate({
                            id: link.id,
                            reason: reason.trim() || undefined,
                          });
                        }}
                      >
                        Force unlink
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
