"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const GO_LIVE_POLICY_LINKS = [
  {
    id: "ai-content-policy",
    label: "AI Content Policy",
    href: "/legal/ai-content-policy",
  },
  {
    id: "usage-rights-policy",
    label: "Usage Rights Policy",
    href: "/legal/usage-rights-policy",
  },
  {
    id: "payout-policy",
    label: "Payout Policy",
    href: "/legal/payout-policy",
  },
  {
    id: "creator-quality-guidelines",
    label: "Creator Guidelines",
    href: "/legal/guidelines",
  },
] as const;

export type GoLivePolicyId = (typeof GO_LIVE_POLICY_LINKS)[number]["id"];

export type GoLivePolicyAcceptanceState = Record<GoLivePolicyId, boolean>;

export function createEmptyGoLivePolicyAcceptance(
  accepted = false,
): GoLivePolicyAcceptanceState {
  return {
    "ai-content-policy": accepted,
    "usage-rights-policy": accepted,
    "payout-policy": accepted,
    "creator-quality-guidelines": accepted,
  };
}

export function areAllGoLivePoliciesAccepted(
  state: GoLivePolicyAcceptanceState,
): boolean {
  return GO_LIVE_POLICY_LINKS.every((policy) => state[policy.id]);
}

type GoLivePolicyAcceptanceProps = {
  value: GoLivePolicyAcceptanceState;
  onChange: (next: GoLivePolicyAcceptanceState) => void;
  disabled?: boolean;
  className?: string;
  /** When true, show “Required to go live” helper copy. */
  showRequiredHint?: boolean;
};

export function GoLivePolicyAcceptance({
  value,
  onChange,
  disabled = false,
  className,
  showRequiredHint = true,
}: Readonly<GoLivePolicyAcceptanceProps>) {
  return (
    <div
      className={cn(
        "mt-5 space-y-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-4 sm:px-5",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">
        Before going live, confirm you have read and agree to these policies
        {showRequiredHint ? (
          <span className="font-normal text-muted-foreground">
            {" "}
            — required to go live.
          </span>
        ) : null}
      </p>
      <ul className="space-y-3">
        {GO_LIVE_POLICY_LINKS.map((policy) => {
          const checkboxId = `go-live-policy-${policy.id}`;
          return (
            <li key={policy.id} className="flex items-start gap-3">
              <Checkbox
                id={checkboxId}
                checked={value[policy.id]}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onChange({ ...value, [policy.id]: checked === true })
                }
                className="mt-0.5 shrink-0"
              />
              <label
                htmlFor={checkboxId}
                className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground"
              >
                I have read and agree to the{" "}
                <Link
                  href={policy.href}
                  target="_blank"
                  className="font-semibold text-foreground underline underline-offset-2"
                >
                  {policy.label}
                </Link>
                .
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
