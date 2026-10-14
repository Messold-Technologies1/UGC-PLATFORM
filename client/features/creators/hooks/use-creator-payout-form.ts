"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  CreatorPayoutDetailsMaskedApi,
  UpsertCreatorPayoutDetailsApi,
} from "../api/types";
import {
  normalizeAccountNumber,
  normalizeIfsc,
  normalizeUpiId,
  validateAccountHolderName,
  validateAccountNumber,
  validateIfsc,
  validateUpiId,
  type PayoutMethod,
} from "../lib/payout-details";
import { useCreatorPayoutDetailsMutation } from "./use-creator-payout-details-mutation";
import { useCreatorPayoutDetailsQuery } from "./use-creator-payout-details-query";

export type PayoutFieldErrors = {
  accountHolderName?: string;
  accountNumber?: string;
  confirmAccountNumber?: string;
  ifsc?: string;
  upiId?: string;
  confirmed?: string;
};

export type CreatorPayoutForm = {
  query: ReturnType<typeof useCreatorPayoutDetailsQuery>;
  /** Masked summary of what is saved today (undefined while loading). */
  details: CreatorPayoutDetailsMaskedApi | undefined;
  /** True once a bank account or a UPI ID is saved on the server. */
  configured: boolean;
  method: PayoutMethod;
  setMethod: (method: PayoutMethod) => void;
  accountHolderName: string;
  setAccountHolderName: (value: string) => void;
  accountNumber: string;
  setAccountNumber: (value: string) => void;
  confirmAccountNumber: string;
  setConfirmAccountNumber: (value: string) => void;
  ifsc: string;
  setIfsc: (value: string) => void;
  upiId: string;
  setUpiId: (value: string) => void;
  confirmed: boolean;
  setConfirmed: (value: boolean) => void;
  /** The creator typed something that would change what is stored. */
  hasInput: boolean;
  fieldErrors: PayoutFieldErrors;
  /** Human-readable list of what is still missing, for the step validator. */
  validate: () => string[];
  /** Null when there is nothing new to send (already configured, no edits). */
  buildPayload: () => UpsertCreatorPayoutDetailsApi | null;
  save: (
    payload: UpsertCreatorPayoutDetailsApi,
    onSuccess?: () => void,
  ) => void;
  saving: boolean;
};

/**
 * Form state for the creator Payout Details step.
 *
 * The API only ever returns payout details masked (last 4 of the account, a
 * masked VPA), so secrets are never prefilled: the account holder name and
 * IFSC come back in full and are shown as-is, while the account number and UPI
 * ID have to be retyped to be changed. A creator who already has details saved
 * can therefore leave the step untouched and `buildPayload()` returns null — no
 * request is sent and nothing is overwritten.
 *
 * Fields that mirror saved values (method, holder name, IFSC, the confirmation)
 * are held as nullable drafts and fall back to the server value while null, so
 * nothing has to be copied into state in an effect: a refetch after a save
 * shows through on its own.
 */
