"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderDetailsPublic } from "../../api/types";
import { getOrderWorkTimeline } from "../../lib/delivery-timeline";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getCountdownParts(targetAt: string | null, now: Date) {
  if (!targetAt) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const diffMs = new Date(targetAt).getTime() - now.getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, expired: false };
}

function TimerUnit({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <div className="flex min-w-11 flex-col items-center">
      <span className="text-base font-extrabold tabular-nums leading-none text-foreground">
        {value}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function OrderCountdownBanner({
  order,
  creatorName,
}: Readonly<{
  order: OrderDetailsPublic;
  creatorName: string;
}>) {
  const [now, setNow] = useState(() => new Date());
  const isRevision = order.status === "REVISION_REQUESTED";

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const timeline = useMemo(() => getOrderWorkTimeline(order, now), [order, now]);
  const parts = getCountdownParts(timeline.targetAt, now);

  const helperCopy =
    timeline.phase === "overdue"
      ? isRevision
        ? "The revision window and grace period have both ended. Please check in with the creator or contact support if needed."
        : "The delivery window and grace period have both ended. Please check in with the creator or contact support if needed."
      : timeline.phase === "grace"
        ? isRevision
          ? "The revision deadline has passed. The grace period countdown is now active."
          : "The promised delivery window has ended. The grace period countdown is now active."
        : timeline.phase === "not_started"
          ? isRevision
            ? `${creatorName} is preparing the revision. The countdown starts once the revision window is set.`
            : "The countdown starts once the creator can begin the delivery timeline."
          : isRevision
            ? `You've requested a revision. ${creatorName} is working on updated content.`
            : `${creatorName} is creating your content. You can message the creator for updates or share additional information.`;

  const label =
    timeline.phase === "overdue"
      ? "Current status"
      : timeline.phase === "grace"
        ? "Grace period ends in"
        : timeline.phase === "not_started"
          ? isRevision
            ? "Revision window"
            : "Delivery window"
          : isRevision
            ? "Revision due in"
            : "Delivery due in";

  const tone =
    timeline.phase === "overdue"
      ? "overdue"
      : timeline.phase === "grace"
        ? "grace"
        : "active";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        tone === "overdue"
          ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
          : tone === "grace"
            ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
            : "border-purple-100 bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/30",
      )}
    >
      <div className="flex items-start gap-3">
        <Clock3
          className={cn(
            "mt-0.5 size-5 shrink-0",
            tone === "overdue"
              ? "text-red-500"
              : tone === "grace"
                ? "text-amber-500"
                : "text-purple-500",
          )}
        />
        <p
          className={cn(
            "text-sm font-medium",
            tone === "overdue"
              ? "text-red-900 dark:text-red-300"
              : tone === "grace"
                ? "text-amber-900 dark:text-amber-300"
                : "text-purple-900 dark:text-purple-300",
          )}
        >
          {helperCopy}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 rounded-xl border border-black/5 bg-background/80 px-3.5 py-2.5 dark:border-white/10">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            tone === "overdue"
              ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
              : tone === "grace"
                ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
                : "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300",
          )}
        >
          <Clock3 className="size-4" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          {timeline.phase === "overdue" ? (
            <p className="mt-0.5 text-sm font-bold text-foreground">Overdue</p>
          ) : timeline.phase === "not_started" ? (
            <p className="mt-0.5 text-sm font-bold text-foreground">
              {order.deliveryDaysSnapshot} day
              {order.deliveryDaysSnapshot === 1 ? "" : "s"}
            </p>
          ) : (
            <div className="mt-1.5 flex items-end gap-2">
              <TimerUnit value={pad(parts.days)} label="days" />
              <span className="mb-3 text-sm font-bold text-muted-foreground">:</span>
              <TimerUnit value={pad(parts.hours)} label="hrs" />
              <span className="mb-3 text-sm font-bold text-muted-foreground">:</span>
              <TimerUnit value={pad(parts.minutes)} label="min" />
              <span className="mb-3 text-sm font-bold text-muted-foreground">:</span>
              <TimerUnit value={pad(parts.seconds)} label="sec" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
