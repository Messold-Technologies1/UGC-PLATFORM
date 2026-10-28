"use client";

import { useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Inbox,
  KeyRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { classifyPartnerLinkError } from "@/features/agency/api/agency-brand-links";
import {
  useAcceptBrandLinkMutation,
  useAgencyBrandLinksQuery,
  useLeaveBrandLinkMutation,
  useRejectBrandLinkMutation,
} from "@/features/agency/hooks/use-agency-brand-links";
import { AgencyBrandSpendReport } from "@/features/agency/components/agency-brand-spend-report";
import { useAuth } from "@/providers/auth-provider";

/**
 * The agency's side of the partner link: the address to hand out, the
 * requests waiting on a decision, and the brands already managed.
 *
 * Laid out to match the credits page — a dark hero carrying the one thing
 * that matters, then equal cards below. The sign-in email earns the hero
 * because it is what an agency comes here to copy; it needs no endpoint of
 * its own, since /auth/me already carries it.
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
  const { user } = useAuth();
  const links = useAgencyBrandLinksQuery();
  const accept = useAcceptBrandLinkMutation();
  const reject = useRejectBrandLinkMutation();
  const leave = useLeaveBrandLinkMutation();

  const [copied, setCopied] = useState(false);
  // One spend report open at a time: each is its own fetch, and an agency
  // reconciles one brand at a time.
  const [openReportBrandId, setOpenReportBrandId] = useState<string | null>(
    null,
  );

  const pending = (links.data ?? []).filter((l) => l.status === "PENDING");
  const active = (links.data ?? []).filter((l) => l.status === "ACTIVE");

  /**
   * A 404 from the link list means the partner-link feature is switched off
   * for this environment, not that something broke — the endpoints fail
   * closed behind AGENCY_BRAND_PARTNER_LINKS_ENABLED. Saying so beats a
   * generic error that sends someone hunting for a bug.
   */
  const failure = links.isError ? classifyPartnerLinkError(links.error) : null;
  const featureDisabled = failure === "feature-disabled";

  /**
   * A failed load is not an empty one: claiming "no pending requests" when
   * the request died tells the agency nothing is waiting on them, which may
   * be false.
   */
  const linksFailed = links.isError;

  /** What a brand types to reach this agency: the address it signs in with. */
  const signInEmail = user?.email ?? "";

  async function copySignInEmail() {
    if (!signInEmail) return;
    try {
      await navigator.clipboard.writeText(signInEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some embedded browsers; the address is on
      // screen and can still be read out or typed.
      toast.error("Couldn't copy — select the address and copy it manually.");
    }
  }

  return (
    <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      {/* What a brand needs from you */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#20242f] via-[#15181f] to-[#0c0e13] p-7 text-white shadow-xl sm:p-8">
        <KeyRound
          className="pointer-events-none absolute -right-8 -top-8 size-44 text-white/[0.06]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/60">
              Your sign-in email
            </p>

            {signInEmail ? (
              <p className="mt-1.5 break-all text-2xl font-extrabold tracking-tight sm:text-3xl">
                {signInEmail}
              </p>
            ) : (
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-white/80">
                {featureDisabled ? "Not enabled yet" : "…"}
              </p>
            )}

            <p className="mt-4 max-w-md text-xs text-white/70">
              {featureDisabled
                ? "Brand partnerships aren't switched on for this environment yet."
                : "Give this to a brand. They enter it in their account, and you approve the request before getting any access."}
            </p>
          </div>

          {signInEmail ? (
            <button
              type="button"
              className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#15181f] shadow-sm transition-colors hover:bg-white/90"
              onClick={copySignInEmail}
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
          ) : linksFailed ? (
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load"
              hint="We don't know what's waiting on you — the list didn't load. Reload to try again."
            />
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
          ) : linksFailed ? (
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load"
              hint="We can't confirm which brands you manage — the list didn't load. Reload to try again."
            />
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
