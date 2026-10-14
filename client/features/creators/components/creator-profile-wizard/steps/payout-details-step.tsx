"use client";

import { AlertTriangle, Building2, Check, Eye, EyeOff, QrCode, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { CLARITY_MASK } from "@/lib/clarity";
import { CreatorBankingDetailsCard } from "@/features/admin/components/creator-banking-details-card";
import { cn } from "@/lib/utils";
import type { CreatorPayoutDetailsMaskedApi } from "@/features/creators/api/types";
import type { PayoutMethod } from "@/features/creators/lib/payout-details";
import type { PayoutFieldErrors } from "@/features/creators/hooks/use-creator-payout-form";

import {
  CwCard,
  CwConfirm,
  CwFacet,
  CwFacetLabel,
  CwField,
  CwFieldLabel,
  CwFieldWarn,
  CwGrid2,
  CwHr,
  CwInput,
  CwReq,
} from "../wizard-ui";

const SAFETY_NOTES = [
  "Payouts are released to this account after an order is approved.",
  "The account must belong to you — third-party accounts are rejected.",
  "We never ask for your card number, PIN, OTP or UPI PIN.",
];

export type PayoutDetailsStepProps = {
  disabled: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  details: CreatorPayoutDetailsMaskedApi | undefined;
  method: PayoutMethod;
  onMethodChange: (method: PayoutMethod) => void;
  accountHolderName: string;
  onAccountHolderNameChange: (value: string) => void;
  accountNumber: string;
  onAccountNumberChange: (value: string) => void;
  confirmAccountNumber: string;
  onConfirmAccountNumberChange: (value: string) => void;
  ifsc: string;
  onIfscChange: (value: string) => void;
  upiId: string;
  onUpiIdChange: (value: string) => void;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  errors?: PayoutFieldErrors;
};

/** Small segmented control for choosing the payout rail. */
function MethodTab({
  active,
  disabled,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-1 cursor-pointer items-center gap-3 rounded-xl border-[1.4px] border-border bg-background px-4 py-3 text-left transition-[background,border-color]",
        active &&
          "border-primary bg-primary/[0.06] shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_8%,transparent)]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          active && "bg-primary/10 text-primary",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-bold text-foreground">
          {label}
        </span>
        <span className="block text-[12px] leading-snug text-muted-foreground">
          {hint}
        </span>
      </span>
    </button>
  );
}

/** One row of the "currently saved" summary. */
function SavedRow({
  icon,
  title,
  active,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 text-[13.5px] font-bold leading-none text-foreground">
            {title}
          </p>
          {active ? (
            <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700">
              Active
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PayoutDetailsStep({
  disabled,
  loading,
  error,
  onRetry,
  details,
  method,
  onMethodChange,
  accountHolderName,
  onAccountHolderNameChange,
  accountNumber,
  onAccountNumberChange,
  confirmAccountNumber,
  onConfirmAccountNumberChange,
  ifsc,
  onIfscChange,
  upiId,
  onUpiIdChange,
  confirmed,
  onConfirmedChange,
  errors = {},
}: PayoutDetailsStepProps) {
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const hasBank = Boolean(details?.hasBankDetails);
  const hasUpi = Boolean(details?.hasUpi);

  if (loading) {
    return (
      <CwCard>
        <div className="flex flex-col gap-3">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </CwCard>
    );
  }

  if (error) {
    return (
      <CwCard>
        <CwFieldWarn>
          <AlertTriangle size={13} aria-hidden />
          We could not load your payout details.{" "}
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer font-bold underline"
          >
            Try again
          </button>
        </CwFieldWarn>
      </CwCard>
    );
  }

  return (
    <CwCard {...CLARITY_MASK}>
      {/* What is saved today */}
      <CwFacet>
        <CwFacetLabel>
          <span>Saved payout method</span>
        </CwFacetLabel>
        <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-background/40">
          <SavedRow
            icon={<Building2 className="size-4" />}
            title="Bank account"
            active={hasBank}
          >
            {hasBank ? (
              <>
                <span className="block">{details?.accountHolderName}</span>
                <span className="block">
                  A/c XXXX {details?.accountNumberLast4}
                  {details?.ifsc ? ` · IFSC ${details.ifsc}` : ""}
                </span>
              </>
            ) : (
              "Not configured"
            )}
          </SavedRow>
          <SavedRow
            icon={<QrCode className="size-4" />}
            title="UPI ID"
            active={hasUpi && !hasBank}
          >
            {hasUpi ? details?.upiMasked : "Not configured"}
          </SavedRow>
        </div>
        {hasBank && hasUpi ? (
          <p className="m-0 text-[12.5px] text-muted-foreground">
            Both are on file — bank transfer is used first for your payouts.
          </p>
        ) : null}
      </CwFacet>

      <CwHr />

      {/* Add / replace */}
      <CwFacet>
        <CwFacetLabel>
          <span>
            {hasBank || hasUpi
              ? "Update your payout method"
              : "Add your payout method"}
          </span>
        </CwFacetLabel>
        <div className="flex gap-3 max-sm:flex-col" role="tablist">
          <MethodTab
            active={method === "bank"}
            disabled={disabled}
            onClick={() => onMethodChange("bank")}
            icon={<Building2 className="size-4" />}
            label="Bank account"
            hint="NEFT/IMPS to your account"
          />
          <MethodTab
            active={method === "upi"}
            disabled={disabled}
            onClick={() => onMethodChange("upi")}
            icon={<QrCode className="size-4" />}
            label="UPI ID"
            hint="Instant transfer to your VPA"
          />
        </div>

        {method === "bank" ? (
          <CwGrid2 className="mt-1">
            <CwField span2>
              <CwFieldLabel htmlFor="payout-account-holder">
                Account holder name <CwReq />
              </CwFieldLabel>
              <CwInput
                id="payout-account-holder"
                autoComplete="off"
                placeholder="Exactly as printed in your passbook"
                value={accountHolderName}
                disabled={disabled}
                onChange={(e) => onAccountHolderNameChange(e.target.value)}
              />
              {errors.accountHolderName ? (
                <CwFieldWarn>
                  <AlertTriangle size={13} aria-hidden />
                  {errors.accountHolderName}
                </CwFieldWarn>
              ) : null}
            </CwField>

            <CwField>
              <CwFieldLabel htmlFor="payout-account-number">
                Account number <CwReq />
              </CwFieldLabel>
              <div className="relative">
                <CwInput
                  id="payout-account-number"
                  type={showAccountNumber ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={
                    hasBank
                      ? `Re-enter to replace XXXX ${details?.accountNumberLast4 ?? ""}`
                      : "9–18 digits"
                  }
                  className="pr-11"
                  value={accountNumber}
                  disabled={disabled}
                  onChange={(e) => onAccountNumberChange(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowAccountNumber((v) => !v)}
                  aria-label={
                    showAccountNumber
                      ? "Hide account number"
                      : "Show account number"
                  }
                  className="absolute right-0 top-0 flex h-11 cursor-pointer items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showAccountNumber ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.accountNumber ? (
                <CwFieldWarn>
                  <AlertTriangle size={13} aria-hidden />
                  {errors.accountNumber}
                </CwFieldWarn>
              ) : null}
            </CwField>

            <CwField>
              <CwFieldLabel htmlFor="payout-account-number-confirm">
                Confirm account number <CwReq />
              </CwFieldLabel>
              <CwInput
                id="payout-account-number-confirm"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Re-type the account number"
                value={confirmAccountNumber}
                disabled={disabled}
                onChange={(e) => onConfirmAccountNumberChange(e.target.value)}
                onPaste={(e) => e.preventDefault()}
              />
              {errors.confirmAccountNumber ? (
                <CwFieldWarn>
                  <AlertTriangle size={13} aria-hidden />
                  {errors.confirmAccountNumber}
                </CwFieldWarn>
              ) : null}
            </CwField>

            <CwField>
              <CwFieldLabel htmlFor="payout-ifsc">
                IFSC code <CwReq />
              </CwFieldLabel>
              <CwInput
                id="payout-ifsc"
                autoComplete="off"
                placeholder="e.g. HDFC0001234"
                className="uppercase"
                value={ifsc}
                disabled={disabled}
                onChange={(e) => onIfscChange(e.target.value.toUpperCase())}
              />
              {errors.ifsc ? (
                <CwFieldWarn>
                  <AlertTriangle size={13} aria-hidden />
                  {errors.ifsc}
                </CwFieldWarn>
              ) : null}
            </CwField>
          </CwGrid2>
        ) : (
          <CwGrid2 className="mt-1">
            <CwField span2>
              <CwFieldLabel htmlFor="payout-upi">
                UPI ID <CwReq />
              </CwFieldLabel>
              <CwInput
                id="payout-upi"
                autoComplete="off"
                placeholder={
                  hasUpi
                    ? `Re-enter to replace ${details?.upiMasked ?? ""}`
                    : "e.g. yourname@okhdfcbank"
                }
                value={upiId}
                disabled={disabled}
                onChange={(e) => onUpiIdChange(e.target.value)}
              />
              {errors.upiId ? (
                <CwFieldWarn>
                  <AlertTriangle size={13} aria-hidden />
                  {errors.upiId}
                </CwFieldWarn>
              ) : null}
            </CwField>
          </CwGrid2>
        )}

        <CwConfirm
          checked={confirmed}
          disabled={disabled}
          onToggle={() => onConfirmedChange(!confirmed)}
          title="These payout details are correct and belong to me"
          description="Payouts sent to a wrong account cannot be reversed by us."
        />
        {errors.confirmed ? (
          <CwFieldWarn>
            <AlertTriangle size={13} aria-hidden />
            {errors.confirmed}
          </CwFieldWarn>
        ) : null}
      </CwFacet>

      <CwHr />

      <div className="rounded-xl border border-border px-4 py-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
          <ShieldCheck size={14} aria-hidden />
          How your details are used
        </div>
        <div className="flex flex-col gap-2">
          {SAFETY_NOTES.map((note) => (
            <span
              key={note}
              className="flex items-start gap-1.5 text-[13px] leading-snug text-muted-foreground"
            >
              <Check
                size={13}
                strokeWidth={3}
                aria-hidden
                className="mt-0.5 shrink-0 text-primary"
              />
              {note}
            </span>
          ))}
        </div>
      </div>
    </CwCard>
  );
}

/**
 * The admin view of the same step: read-only, and behind the same reveal as
 * the order page's banking card — an admin sees full account numbers only when
 * they ask for them, and hiding drops the data from the cache again.
 *
 * There is no admin write endpoint for payout details (the creator's own is
 * self-scoped), so an admin can read these but not change them.
 */
export function AdminPayoutDetailsStep({ creatorId }: { creatorId: string }) {
  return (
    <CwCard>
      <CwFacet>
        <CwFacetLabel>
          <span>Payout details on file</span>
        </CwFacetLabel>
        <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">
          Only the creator can add or change these — this view is read-only.
          Account numbers and UPI IDs stay hidden until you ask for them.
        </p>
        <CreatorBankingDetailsCard creatorId={creatorId} />
      </CwFacet>
    </CwCard>
  );
}
