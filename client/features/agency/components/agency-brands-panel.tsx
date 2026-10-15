"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useAcceptBrandLinkMutation,
  useAgencyBrandLinksQuery,
  useAgencyPartnerIdQuery,
  useLeaveBrandLinkMutation,
  useRejectBrandLinkMutation,
  useRotatePartnerIdMutation,
} from "@/features/agency/hooks/use-agency-brand-links";

/**
 * The agency's side of the partner link: the code to hand out, the requests
 * waiting on a decision, and the brands already managed.
 *
 * Requests come first on purpose — they are the only thing here that blocks
 * someone else. A brand that has sent a request sees nothing happen until the
 * agency acts, so it should not be buried under a list of existing brands.
 */
export function AgencyBrandsPanel() {
  const partnerId = useAgencyPartnerIdQuery();
  const links = useAgencyBrandLinksQuery();
  const accept = useAcceptBrandLinkMutation();
  const reject = useRejectBrandLinkMutation();
  const leave = useLeaveBrandLinkMutation();
  const rotate = useRotatePartnerIdMutation();

  const [copied, setCopied] = useState(false);

  const pending = (links.data ?? []).filter((l) => l.status === "PENDING");
  const active = (links.data ?? []).filter((l) => l.status === "ACTIVE");

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
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border-2 border-[#181313] bg-white p-5">
        <h2 className="text-lg font-bold text-[#111827]">Your Partner ID</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Share this with a brand. They enter it in their account, and you
          approve the request before you get any access.
        </p>

        {partnerId.isLoading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : partnerId.data ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="rounded-xl border-2 border-[#181313] bg-[#f9fafb] px-4 py-2 font-mono text-lg tracking-widest text-[#111827]">
              {partnerId.data.partnerId}
            </code>
            <Button type="button" variant="outline" onClick={copyPartnerId}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="ghost"
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
              <RefreshCw className="mr-2 h-4 w-4" />
              Rotate
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#b91c1c]">
            Couldn&apos;t load your Partner ID.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#111827]">
          Requests {pending.length > 0 ? `(${pending.length})` : null}
        </h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Brands asking you to manage them. Nothing changes until you accept.
        </p>

        {links.isLoading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : pending.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">No pending requests.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {pending.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#181313] bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-[#111827]">
                    {link.brandName ?? "Unnamed brand"}
                  </p>
                  <p className="text-xs text-[#6b7280]">
                    Asked {new Date(link.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={accept.isPending}
                    onClick={() => accept.mutate(link.id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate(link.id)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#111827]">Brands you manage</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Switch to one from the brand picker to work inside their account.
        </p>

        {links.isLoading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : active.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">
            No brands yet. Share your Partner ID to get started.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {active.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#181313] bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-[#111827]">
                      {link.brandName ?? "Unnamed brand"}
                    </p>
                    <Badge variant="secondary">Managing</Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
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
                  Stop managing
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
