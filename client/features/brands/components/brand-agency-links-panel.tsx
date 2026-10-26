"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Handshake, Send } from "lucide-react";
import {
  BRAND_COMPLETENESS_GAP_LABELS,
  type BrandCompletenessGap,
} from "@/features/agency/api/agency-brand-links";
import {
  useBrandAgencyLinksQuery,
  useCancelAgencyLinkMutation,
  useRequestAgencyLinkMutation,
  useRevokeAgencyLinkMutation,
} from "@/features/agency/hooks/use-agency-brand-links";

/**
 * The brand's side of the partner link, as a full page.
 *
 * Mirrors the agency's Brands page so the two halves of the same relationship
 * look like two halves of one feature: a dark hero carrying the single action
 * that matters, then equal cards for what is pending and what is live.
 *
 * The hero here is the Partner ID *input* rather than a code, because a brand
 * does not own one — it redeems the agency's. That asymmetry is the feature:
 * the agency hands out the code, the brand enters it, the agency accepts.
 */

/** A themed empty state, matching the one the credits page uses. */
function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Send;
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

export function BrandAgencyLinksPanel() {
  const links = useBrandAgencyLinksQuery();
  const [partnerId, setPartnerId] = useState("");
  const [serverGaps, setServerGaps] = useState<BrandCompletenessGap[]>([]);

  const request = useRequestAgencyLinkMutation({ onGaps: setServerGaps });
  const cancel = useCancelAgencyLinkMutation();
  const revoke = useRevokeAgencyLinkMutation();

  const completeness = links.data?.completeness;
  // Prefer what the server said on the last attempt; fall back to the list
  // that came with the page.
  const gaps = serverGaps.length ? serverGaps : (completeness?.gaps ?? []);
  const canConnect = completeness?.complete ?? false;

  const pending = (links.data?.links ?? []).filter(
    (l) => l.status === "PENDING",
  );
  const active = (links.data?.links ?? []).filter((l) => l.status === "ACTIVE");

  return (
    <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      {/* Connect hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#20242f] via-[#15181f] to-[#0c0e13] p-7 text-white shadow-xl sm:p-8">
        <Handshake
          className="pointer-events-none absolute -right-8 -top-8 size-44 text-white/[0.06]"
          aria-hidden
        />
        <div className="relative">
          <p className="text-sm font-medium text-white/60">Connect an agency</p>
          <p className="mt-1.5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Let an agency run your campaigns
          </p>
          <p className="mt-3 max-w-xl text-xs text-white/70">
            Ask your agency for their Partner ID and enter it below. They have
            to accept before they get any access — and they can never withdraw
            your credits, edit your brand profile, or connect another agency.
          </p>

          {links.isLoading ? (
            <div className="mt-5 h-11 w-64 animate-pulse rounded-xl bg-white/10" />
          ) : (
            <>
              {!canConnect && gaps.length > 0 ? (
                <div className="mt-5 max-w-xl rounded-2xl bg-white/10 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-white">
                    <AlertCircle className="size-3.5" />
                    Finish your brand profile first
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    An agency acts under your brand&apos;s name on every order
                    and brief a creator sees, so we need these first:
                  </p>
                  <ul className="mt-2 list-inside list-disc text-xs text-white/70">
                    {gaps.map((gap) => (
                      <li key={gap}>{BRAND_COMPLETENESS_GAP_LABELS[gap]}</li>
                    ))}
                  </ul>
                  <Link
                    href="/brand/settings/profile"
                    className="mt-2 inline-block text-xs font-semibold text-white underline"
                  >
                    Go to brand profile →
                  </Link>
                </div>
              ) : null}

              <form
                className="mt-5 flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setServerGaps([]);
                  const trimmed = partnerId.trim();
                  if (!trimmed) return;
                  request.mutate(trimmed, {
                    onSuccess: () => setPartnerId(""),
                  });
                }}
              >
                <input
                  value={partnerId}
                  onChange={(event) => setPartnerId(event.target.value)}
                  placeholder="GC-XXXX-XXXX"
                  aria-label="Agency Partner ID"
                  disabled={!canConnect || request.isPending}
                  className="w-[220px] rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 font-mono text-sm uppercase tracking-widest text-white placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#15181f] shadow-sm transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    !canConnect || request.isPending || !partnerId.trim()
                  }
                >
                  {request.isPending ? "Sending…" : "Send request"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Outgoing requests */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Send className="size-4 text-muted-foreground" />
            Waiting on them
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
              icon={Send}
              title="No requests sent"
              hint="Enter an agency's Partner ID above to ask them to manage your brand."
            />
          ) : (
            <ul className="divide-y divide-border/50">
              {pending.map((link) => (
                <li key={link.id} className="flex items-center gap-3 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {link.agencyName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Sent {new Date(link.requestedAt).toLocaleDateString()} ·
                      awaiting their response
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(link.id)}
                  >
                    Withdraw
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active agencies */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Handshake className="size-4 text-muted-foreground" />
            Agencies managing your brand
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
              icon={Handshake}
              title="No agency has access"
              hint="You keep full control of your account. Connect one above when you're ready to delegate."
            />
          ) : (
            <ul className="divide-y divide-border/50">
              {active.map((link) => (
                <li key={link.id} className="flex items-center gap-3 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {link.agencyName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {link.agencyContactEmail}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    disabled={revoke.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `End ${link.agencyName}'s access? They lose your orders, briefs and creator chats immediately. Everything they placed stays yours.`,
                        )
                      ) {
                        revoke.mutate({ id: link.id });
                      }
                    }}
                  >
                    End access
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
