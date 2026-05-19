"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { sendPhoneOtp, verifyPhoneOtp } from "@/features/auth/api/phone-otp";

const PHONE_OTP_RESEND_SECONDS = 60;
const PHONE_E164_REGEX = /^\+\d{8,15}$/;
const OTP_CODE_REGEX = /^\d{4,10}$/;

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
  onVerifiedChange,
  onVerified,
}: {
  idPrefix: string;
  disabled?: boolean;
  onVerifiedChange: (verified: boolean) => void;
  onVerified?: () => void | Promise<void>;
}) {
  const [phoneInput, setPhoneInput] = useState("");
  const [otpSentToPhone, setOtpSentToPhone] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState<
    number | null
  >(null);
  const [otpClockTick, setOtpClockTick] = useState(0);

  const normalizedPhone = useMemo(
    () => normalizePhoneForOtp(phoneInput),
    [phoneInput],
  );
  const phoneVerified =
    Boolean(normalizedPhone) && verifiedPhone === normalizedPhone;
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
    onSuccess: (_result, variables) => {
      const now = Date.now();
      setOtpSentToPhone(variables.phone);
      setVerifiedPhone(null);
      setOtpCode("");
      setOtpError(null);
      setPhoneError(null);
      setOtpClockTick(now);
      setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
      toast.success("Verification code sent");
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
      const message = "Enter the verification code from the SMS.";
      setOtpError(message);
      toast.error(message);
      return;
    }

    setOtpError(null);
    verifyPhoneOtpMutation.mutate({ phone, code });
  }, [otpCode, otpSentToPhone, phoneInput, verifyPhoneOtpMutation]);

  return (
    <div className="grid gap-2">
      {/* <Label htmlFor={`${idPrefix}-phone`}>Mobile</Label> */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={`${idPrefix}-phone`}
          placeholder="+919876543210"
          autoComplete="tel"
          inputMode="tel"
          disabled={disabled || phoneOtpPending}
          aria-invalid={phoneError ? true : undefined}
          className="min-w-0 sm:flex-1"
          value={phoneInput}
          onChange={(event) => {
            setPhoneInput(event.target.value);
            setVerifiedPhone(null);
            setPhoneError(null);
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleSendPhoneOtp}
          disabled={
            disabled ||
            phoneOtpPending ||
            phoneVerified ||
            (resendSecondsRemaining > 0 && Boolean(activeOtpPhone))
          }
          className="shrink-0 sm:w-28"
        >
          {sendPhoneOtpMutation.isPending ? (
            <>
              <Spinner className="size-4" aria-hidden />
              Sending...
            </>
          ) : phoneVerified ? (
            "Verified"
          ) : resendSecondsRemaining > 0 && activeOtpPhone ? (
            `${resendSecondsRemaining}s`
          ) : activeOtpPhone ? (
            "OTP sent"
          ) : (
            "Send OTP"
          )}
        </Button>
      </div>
      {phoneError ? <p className="text-xs text-destructive">{phoneError}</p> : null}
      {phoneVerified ? (
        <p className="text-xs font-medium text-green-600">
          Mobile number verified.
        </p>
      ) : null}
      {activeOtpPhone && !phoneVerified ? (
        <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
          <Label htmlFor={`${idPrefix}-phone-otp`}>Verification code</Label>
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
          <p className="text-xs text-muted-foreground">
            Enter the code sent to {activeOtpPhone}.
          </p>
          {otpError ? <p className="text-xs text-destructive">{otpError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
