"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  IndianRupee,
  Images,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { profileStepHref, type CompletenessGroup } from "@/features/creators/lib/profile-completeness-steps";
import type { WizardStepId } from "@/features/creators/components/creator-profile-wizard/wizard-config";

const STEP_ICON: Record<WizardStepId, React.ComponentType<{ className?: string }>> = {
  about: UserRound,
  base: MapPin,
  identity: Sparkles,
  pricing: IndianRupee,
  portfolio: Images,
  payouts: Wallet,
  "intro-video": Images,
  review: BadgeCheck,
  "go-live": BadgeCheck,
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type OrderProfileCompletionGateViewProps = {
  loading?: boolean;
  /** Everything outstanding, already grouped by the step that fixes it. */
  groups: CompletenessGroup[];
  totalGaps: number;
  isComplete: boolean;
  /** Where "Continue to the order" goes once nothing is outstanding. */
  orderHref: string;
  briefHref: string;
  /** Where each "Fix this" link should return to. */
  returnTo: string;
  order: {
    brandName: string;
    packageName: string | null;
    payoutInr: number;
    deliveryDays: number | null;
  };
};

/**
 * Where a creator with an unfinished profile lands right after accepting a
 * brief, and again if they try to submit the delivery before finishing it.
 *
 * Accepting is never blocked — they take the order first and sort this out
 * while they shoot — but the delivery cannot be submitted until the checklist
 * is clear, which is the rule the API enforces too. Everything outstanding is
 * grouped by the profile step that fixes it, and each group deep-links into
 * that step and returns here.
 *
 * Pure presentation: every input is a prop, so it renders the same in the app
 * and in a fixture (which is how its screenshots are taken).
 */
export function OrderProfileCompletionGateView({
  loading = false,
  groups,
  totalGaps,
  isComplete,
  orderHref,
  briefHref,
  returnTo,
  order,
}: OrderProfileCompletionGateViewProps) {
  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={orderHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to the order
      </Link>

      {/* Why this page exists */}
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl",
              isComplete
                ? "bg-emerald-50 text-emerald-600"
                : "bg-primary/10 text-primary",
            )}
            aria-hidden
          >
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-xl font-bold leading-tight text-foreground sm:text-2xl">
              {isComplete
                ? "You're all set — nothing left to finish"
                : "Finish your profile before you deliver"}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {isComplete
                ? "Everything we need is on file. Head back to the order and get shooting."
                : "The order is yours — go ahead and shoot. These details have to be in before you can submit the delivery, so the brand can reach you and we can pay you for it."}
            </p>
          </div>
        </div>

        {/* Order context */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
          <div>
            <p className="m-0 text-xs font-medium text-muted-foreground">
              Brand
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {order.brandName}
            </p>
          </div>
          <div>
            <p className="m-0 text-xs font-medium text-muted-foreground">
              Package
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {order.packageName ?? "—"}
            </p>
          </div>
          <div>
            <p className="m-0 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Wallet className="size-3" aria-hidden />
              Est. payout
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {order.payoutInr > 0 ? formatCurrency(order.payoutInr) : "—"}
            </p>
          </div>
          <div>
            <p className="m-0 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Clock className="size-3" aria-hidden />
              Delivery
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {order.deliveryDays ? `${order.deliveryDays} days` : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* What is left */}
      {isComplete ? (
        <section className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
          <p className="m-0 text-sm font-medium text-emerald-900">
            Your profile is complete. You can submit the delivery whenever it
            is ready.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 text-sm font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Still to do
            </h2>
            <span className="text-xs font-semibold text-muted-foreground">
              {totalGaps} {totalGaps === 1 ? "item" : "items"} across{" "}
              {groups.length} {groups.length === 1 ? "section" : "sections"}
            </span>
          </div>

          {groups.map((group) => {
            const Icon = STEP_ICON[group.step];
            return (
              <div
                key={group.step}
                className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    aria-hidden
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-bold text-foreground">
                      {group.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {group.blurb}
                    </p>
                    {/* A single item that just repeats the section title (the
                        payout step) would read twice; the heading says it. */}
                    <ul
                      className={cn(
                        "m-0 mt-2 flex flex-wrap gap-1.5 p-0",
                        group.items.length === 1 &&
                          group.items[0] === group.title &&
                          "hidden",
                      )}
                    >
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="list-none rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-2.5 py-1 text-[12px] font-medium text-amber-900"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 w-full shrink-0 rounded-full px-5 font-semibold sm:w-auto"
                >
                  <Link href={profileStepHref(group.step, returnTo)}>
                    Fix this
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            );
          })}
        </section>
      )}

      {/* Actions */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="m-0 text-xs leading-relaxed text-muted-foreground sm:max-w-sm">
          {isComplete
            ? "Upload your content from the order page when it is ready."
            : "You can do this any time before you submit — but the delivery window is already running."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            asChild
            variant="ghost"
            className="h-10 rounded-full px-4 font-semibold text-muted-foreground"
          >
            <Link href={briefHref}>Review the brief again</Link>
          </Button>
          <Button
            asChild
            className="h-10 rounded-full px-5 font-semibold"
            variant={isComplete ? "default" : "outline"}
          >
            <Link href={orderHref}>
              {isComplete ? "Continue to the order" : "Back to the order"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
