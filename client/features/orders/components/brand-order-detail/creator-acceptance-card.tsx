"use client";

import { CheckCircle2, Clock, Hourglass, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderCreatorSnapshot, OrderDetailsPublic } from "../../api/types";
import { useAcceptanceCountdown } from "../../hooks/use-acceptance-countdown";

interface CreatorAcceptanceCardProps {
  creator?: OrderCreatorSnapshot;
  order: OrderDetailsPublic;
}

/** Statuses that indicate the brief has already been accepted (or beyond). */
const ACCEPTED_STATUSES = [
  "BRIEF_ACCEPTED",
  "PRODUCT_SHIPPED",
  "PRODUCT_RECEIVED",
  "DELIVERED",
  "REVISION_REQUESTED",
  "REVISION_SUBMITTED",
  "ACCEPTED",
  "CREATOR_PAYMENT_DONE",
];

export function CreatorAcceptanceCard({
  creator,
  order,
}: CreatorAcceptanceCardProps) {
  const creatorName = creator?.displayName ?? "Creator";
  const { hours, minutes, seconds, percentage } = useAcceptanceCountdown(
    order.briefSubmittedAt,
    order.status,
  );

  const isAwaitingAcceptance = order.status === "BRIEF_SUBMITTED";
  const isAccepted = ACCEPTED_STATUSES.includes(order.status);
  const isPendingBrief = !isAwaitingAcceptance && !isAccepted;

  let progressColor = "bg-primary";
  if (percentage <= 10) {
    progressColor = "bg-destructive";
  } else if (percentage <= 35) {
    progressColor = "bg-amber-500";
  }

  /* ── Already accepted ─────────────────────────────────────────────── */
  if (isAccepted) {
    return (
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Brief Accepted
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {creatorName} has accepted your project and is working on it.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-emerald-100/60 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/15 p-3.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-200/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 mt-0.5">
            <MessageCircle className="size-3" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You can now chat with {creatorName} and coordinate on deliverables.
          </p>
        </div>
      </div>
    );
  }

  /* ── Brief not submitted yet ──────────────────────────────────────── */
  if (isPendingBrief) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Send className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Creator Acceptance
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Submit your brief to start the acceptance window.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-muted/50 border border-border/50 p-3.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
            <Clock className="size-3" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Once your brief is submitted, {creatorName} will have 48 hours to review and accept the project.
          </p>
        </div>
      </div>
    );
  }

  /* ── Awaiting creator acceptance (active state) ───────────────────── */
  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6 shadow-sm relative overflow-hidden">
      {/* Subtle gradient accent at the top */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="flex items-center gap-3">
        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Hourglass className="size-4" />
          {/* Pulsing ring animation */}
          <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: "2s" }} />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">
            Awaiting Creator Acceptance
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {creatorName} has 48 hours to accept your project.
          </p>
        </div>
      </div>

      {/* Countdown timer */}
      <div className="mt-5 space-y-2">
        <p className="text-xs text-muted-foreground">Time remaining</p>
        <div className="flex items-baseline gap-1">
          {[
            { value: hours, unit: "h" },
            { value: minutes, unit: "m" },
            { value: seconds, unit: "s" },
          ].map(({ value, unit }, idx) => (
            <div key={unit} className="flex items-baseline gap-0.5">
              {idx > 0 && (
                <span className="text-lg font-bold text-muted-foreground/50 mx-1">:</span>
              )}
              <span
                className={cn(
                  "text-3xl font-bold tracking-tight font-mono tabular-nums",
                  percentage <= 10
                    ? "text-destructive"
                    : percentage <= 35
                      ? "text-amber-500"
                      : "text-foreground",
                )}
              >
                {value}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{unit}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full ${progressColor} transition-all duration-1000 ease-linear rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Waiting message */}
      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/15 p-3.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
          <MessageCircle className="size-3" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Hang tight! Once {creatorName} accepts, you&apos;ll be able to chat
          and share shipping details (if applicable).
        </p>
      </div>
    </div>
  );
}