export function useCreatorPayoutForm(options: {
  enabled: boolean;
}): CreatorPayoutForm {
  const { enabled } = options;
  const query = useCreatorPayoutDetailsQuery({ enabled });
  const details = query.data;

  const configured = Boolean(details?.hasBankDetails || details?.hasUpi);
  const savedHolderName = details?.accountHolderName ?? "";
  const savedIfsc = details?.ifsc ?? "";

  const [methodDraft, setMethod] = useState<PayoutMethod | null>(null);
  const [holderNameDraft, setAccountHolderName] = useState<string | null>(null);
  const [ifscDraft, setIfsc] = useState<string | null>(null);
  const [confirmedDraft, setConfirmed] = useState<boolean | null>(null);
  const [accountNumber, setAccountNumberState] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumberState] = useState("");
  const [upiId, setUpiId] = useState("");

  // Default to whichever rail is already on file; bank for a first-time setup.
  const method: PayoutMethod =
    methodDraft ??
    (details?.hasBankDetails ? "bank" : details?.hasUpi ? "upi" : "bank");
  const accountHolderName = holderNameDraft ?? savedHolderName;
  const ifsc = ifscDraft ?? savedIfsc;
  // Details already on file were confirmed once; don't ask again until the
  // creator actually edits something.
  const confirmed = confirmedDraft ?? configured;

  const setAccountNumber = useCallback(
    (value: string) => setAccountNumberState(normalizeAccountNumber(value)),
    [],
  );
  const setConfirmAccountNumber = useCallback(
    (value: string) =>
      setConfirmAccountNumberState(normalizeAccountNumber(value)),
    [],
  );

  const hasInput = useMemo(() => {
    if (method === "upi") return upiId.trim().length > 0;
    // Bank: a newly typed account number, or an edit to the saved name / IFSC.
    return (
      accountNumber.trim().length > 0 ||
      confirmAccountNumber.trim().length > 0 ||
      accountHolderName.trim() !== savedHolderName.trim() ||
      normalizeIfsc(ifsc) !== normalizeIfsc(savedIfsc)
    );
  }, [
    method,
    upiId,
    accountNumber,
    confirmAccountNumber,
    accountHolderName,
    ifsc,
    savedHolderName,
    savedIfsc,
  ]);

  // Switching to bank with details already on file still needs the full
  // account number: the server only ever gave us the last 4.
  const fieldErrors = useMemo<PayoutFieldErrors>(() => {
    const needsEntry = hasInput || !configured;
    if (!needsEntry) return {};

    if (method === "upi") {
      return {
        upiId: validateUpiId(upiId),
        confirmed: confirmed ? undefined : "Confirm your payout details.",
      };
    }

    return {
      accountHolderName: validateAccountHolderName(accountHolderName),
      accountNumber: validateAccountNumber(accountNumber),
      confirmAccountNumber:
        accountNumber.trim() && confirmAccountNumber.trim() !== accountNumber.trim()
          ? "Account numbers do not match."
          : undefined,
      ifsc: validateIfsc(ifsc),
      confirmed: confirmed ? undefined : "Confirm your payout details.",
    };
  }, [
    hasInput,
    configured,
    method,
    upiId,
    accountHolderName,
    accountNumber,
    confirmAccountNumber,
    ifsc,
    confirmed,
  ]);

  const validate = useCallback((): string[] => {
    const missing: string[] = [];
    const needsEntry = hasInput || !configured;
    if (!needsEntry) return missing;

    if (method === "upi") {
      if (validateUpiId(upiId)) missing.push("a valid UPI ID");
    } else {
      if (validateAccountHolderName(accountHolderName))
        missing.push("the account holder name");
      if (validateAccountNumber(accountNumber))
        missing.push("a valid account number");
      else if (confirmAccountNumber.trim() !== accountNumber.trim())
        missing.push("a matching account number confirmation");
      if (validateIfsc(ifsc)) missing.push("a valid IFSC code");
    }
    if (!confirmed) missing.push("the payout details confirmation");
    return missing;
  }, [
    hasInput,
    configured,
    method,
    upiId,
    accountHolderName,
    accountNumber,
    confirmAccountNumber,
    ifsc,
    confirmed,
  ]);

  const buildPayload = useCallback((): UpsertCreatorPayoutDetailsApi | null => {
    if (!hasInput) return null;
    if (method === "upi") {
      const upi = normalizeUpiId(upiId);
      return upi ? { upiId: upi } : null;
    }
    const account = accountNumber.trim();
    const name = accountHolderName.trim();
    const code = normalizeIfsc(ifsc);
    if (!account || !name || !code) return null;
    // Bank fields are sent together — the API rejects a partial bank update.
    return { accountHolderName: name, accountNumber: account, ifsc: code };
  }, [hasInput, method, upiId, accountNumber, accountHolderName, ifsc]);

  const mutation = useCreatorPayoutDetailsMutation();

  const save = useCallback(
    (payload: UpsertCreatorPayoutDetailsApi, onSuccess?: () => void) => {
      mutation.mutate(payload, {
        onSuccess: () => {
          // Never keep the full account number / VPA in memory after a save;
          // the refreshed masked summary is what the step shows from here, and
          // dropping the drafts re-derives the rest from the saved details.
          setAccountNumberState("");
          setConfirmAccountNumberState("");
          setUpiId("");
          setAccountHolderName(null);
          setIfsc(null);
          setMethod(null);
          setConfirmed(null);
          onSuccess?.();
        },
      });
    },
    [mutation],
  );

  return {
    query,
    details,
    configured,
    method,
    setMethod,
    accountHolderName,
    setAccountHolderName,
    accountNumber,
    setAccountNumber,
    confirmAccountNumber,
    setConfirmAccountNumber,
    ifsc,
    setIfsc,
    upiId,
    setUpiId,
    confirmed,
    setConfirmed,
    hasInput,
    fieldErrors,
    validate,
    buildPayload,
    save,
    saving: mutation.isPending,
  };
}
