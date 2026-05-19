"use client";

import { MessageCircle } from "lucide-react";
import type { OrderCreatorSnapshot, OrderDetailsPublic } from "../../api/types";
import { useAcceptanceCountdown } from "../../hooks/use-acceptance-countdown";

interface CreatorAcceptanceCardProps {
  creator?: OrderCreatorSnapshot;
  order: OrderDetailsPublic;
}

export function CreatorAcceptanceCard({
  creator,
  order,
}: CreatorAcceptanceCardProps) {
  const creatorName = creator?.displayName ?? "Creator";
  const { hours, minutes, seconds, percentage } = useAcceptanceCountdown(
    order.briefSubmittedAt,
    order.status,
  );

  let progressColor = "bg-primary";
  if (percentage <= 10) {
    progressColor = "bg-destructive";
  } else if (percentage <= 35) {
    progressColor = "bg-amber-500";
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h3 className="text-base font-bold text-foreground">
        Creator Acceptance
      </h3>
      <p className="text-sm text-muted-foreground mt-2">
        {creatorName} has 48 hours to accept your project.
      </p>

      <div className="mt-4 space-y-2">
        <p className="text-xs text-muted-foreground">Time remaining</p>
        <p className="text-3xl font-bold tracking-tight text-foreground font-mono tabular-nums">
          {hours}h : {minutes}m : {seconds}s
        </p>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full ${progressColor} transition-all duration-1000 ease-linear rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-muted/50 border border-border/50 p-3.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
          <MessageCircle className="size-3" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Once accepted, you&apos;ll be able to chat with {creatorName} and
          share shipping details (if applicable).
        </p>
      </div>
    </div>
  );
}
