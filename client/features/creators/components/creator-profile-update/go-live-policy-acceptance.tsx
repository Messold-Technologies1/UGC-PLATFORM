"use client";

import Link from "next/link";
import { Check } from "lucide-react";
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
    <div className={cn("mt-5 space-y-3", className)}>
      <p className="text-sm font-medium text-foreground">
        Before going live, confirm you have read and agree to these policies
        {showRequiredHint ? (
          <span className="font-normal text-muted-foreground">
            {" "}
            — required to go live.
          </span>
        ) : null}
      </p>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {GO_LIVE_POLICY_LINKS.map((policy) => {
          const checkboxId = `go-live-policy-${policy.id}`;
          const checked = Boolean(value[policy.id]);
          return (
            <li key={policy.id} className="m-0">
              <label
                htmlFor={checkboxId}
                data-checked={checked}
                data-disabled={disabled || undefined}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3.5 rounded-xl border-2 border-zinc-400 bg-white p-4 text-left transition-[background,border-color]",
                  checked && "border-primary bg-primary/[0.06]",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  id={checkboxId}
                  className="absolute opacity-0 pointer-events-none"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({ ...value, [policy.id]: e.target.checked })
                  }
                />
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border-2 border-zinc-400 bg-white",
                    checked && "border-primary bg-primary text-white",
                  )}
                  aria-hidden
                >
                  {checked ? <Check size={13} strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-foreground">
                    I agree to the {policy.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">
                    I have read and agree to the{" "}
                    <Link
                      href={policy.href}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-foreground underline underline-offset-2"
                    >
                      {policy.label}
                    </Link>
                    .
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
