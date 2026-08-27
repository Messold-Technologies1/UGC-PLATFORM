"use client";

import { Check, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * The case for connecting Instagram, made where the creator decides.
 *
 * Connecting reads as a permissions ask — "why does this app want my account?"
 * — and the biggest thing it buys is invisible until several steps later, at
 * the Portfolio step. So lead with the reframe: the work is already done, we
 * just need to be pointed at it.
 *
 * The admin variant deliberately makes no offer. An admin cannot complete an
 * Instagram login for someone else, so a Connect button there would be a dead
 * end; what an admin needs is what the gap costs and who can close it.
 */

const CREATOR_BENEFITS = [
  "Pick reels straight from your account — no downloading clips to your phone, no re-uploading",
  "Brands see your real reach and audience, not a number you typed in",
  "Your follower count and views stay up to date on their own",
];

export function InstagramConnectPitch({
  variant = "creator",
  onConnect,
  connecting,
  className,
}: {
  variant?: "creator" | "admin";
  /** Omit to render the pitch without a call to action (e.g. next to an existing Connect button). */
  onConnect?: () => void;
  connecting?: boolean;
  className?: string;
}) {
  const isAdmin = variant === "admin";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-primary/[0.03] to-transparent ${className ?? ""}`}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={{
            background: "linear-gradient(45deg,#f9ce34,#ee2a7b 45%,#6228d7)",
          }}
          aria-hidden
        >
          <Instagram className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          {isAdmin ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                You can&apos;t import reels until they connect
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                They also can&apos;t go live without it. Only the creator can
                finish the Instagram login, so this one needs a nudge rather
                than a click.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">
                Your reels are already your portfolio
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Connect Instagram and build it from the reels you&apos;ve
                already posted — in a couple of taps, from this page.
              </p>

              <ul className="mt-2.5 flex flex-col gap-1.5">
                {CREATOR_BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"
                  >
                    <Check
                      className="mt-0.5 size-3 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {onConnect && !isAdmin ? (
          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-1.5 self-start"
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? (
              <Spinner className="size-4" />
            ) : (
              <Instagram className="size-4" aria-hidden />
            )}
            Connect Instagram
          </Button>
        ) : null}
      </div>
    </div>
  );
}
