"use client";

import { Check, Pencil, TriangleAlert } from "lucide-react";

import {
  GoLivePolicyAcceptance,
  type GoLivePolicyAcceptanceState,
} from "@/features/creators/components/creator-profile-update/go-live-policy-acceptance";
import { cn } from "@/lib/utils";

import type { WizardStepId } from "../wizard-config";
import { CwCard, CwFieldWarn } from "../wizard-ui";

export type ReviewRow = {
  stepId: WizardStepId;
  title: string;
  /** Optional detail lines shown under the title. */
  details?: Array<{ label: string; value: string }>;
  /** Optional single summary line (used for pricing). */
  summary?: string;
  status: "complete" | "improve" | "incomplete";
};

export type ReviewStepProps = {
  rows: ReviewRow[];
  onEditStep: (stepId: WizardStepId) => void;
  policies: GoLivePolicyAcceptanceState;
  onPoliciesChange: (value: GoLivePolicyAcceptanceState) => void;
  policiesDisabled: boolean;
  missingItems?: string[];
};

const STATUS_LABEL: Record<ReviewRow["status"], string> = {
  complete: "Complete",
  improve: "Can improve",
  incomplete: "Incomplete",
};

export function ReviewStep({
  rows,
  onEditStep,
  policies,
  onPoliciesChange,
  policiesDisabled,
  missingItems = [],
}: ReviewStepProps) {
  return (
    <CwCard>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.stepId}
            className={cn(
              "flex items-start justify-between gap-4 rounded-xl border border-border p-4",
              row.status === "improve" &&
                "border-[color-mix(in_oklab,#f59e0b_40%,var(--border))] bg-[color-mix(in_oklab,#f59e0b_5%,transparent)]",
            )}
            data-status={row.status}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[14.5px] font-bold text-foreground">
                  {row.title}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-bold",
                    row.status === "complete" &&
                      "bg-[color-mix(in_oklab,#16a34a_12%,transparent)] text-[#15803d]",
                    row.status === "improve" &&
                      "bg-[color-mix(in_oklab,#f59e0b_15%,transparent)] text-[#b45309]",
                    row.status === "incomplete" &&
                      "bg-muted text-muted-foreground",
                  )}
                  data-status={row.status}
                >
                  {row.status === "complete" ? (
                    <Check size={12} strokeWidth={3} aria-hidden />
                  ) : (
                    <TriangleAlert size={12} aria-hidden />
                  )}
                  {STATUS_LABEL[row.status]}
                </span>
              </div>
              {row.details ? (
                <dl className="mt-3 flex flex-col gap-1.5">
                  {row.details.map((d) => (
                    <div key={d.label} className="flex gap-2.5 text-[13px]">
                      <dt className="m-0 w-[92px] shrink-0 text-muted-foreground">
                        {d.label}
                      </dt>
                      <dd className="m-0 font-medium text-foreground">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {row.summary ? (
                <p className="mt-2.5 text-[13px] leading-normal text-muted-foreground">
                  {row.summary}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-muted"
              onClick={() => onEditStep(row.stepId)}
            >
              <Pencil size={13} aria-hidden />
              {row.status === "improve" ? "Add" : "Edit"}
            </button>
          </div>
        ))}
      </div>

      <GoLivePolicyAcceptance
        value={policies}
        onChange={onPoliciesChange}
        showRequiredHint
        disabled={policiesDisabled}
      />

      {missingItems.length > 0 ? (
        <CwFieldWarn>
          <TriangleAlert size={14} aria-hidden className="mt-px shrink-0" />
          <div>
            <strong>Still needed to go live:</strong>{" "}
            {missingItems.join(", ")}.
          </div>
        </CwFieldWarn>
      ) : null}
    </CwCard>
  );
}
