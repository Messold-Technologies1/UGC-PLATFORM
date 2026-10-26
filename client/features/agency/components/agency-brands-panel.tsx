"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import {
  Building2,
  Check,
  Copy,
  Inbox,
  KeyRound,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAcceptBrandLinkMutation,
  useAgencyBrandLinksQuery,
  useAgencyPartnerIdQuery,
  useLeaveBrandLinkMutation,
  useRejectBrandLinkMutation,
  useRotatePartnerIdMutation,
} from "@/features/agency/hooks/use-agency-brand-links";
import { AgencyBrandSpendReport } from "@/features/agency/components/agency-brand-spend-report";

/**
 * The agency's side of the partner link: the code to hand out, the requests
 * waiting on a decision, and the brands already managed.
 *
 * Laid out to match the credits page — a dark hero carrying the one figure
 * that matters, then equal cards below. The Partner ID earns the hero because
 * it is the thing an agency comes here to copy.
 *
 * Requests sit before the managed list: they are the only item on the page
 * that blocks someone else, since a brand sees nothing happen until the agency
 * acts.
 */

/** A themed empty state, matching the one the credits page uses. */
function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Inbox;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function AgencyBrandsPanel() {
  const partnerId = useAgencyPartnerIdQuery();
  const links = useAgencyBrandLinksQuery();
  const accept = useAcceptBrandLinkMutation();
  const reject = useRejectBrandLinkMutation();
  const leave = useLeaveBrandLinkMutation();
  const rotate = useRotatePartnerIdMutation();

  const [copied, setCopied] = useState(false);
  // One spend report open at a time: each is its own fetch, and an agency
  // reconciles one brand at a time.
  const [openReportBrandId, setOpenReportBrandId] = useState<string | null>(
    null,
  );

  const pending = (links.data ?? []).filter((l) => l.status === "PENDING");
  const active = (links.data ?? []).filter((l) => l.status === "ACTIVE");

  /**
   * A 404 here means the partner-link feature is switched off for this
   * environment, not that something broke — the endpoints fail closed behind
   * AGENCY_BRAND_PARTNER_LINKS_ENABLED. Saying so beats a generic error that
   * sends someone hunting for a bug.
   */
  const featureDisabled =
    isAxiosError(partnerId.error) && partnerId.error.response?.status === 404;

  async function copyPartnerId() {
    const code = partnerId.data?.partnerId;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some embedded browsers; the code is on screen
      // and can still be read out or typed.
      toast.error("Couldn't copy — select the code and copy it manually.");
    }
  }

  return (
    <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      {/* Partner ID hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#20242f] via-[#15181f] to-[#0c0e13] p-7 text-white shadow-xl sm:p-8">
        <KeyRound
          className="pointer-events-none absolute -right-8 -top-8 size-44 text-white/[0.06]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/60">Your Partner ID</p>

            {partnerId.isLoading ? (
              <p className="mt-1.5 text-5xl font-extrabold tracking-tight">…</p>
            ) : partnerId.data ? (
              <p className="mt-1.5 break-all font-mono text-4xl font-extrabold tracking-[0.12em] sm:text-5xl">
                {partnerId.data.partnerId}
              </p>
            ) : (
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-white/80">
                {featureDisabled ? "Not enabled yet" : "Couldn't load"}
              </p>
            )}

            <p className="mt-4 max-w-md text-xs text-white/70">
              {featureDisabled
                ? "Brand partnerships aren't switched on for this environment yet."
                : partnerId.data
                  ? "Share this with a brand. They enter it in their account, then you approve the request before getting any access."
                  : "Reload the page to try again."}
            </p>
          </div>

          {partnerId.data ? (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#15181f] shadow-sm transition-colors hover:bg-white/90"
                onClick={copyPartnerId}
              >
                <span className="inline-flex items-center gap-2">
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 disabled:opacity-50"
                disabled={rotate.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "Generate a new Partner ID? The old one stops working for new requests. Brands you already manage keep their access.",
                    )
                  ) {
                    rotate.mutate();
                  }
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="size-4" />
                  Rotate
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Requests */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Inbox className="size-4 text-muted-foreground" />
            Requests
            {pending.length > 0 ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {pending.length}
              </span>
            ) : null}
          </h2>

          {links.isLoading ? (
            <ul className="divide-y divide-border/50">
              {Array.from({ length: 2 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                </li>
              ))}
            </ul>
          ) : pending.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No pending requests"
              hint="Brands asking you to manage them appear here. Nothing changes until you accept."
            />
          ) : (
            <ul className="divide-y divide-border/50">
              {pending.map((link) => (
                <li key={link.id} className="flex items-center gap-3 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {link.brandName ?? "Unnamed brand"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Asked {new Date(link.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
                      disabled={accept.isPending}
                      onClick={() => accept.mutate(link.id)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="size-3.5" />
                        Accept
                      </span>
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(link.id)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <X className="size-3.5" />
                        Decline
                      </span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Managed brands */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Building2 className="size-4 text-muted-foreground" />
            Brands you manage
          </h2>

          {links.isLoading ? (
            <ul className="divide-y divide-border/50">
              {Array.from({ length: 2 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                </li>
              ))}
            </ul>
          ) : active.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No brands yet"
              hint="Share your Partner ID with a brand to get started. Once they request and you accept, switch to them from the brand picker."
            />
          ) : (
            <ul className="divide-y divide-border/50">
              {active.map((link) => (
                <li key={link.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Building2 className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {link.brandName ?? "Unnamed brand"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Switch from the brand picker to work in their account
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                        onClick={() =>
                          setOpenReportBrandId((current) =>
                            current === link.brandId ? null : link.brandId,
                          )
                        }
                      >
                        {openReportBrandId === link.brandId
                          ? "Hide spend"
                          : "Spend"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        disabled={leave.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Stop managing ${link.brandName ?? "this brand"}? You'll lose access to their orders, briefs and creator chats. Their work is unaffected.`,
                            )
                          ) {
                            leave.mutate(link.id);
                          }
                        }}
                      >
                        Stop
                      </button>
                    </div>
                  </div>

                  {openReportBrandId === link.brandId ? (
                    <div className="mt-3">
                      <AgencyBrandSpendReport
                        brandId={link.brandId}
                        brandName={link.brandName}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
