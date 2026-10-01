"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  type PhoneOtpChannel,
} from "@/features/auth/api/phone-otp";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";

// Five minutes. Long enough that a slow WhatsApp delivery has clearly failed
// before the user burns a rung of the channel ladder on a resend.
const PHONE_OTP_RESEND_SECONDS = 300;
const PHONE_E164_REGEX = /^\+\d{8,15}$/;
const OTP_CODE_REGEX = /^\d{4,10}$/;

/** `m:ss` while the resend lock runs, so a 5-minute wait reads sensibly. */
function formatResendCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function normalizePhoneForOtp(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("+")) return trimmed;
  return `+${trimmed.replace(/\D/g, "")}`;
}

function readApiErrorMessage(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;

  const data = error.response?.data;
  if (typeof data === "string") return data;

  const message = (data as { message?: unknown } | undefined)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) {
    return message.find((item): item is string => typeof item === "string");
  }

  return undefined;
}

function phoneOtpErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) {
      return "Too many attempts. Please wait before trying again.";
    }
    if (error.response?.status === 503) {
      return "Phone verification is temporarily unavailable.";
    }
  }

  const message = readApiErrorMessage(error);
  if (message && message !== "Invalid request.") return message;
  return fallback;
}

export function PhoneVerificationField({
  idPrefix,
  disabled = false,
  invalid = false,
  onVerifiedChange,
  onOtpSentChange,
  onVerified,
  onVerifiedPhone,
  initialPhone,
  initialVerified = false,
}: {
  idPrefix: string;
  disabled?: boolean;
  /**
   * Highlights the field as needing attention — used when a parent form is
   * submitted before the number has been OTP-verified.
   */
  invalid?: boolean;
  onVerifiedChange: (verified: boolean) => void;
  /** Fires when a code is outstanding for the number currently typed in. */
  onOtpSentChange?: (sent: boolean) => void;
  onVerified?: () => void | Promise<void>;
  /** Fires with the verified E.164 phone (e.g. "+919876543210") on success. */
  onVerifiedPhone?: (phone: string) => void;
  /**
   * Pre-fill the field with an existing number (E.164, e.g. "+919876543210").
   * Used on edit-profile screens so a saved number shows up instead of a blank
   * field.
   */
  initialPhone?: string;
  /**
   * Treat {@link initialPhone} as already verified (grandfathered or previously
   * verified). The field then shows "Verified" with the OTP flow hidden, and
   * only asks for a fresh OTP once the number is edited to a different value.
   */
  initialVerified?: boolean;
}) {
  const [phoneInput, setPhoneInput] = useState(() =>
    normalizePhoneForOtp(initialPhone ?? ""),
  );
  const [otpSentToPhone, setOtpSentToPhone] = useState<string | null>(null);
  // The number that was already verified when the field mounted (grandfathered
  // or saved earlier). Captured once so it stays a stable anchor even as the
  // parent re-renders with a changed `initialVerified` after the user edits —
  // reverting to this exact number counts as verified again with no re-OTP.
  const [initialVerifiedPhone] = useState<string | null>(() =>
    initialVerified && initialPhone
      ? normalizePhoneForOtp(initialPhone)
      : null,
  );
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState<
    number | null
  >(null);
  const [otpClockTick, setOtpClockTick] = useState(0);
  /**
   * Channel the last code went out on. Each resend steps down the ladder
   * (WhatsApp -> SMS), so the user has to be told where to look.
   */
  const [otpChannel, setOtpChannel] = useState<PhoneOtpChannel>("whatsapp");

  const normalizedPhone = useMemo(
    () => normalizePhoneForOtp(phoneInput),
    [phoneInput],
  );
  /**
   * With the OTP step switched off there is nothing to prove, so a well-formed
   * number is treated as accepted and the parent form can submit. The number is
   * still saved by that form's own update call, and the server records it as
   * unverified.
   */
  const otpEnabled = env.phoneOtpEnabled;
  const phoneVerified = otpEnabled
    ? Boolean(normalizedPhone) &&
      (verifiedPhone === normalizedPhone ||
        initialVerifiedPhone === normalizedPhone)
    : PHONE_E164_REGEX.test(normalizedPhone);
  const activeOtpPhone =
    otpSentToPhone === normalizedPhone ? otpSentToPhone : null;

  const resendSecondsRemaining = useMemo(() => {
    if (!otpResendAvailableAt) return 0;
    return Math.max(
      0,
      Math.ceil(
        (otpResendAvailableAt -
          (otpClockTick ||
            otpResendAvailableAt - PHONE_OTP_RESEND_SECONDS * 1000)) /
          1000,
      ),
    );
  }, [otpClockTick, otpResendAvailableAt]);

  useEffect(() => {
    onVerifiedChange(phoneVerified);
  }, [onVerifiedChange, phoneVerified]);

  useEffect(() => {
    // Without an OTP round trip nothing else reports the number upwards.
    if (otpEnabled || !phoneVerified) return;
    onVerifiedPhone?.(normalizedPhone);
  }, [normalizedPhone, onVerifiedPhone, otpEnabled, phoneVerified]);

  useEffect(() => {
    onOtpSentChange?.(Boolean(activeOtpPhone) && !phoneVerified);
  }, [activeOtpPhone, onOtpSentChange, phoneVerified]);

  useEffect(() => {
    if (!otpResendAvailableAt) return;

    const intervalId = window.setInterval(
      () => setOtpClockTick(Date.now()),
      1000,
    );
    return () => window.clearInterval(intervalId);
  }, [otpResendAvailableAt]);

  const sendPhoneOtpMutation = useMutation({
    mutationKey: ["auth", "phone", "send-otp"],
    mutationFn: sendPhoneOtp,
    onSuccess: (result, variables) => {
      const now = Date.now();
      setOtpChannel(result.channel);
      setOtpSentToPhone(variables.phone);
      setVerifiedPhone(null);
      setOtpCode("");
      setOtpError(null);
      setPhoneError(null);
      setOtpClockTick(now);
      setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
      toast.success(
        result.channel === "whatsapp"
          ? "Verification code sent on WhatsApp"
          : "Verification code sent by SMS",
      );
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 429) {
        const now = Date.now();
        setOtpClockTick(now);
        setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
      }
      toast.error(
        phoneOtpErrorMessage(
          error,
          "Could not send verification code. Check the number and try again.",
        ),
      );
    },
  });

  const verifyPhoneOtpMutation = useMutation({
    mutationKey: ["auth", "phone", "verify-otp"],
    mutationFn: verifyPhoneOtp,
    onSuccess: (result, variables) => {
      if (!result.phoneVerified) {
        const message = "Incorrect or expired code.";
        setOtpError(message);
        toast.error(message);
        return;
      }

      setVerifiedPhone(variables.phone);
      setPhoneInput(variables.phone);
      setOtpSentToPhone(null);
      setOtpCode("");
      setOtpError(null);
      setPhoneError(null);
      setOtpResendAvailableAt(null);
      onVerifiedPhone?.(variables.phone);
      void onVerified?.();
      toast.success("Mobile number verified");
    },
    onError: (error) => {
      const message = phoneOtpErrorMessage(
        error,
        "Could not verify the code. Try again.",
      );
      setOtpError(message);
      toast.error(message);
    },
  });

  const phoneOtpPending =
    sendPhoneOtpMutation.isPending || verifyPhoneOtpMutation.isPending;

  const handleSendPhoneOtp = useCallback(() => {
    const phone = normalizePhoneForOtp(phoneInput);
    if (!PHONE_E164_REGEX.test(phone)) {
      const message = "Enter a mobile number in E.164 format, like +919876543210.";
      setPhoneError(message);
      toast.error(message);
      return;
    }

    if (phoneVerified) {
      toast.message("Mobile number is already verified");
      return;
    }

    setPhoneInput(phone);
    setPhoneError(null);
    sendPhoneOtpMutation.mutate({ phone });
  }, [phoneInput, phoneVerified, sendPhoneOtpMutation]);

  const handleVerifyPhoneOtp = useCallback(() => {
    const phone = normalizePhoneForOtp(phoneInput);
    const code = otpCode.trim();

    if (!otpSentToPhone || phone !== otpSentToPhone) {
      const message = "Send a new verification code for this mobile number.";
      setOtpError(message);
      toast.error(message);
      return;
    }

    if (!OTP_CODE_REGEX.test(code)) {
      const message = "Enter the verification code we sent you.";
      setOtpError(message);
      toast.error(message);
      return;
    }

    setOtpError(null);
verifyPhoneOtpMutation.mutate({ phone, code });
  }, [otpCode, otpSentToPhone, phoneInput, verifyPhoneOtpMutation]);

  return (
    <div className="grid gap-2">
      <div
        className={cn(
          "flex items-center h-10 rounded-lg border bg-white overflow-hidden dark:bg-slate-950 focus-within:ring-2 focus-within:ring-offset-2 w-full",
          invalid && !phoneVerified
            ? "border-amber-500 focus-within:ring-amber-500/40 dark:border-amber-500"
            : "border-slate-200 dark:border-slate-800 focus-within:ring-slate-950 dark:focus-within:ring-slate-300",
        )}
      >
        <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-sm font-medium text-[#8b8489]">
          +91
        </div>
        <Input
          id={`${idPrefix}-phone`}
          placeholder="9876543210"
          autoComplete="tel-national"
          inputMode="tel"
          disabled={disabled || phoneOtpPending}
          aria-invalid={phoneError || (invalid && !phoneVerified) ? true : undefined}
          className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
          value={phoneInput.startsWith("+91") ? phoneInput.slice(3) : phoneInput}
          onChange={(event) => {
            let val = event.target.value;
            if (val.startsWith("+91")) val = val.slice(3);
            const digits = val.replace(/\D/g, "");
            setPhoneInput(digits ? `+91${digits}` : "");
            setVerifiedPhone(null);
            setPhoneError(null);
          }}
        />
        {otpEnabled ? (
        <Button
          type="button"
          variant="ghost"
          onClick={handleSendPhoneOtp}
          disabled={
            disabled ||
            phoneOtpPending ||
            phoneVerified ||
            !PHONE_E164_REGEX.test(normalizedPhone) ||
            (resendSecondsRemaining > 0 && Boolean(activeOtpPhone))
          }
          className="h-full rounded-none border-l border-slate-200 !bg-[#f4f1f1] hover:!bg-[#e8e5e5] !text-[#8b8489] px-4 text-xs font-semibold dark:!bg-slate-900 dark:border-slate-800 dark:hover:!bg-slate-800 dark:!text-slate-300"
        >
          {phoneVerified ? (
            "Verified"
          ) : phoneOtpPending ? (
            "Sending..."
          ) : resendSecondsRemaining > 0 && activeOtpPhone ? (
            formatResendCountdown(resendSecondsRemaining)
          ) : (
            "Send OTP"
          )}
        </Button>
        ) : null}
      </div>
      {phoneError ? <p className="text-xs text-destructive">{phoneError}</p> : null}
      {otpEnabled && phoneVerified ? (
        <p className="text-xs font-medium text-green-600">
          Mobile number verified.
        </p>
      ) : null}
      {activeOtpPhone && !phoneVerified ? (
        <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
          <Label htmlFor={`${idPrefix}-phone-otp`} className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-heading">Verification code</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${idPrefix}-phone-otp`}
              value={otpCode}
              onChange={(event) => {
                setOtpError(null);
                setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 10));
              }}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              disabled={disabled || phoneOtpPending}
              aria-invalid={otpError ? true : undefined}
              className="sm:flex-1"
            />
            <Button
              type="button"
              onClick={handleVerifyPhoneOtp}
              disabled={disabled || phoneOtpPending || !otpCode.trim()}
              className="sm:w-28"
            >
              {verifyPhoneOtpMutation.isPending ? (
                <Spinner className="size-4" aria-hidden />
              ) : (
                "Verify"
              )}
            </Button>
          </div>
          <p className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
            {otpChannel === "whatsapp"
              ? "Code sent on WhatsApp"
              : "Code sent by SMS"}{" "}
            to {activeOtpPhone}
          </p>
          {otpError ? <p className="text-xs text-destructive">{otpError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
