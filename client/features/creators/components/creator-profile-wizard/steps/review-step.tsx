"use client";

import { Check, Pencil, TriangleAlert, Wallet } from "lucide-react";

import {
  GoLivePolicyAcceptance,
  type GoLivePolicyAcceptanceState,
} from "@/features/creators/components/creator-profile-update/go-live-policy-acceptance";
import type { WizardStepId } from "../wizard-config";

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
  onAddPayout: () => void;
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
  onAddPayout,
}: ReviewStepProps) {
  return (
    <div className="cw-card">
      <div className="cw-review-list">
        {rows.map((row) => (
          <div key={row.stepId} className="cw-review-row" data-status={row.status}>
            <div className="cw-review-main">
              <div className="cw-review-head">
                <span className="cw-review-title">{row.title}</span>
                <span className="cw-review-badge" data-status={row.status}>
                  {row.status === "complete" ? (
                    <Check size={12} strokeWidth={3} aria-hidden />
                  ) : (
                    <TriangleAlert size={12} aria-hidden />
                  )}
                  {STATUS_LABEL[row.status]}
                </span>
              </div>
              {row.details ? (
                <dl className="cw-review-details">
                  {row.details.map((d) => (
                    <div key={d.label}>
                      <dt>{d.label}</dt>
                      <dd>{d.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {row.summary ? (
                <p className="cw-review-summary">{row.summary}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="cw-review-edit"
              onClick={() => onEditStep(row.stepId)}
            >
              <Pencil size={13} aria-hidden />
              {row.status === "improve" ? "Add" : "Edit"}
            </button>
          </div>
        ))}
      </div>

      {/* Payout prompt */}
      <div className="cw-payout">
        <span className="cw-payout-icon">
          <Wallet size={16} aria-hidden />
        </span>
        <div className="cw-payout-text">
          <span className="cw-payout-title">Payout details</span>
          <span className="cw-payout-sub">
            Add a bank account or UPI ID so we can pay you.
          </span>
        </div>
        <button type="button" className="cw-btn cw-btn-ghost cw-payout-btn" onClick={onAddPayout}>
          Add payout
        </button>
      </div>

      <GoLivePolicyAcceptance
        value={policies}
        onChange={onPoliciesChange}
        showRequiredHint
        disabled={policiesDisabled}
      />
    </div>
  );
}
