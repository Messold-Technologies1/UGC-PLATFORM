"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border-2 border-[#181313] bg-white p-5">
        <h2 className="text-lg font-bold text-[#111827]">Connect an agency</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Ask your agency for their Partner ID and enter it here. They have to
          accept before they get any access to your account.
        </p>

        {links.isLoading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : (
          <>
            {!canConnect && gaps.length > 0 ? (
              <div className="mt-4 rounded-xl border-2 border-[#181313] bg-[#fef3c7] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                  <AlertCircle className="h-4 w-4" />
                  Finish your brand profile first
                </p>
                <p className="mt-1 text-sm text-[#374151]">
                  An agency acts under your brand&apos;s name on every order and
                  brief a creator sees, so we need these first:
                </p>
                <ul className="mt-2 list-inside list-disc text-sm text-[#374151]">
                  {gaps.map((gap) => (
                    <li key={gap}>{BRAND_COMPLETENESS_GAP_LABELS[gap]}</li>
                  ))}
                </ul>
                <Link
                  href="/brand/settings/profile"
                  className="mt-3 inline-block text-sm font-semibold underline"
                >
                  Go to brand profile →
                </Link>
              </div>
            ) : null}

            <form
              className="mt-4 flex flex-wrap items-center gap-3"
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
              <Input
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
                placeholder="GC-XXXX-XXXX"
                aria-label="Agency Partner ID"
                className="max-w-[220px] font-mono tracking-widest uppercase"
                disabled={!canConnect || request.isPending}
              />
              <Button
                type="submit"
                disabled={
                  !canConnect || request.isPending || !partnerId.trim()
                }
              >
                {request.isPending ? "Sending…" : "Send request"}
              </Button>
            </form>
          </>
        )}
      </section>

      {pending.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold text-[#111827]">Waiting on them</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {pending.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#181313] bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-[#111827]">
                    {link.agencyName}
                  </p>
                  <p className="text-xs text-[#6b7280]">
                    Sent {new Date(link.requestedAt).toLocaleDateString()} ·
                    awaiting their response
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate(link.id)}
                >
                  Withdraw
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-bold text-[#111827]">
          Agencies managing your brand
        </h2>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-[#6b7280]">
            None right now. You keep full control of your account.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-[#6b7280]">
              They can place orders paid from your credits and talk to creators
              as you. They cannot withdraw your credits, edit your brand
              profile, or connect another agency.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {active.map((link) => (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#181313] bg-white p-4"
                >
                  <div>
                    <p className="font-semibold text-[#111827]">
                      {link.agencyName}
                    </p>
                    <Badge variant="secondary">Managing</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
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
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
