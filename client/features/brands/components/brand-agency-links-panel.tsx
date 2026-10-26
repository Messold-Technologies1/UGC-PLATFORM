"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Handshake } from "lucide-react";
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
 * The brand's side: connect an agency by entering their Partner ID, and manage
 * who currently has access.
 *
 * The connect form is disabled until the brand profile is complete. That is a
 * server rule, not a UI nicety — the request is refused with the same list of
 * gaps — so the point of showing it here is to say exactly what is missing
 * rather than let someone submit and be told no.
 *
 * Styled as a settings card to sit alongside the profile form and notification
 * preferences on the same screen.
 */
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
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Handshake className="size-4 text-muted-foreground" />
        Agency access
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Ask your agency for their Partner ID and enter it here. They have to
        accept before they get any access to your account.
      </p>

      {links.isLoading ? (
        <div className="mt-4 h-10 w-full max-w-sm animate-pulse rounded-xl bg-muted" />
      ) : (
        <>
          {!canConnect && gaps.length > 0 ? (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <AlertCircle className="size-3.5" />
                Finish your brand profile first
              </p>
              <p className="mt-1 text-xs text-amber-900/80">
                An agency acts under your brand&apos;s name on every order and
                brief a creator sees, so we need these first:
              </p>
              <ul className="mt-2 list-inside list-disc text-xs text-amber-900/80">
                {gaps.map((gap) => (
                  <li key={gap}>{BRAND_COMPLETENESS_GAP_LABELS[gap]}</li>
                ))}
              </ul>
              <Link
                href="/brand/settings/profile"
                className="mt-2 inline-block text-xs font-semibold text-amber-900 underline"
              >
                Go to brand profile →
              </Link>
            </div>
          ) : null}

          <form
            className="mt-4 flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setServerGaps([]);
              const trimmed = partnerId.trim();
              if (!trimmed) return;
              request.mutate(trimmed, { onSuccess: () => setPartnerId("") });
            }}
          >
            <input
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              placeholder="GC-XXXX-XXXX"
              aria-label="Agency Partner ID"
              disabled={!canConnect || request.isPending}
              className="w-[200px] rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
              disabled={!canConnect || request.isPending || !partnerId.trim()}
            >
              {request.isPending ? "Sending…" : "Send request"}
            </button>
          </form>
        </>
      )}

      {pending.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Waiting on them
          </h3>
          <ul className="mt-2 divide-y divide-border/50">
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
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Agencies managing your brand
        </h3>

        {active.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            None right now. You keep full control of your account.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              They can place orders paid from your credits and talk to creators
              as you. They cannot withdraw your credits, edit your brand
              profile, or connect another agency.
            </p>
            <ul className="mt-2 divide-y divide-border/50">
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
          </>
        )}
      </div>
    </div>
  );
}
