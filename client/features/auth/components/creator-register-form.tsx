"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";

import {
  registerCreator,
  sendSignupPhoneOtp,
} from "@/features/auth/api/creator-signup";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import {
  getMetaBrowserIds,
  identifyPixelUser,
  newMetaEventId,
  splitFullName,
  trackPixelCustom,
} from "@/lib/meta-pixel";
import { cn } from "@/lib/utils";
import { CountryCodeSelect } from "@/features/auth/components/country-code-select";
import { FieldWarn } from "@/features/auth/components/field-warn";

const gcLabel = "flex items-center gap-1.5 text-[13px] font-semibold text-foreground";

const gcInput =
  "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-foreground shadow-none placeholder:text-foreground/35 focus-visible:border-neutral-300 focus-visible:ring-0 dark:bg-slate-950";

const gcFieldBox =
  "flex items-stretch h-11 rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-none focus-within:border-neutral-300 dark:bg-slate-950";

const gcHelp = "text-xs leading-normal text-muted-foreground";

const gcLink =
  "whitespace-nowrap font-medium text-deep-pink hover:underline underline-offset-2";

/** Strength-bar colour by score (weak red → pink → green). */
const PASSWORD_BAR_COLOR: Record<number, string> = {
  1: "bg-[#DB4A4A]",
  2: "bg-deep-pink",
  3: "bg-[#2E9B57]",
};

/** Same three checks the design scores: length, letters+digits, symbol. */
function scorePassword(value: string): number {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score;
}

const CREATOR_TRUST = [
  "Free to join",
  "You set your pricing",
  "You choose your services",
  "No exclusivity",
];

const PHONE_OTP_RESEND_SECONDS = 60;
const PHONE_E164_REGEX = /^\+\d{8,15}$/;
const OTP_CODE_REGEX = /^\d{4,10}$/;
/** Set to true when signup OTP verification is re-enabled (matches server). */
const SIGNUP_OTP_VERIFICATION_ENABLED = false;

const creatorSignupSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      PHONE_E164_REGEX,
      "Enter a valid phone number with country code, e.g. +14155552671",
    ),
  phoneOtpCode: SIGNUP_OTP_VERIFICATION_ENABLED
    ? z
        .string()
        .regex(OTP_CODE_REGEX, "Enter the verification code from the SMS")
    : z.string().optional().or(z.literal("")),
  email: z.email("Enter a valid email address").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Instagram is connected later from the edit-profile section (OAuth needs an
  // authenticated account), so it's intentionally not collected at signup.
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms",
  }),
});

type CreatorSignupData = z.infer<typeof creatorSignupSchema>;

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

function creatorSignupErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) {
      return "Too many attempts. Please wait before trying again.";
    }
    if (error.response?.status === 503) {
      return "This service is temporarily unavailable.";
    }
  }

  return readApiErrorMessage(error) ?? fallback;
}

function normalizePhoneForSignup(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("+")) return trimmed;
  return `+${trimmed.replace(/\D/g, "")}`;
}

export function CreatorRegisterForm() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  // Country calling code (default India) + the national number typed by the
  // creator; combined into the full E.164 value in `phoneInput`/the form.
  const [countryIso, setCountryIso] = useState("IN");
  const [countryDialCode, setCountryDialCode] = useState("91");
  const [nationalNumber, setNationalNumber] = useState("");
  const [otpSentToPhone, setOtpSentToPhone] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState<
    number | null
  >(null);
  const [otpClockTick, setOtpClockTick] = useState(0);

  const form = useForm<CreatorSignupData>({
    resolver: zodResolver(creatorSignupSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      termsAccepted: false,
      phone: "",
      phoneOtpCode: "",
    },
  });

  const passwordScore = scorePassword(form.watch("password") || "");

  const applyPhone = useCallback(
    (dialCode: string, national: string) => {
      const composed = national ? `+${dialCode}${national}` : "";
      setPhoneInput(composed);
      setOtpSentToPhone(null);
      setPhoneError(null);
      form.setValue("phone", composed, { shouldValidate: true });
      form.setValue("phoneOtpCode", "");
      form.clearErrors("phoneOtpCode");
    },
    [form],
  );

  const handleCountryChange = useCallback(
    (iso: string, dialCode: string) => {
      setCountryIso(iso);
      setCountryDialCode(dialCode);
      applyPhone(dialCode, nationalNumber);
    },
    [applyPhone, nationalNumber],
  );

  const handleNationalNumberChange = useCallback(
    (raw: string) => {
      const digits = raw.replace(/\D/g, "");
      setNationalNumber(digits);
      applyPhone(countryDialCode, digits);
    },
    [applyPhone, countryDialCode],
  );

  const normalizedPhone = normalizePhoneForSignup(phoneInput);
  const activeOtpPhone =
    otpSentToPhone === normalizedPhone ? otpSentToPhone : null;
  const resendSecondsRemaining = otpResendAvailableAt
    ? Math.max(
        0,
        Math.ceil(
          (otpResendAvailableAt -
            (otpClockTick ||
              otpResendAvailableAt - PHONE_OTP_RESEND_SECONDS * 1000)) /
            1000,
        ),
      )
    : 0;

  const sendSignupPhoneOtpMutation = useMutation({
    mutationKey: ["auth", "signup", "phone", "send-otp"],
    mutationFn: sendSignupPhoneOtp,
    onSuccess: (_result, variables) => {
      const now = Date.now();
      setOtpSentToPhone(variables.phone);
      setPhoneError(null);
      setOtpClockTick(now);
      setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
      form.setValue("phone", variables.phone, { shouldValidate: true });
      form.setValue("phoneOtpCode", "");
      form.clearErrors("phoneOtpCode");
      toast.success("Verification code sent");
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 429) {
        const now = Date.now();
        setOtpClockTick(now);
        setOtpResendAvailableAt(now + PHONE_OTP_RESEND_SECONDS * 1000);
      }
      const message = creatorSignupErrorMessage(
        error,
        "Could not send verification code. Check the number and try again.",
      );
      setPhoneError(message);
      toast.error(message);
    },
  });

  const registerCreatorMutation = useMutation({
    mutationKey: ["auth", "register", "creator"],
    mutationFn: registerCreator,
    onSuccess: async (result, variables) => {
      identifyPixelUser({
        email: variables.email,
        ...splitFullName(variables.name),
        phone: variables.phone,
      });
      trackPixelCustom(
        "CreatorRegistration",
        undefined,
        variables.metaSignupEventId,
      );
      queryClient.setQueryData(authMeQueryKey, result.user);
      const callback = searchParams.get("callbackUrl");
      const target = resolveImmediatePostAuthPath(result.user, callback);

      // Land the creator on their profile — they connect Instagram later from
      // the edit-profile section, so signup finishes without any OAuth detour.
      toast.success("Creator profile created");
      beginClientNavigation();
      window.location.replace(target);
    },
    onError: (error) => {
      toast.error(
        creatorSignupErrorMessage(
          error,
          "Could not create creator profile. Please try again.",
        ),
      );
    },
  });

  const pendingSubmit = registerCreatorMutation.isPending;
  const pendingAny = pendingSubmit || sendSignupPhoneOtpMutation.isPending;

  useEffect(() => {
    if (!otpResendAvailableAt) return;

    const intervalId = window.setInterval(
      () => setOtpClockTick(Date.now()),
      1000,
    );
    return () => window.clearInterval(intervalId);
  }, [otpResendAvailableAt]);

  const handleSendPhoneOtp = useCallback(() => {
    const phone = normalizePhoneForSignup(phoneInput);
    if (!PHONE_E164_REGEX.test(phone)) {
      const message =
        "Enter a mobile number in E.164 format, like +919876543210.";
      setPhoneError(message);
      toast.error(message);
      return;
    }

    setPhoneInput(phone);
    setPhoneError(null);
    form.setValue("phone", phone, { shouldValidate: true });
    form.setValue("phoneOtpCode", "");
    form.clearErrors("phoneOtpCode");
    sendSignupPhoneOtpMutation.mutate({ phone });
  }, [form, phoneInput, sendSignupPhoneOtpMutation]);

  const onSubmit = (data: CreatorSignupData) => {
    const email = data.email.trim().toLowerCase();
    const { fbp: metaFbp, fbc: metaFbc } = getMetaBrowserIds();
    const metaSignupEventId = newMetaEventId();
    registerCreatorMutation.mutate({
      email,
      password: data.password,
      name: data.name.trim(),
      phone: data.phone.trim(),
      ...(SIGNUP_OTP_VERIFICATION_ENABLED
        ? { phoneOtpCode: data.phoneOtpCode?.trim() ?? "" }
        : {}),
      ...(metaFbp ? { metaFbp } : {}),
      ...(metaFbc ? { metaFbc } : {}),
      metaSignupEventId,
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-w-0 flex-col"
    >
      <div className="min-w-0">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className={gcLabel}>
                  Full name
                </Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  className={gcInput}
                  {...form.register("name")}
                />
                {form.formState.errors.name ? (
                  <FieldWarn>{form.formState.errors.name.message}</FieldWarn>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className={gcLabel}>
                  Phone number
                </Label>
                <div className="grid gap-3">
                  <div className="flex items-stretch gap-2">
                    <CountryCodeSelect
                      inputId="creator-signup-country"
                      value={countryIso}
                      onChange={handleCountryChange}
                      disabled={pendingAny}
                    />
                    <div className={cn(gcFieldBox, "flex-1 w-full")}>
                    <Input
                      id="creator-signup-phone"
                      placeholder="9876543210"
                      autoComplete="tel-national"
                      inputMode="tel"
                      disabled={pendingAny}
                      aria-invalid={phoneError ? true : undefined}
                      className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3.5 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                      value={nationalNumber}
                      onChange={(event) =>
                        handleNationalNumberChange(event.target.value)
                      }
                    />
                    {SIGNUP_OTP_VERIFICATION_ENABLED ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSendPhoneOtp}
                        disabled={
                          pendingAny ||
                          !PHONE_E164_REGEX.test(normalizedPhone) ||
                          (resendSecondsRemaining > 0 && Boolean(activeOtpPhone))
                        }
                        className={cn(
                          "h-full rounded-none px-5 text-[14px] font-bold transition-colors border-l border-slate-200 dark:border-slate-800",
                          activeOtpPhone
                            ? "bg-[#f4f1f1] text-[#ef3e51] hover:bg-black hover:text-white dark:bg-slate-900 dark:hover:bg-white dark:hover:text-black disabled:text-slate-400 disabled:bg-[#f4f1f1] dark:disabled:bg-slate-900 disabled:opacity-70"
                            : "bg-[#f4f1f1] text-[#8b8489] hover:bg-black hover:text-white dark:bg-slate-900 dark:hover:bg-white dark:hover:text-black dark:text-slate-300 disabled:opacity-70",
                        )}
                      >
                        {sendSignupPhoneOtpMutation.isPending
                          ? "Sending..."
                          : resendSecondsRemaining > 0 && activeOtpPhone
                            ? `Resend ${resendSecondsRemaining}s`
                            : activeOtpPhone
                              ? "Resend"
                              : "Send OTP"}
                      </Button>
                    ) : null}
                    </div>
                  </div>
                  {SIGNUP_OTP_VERIFICATION_ENABLED ? (
                    <>
                      {phoneError ? (
                        <p className="text-xs text-red-500">{phoneError}</p>
                      ) : activeOtpPhone ? (
                        <p className="text-xs font-medium text-green-600 dark:text-green-500">
                          Enter the verification code from the SMS
                        </p>
                      ) : null}
                      {activeOtpPhone ? (
                        <div className="mt-[10px] overflow-x-auto rounded-[11px] border border-[#ffebed] bg-[#fff5f6] px-3 py-2.5 dark:border-red-500/20 dark:bg-red-500/10 sm:px-[12px] sm:py-[10px]">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-[10px]">
                            <Label
                              htmlFor="creator-signup-phone-otp"
                              className="text-[13px] font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap"
                            >
                              Enter OTP
                            </Label>
                            <div className="relative flex items-center gap-1.5 group sm:gap-2">
                              <style>{`
                            @keyframes otp-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                          `}</style>
                              <Input
                                id="creator-signup-phone-otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                disabled={pendingAny}
                                className="absolute inset-0 z-10 w-full h-full bg-transparent text-transparent caret-transparent border-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 cursor-text p-0 m-0 opacity-0"
                                value={form.watch("phoneOtpCode")}
                                onChange={(e) => {
                                  form.setValue(
                                    "phoneOtpCode",
                                    e.target.value.replace(/\D/g, "").slice(0, 6),
                                    { shouldValidate: true },
                                  );
                                }}
                              />
                              {Array.from({ length: 6 }).map((_, i) => {
                                const code = form.watch("phoneOtpCode") || "";
                                const char = code[i];
                                const isActive = code.length === i;
                                return (
                                  <div
                                    key={i}
                                    className={cn(
                                      "relative flex size-9 items-center justify-center rounded-xl border bg-white text-lg font-bold shadow-[0_2px_4px_rgb(0,0,0,0.02)] transition-colors sm:size-[42px] sm:text-[20px] dark:bg-slate-900",
                                      char
                                        ? "border-slate-300 text-slate-900 dark:border-slate-600 dark:text-white"
                                        : "border-slate-200 text-transparent dark:border-slate-800",
                                    )}
                                  >
                                    {char || ""}
                                    {isActive && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-focus-within:opacity-100">
                                        <div
                                          className="w-[1.5px] h-5 bg-slate-900 dark:bg-white"
                                          style={{
                                            animation:
                                              "otp-blink 1s step-end infinite",
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : phoneError ? (
                    <FieldWarn>{phoneError}</FieldWarn>
                  ) : null}
                </div>
                {form.formState.errors.phone ? (
                  <FieldWarn>{form.formState.errors.phone.message}</FieldWarn>
                ) : null}
                {SIGNUP_OTP_VERIFICATION_ENABLED &&
                form.formState.errors.phoneOtpCode ? (
                  <FieldWarn>
                    {form.formState.errors.phoneOtpCode.message}
                  </FieldWarn>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className={gcLabel}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={gcInput}
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <FieldWarn>{form.formState.errors.email.message}</FieldWarn>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className={gcLabel}>
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    className={cn(gcInput, "pr-16")}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-medium"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="flex gap-1.5 pt-2">
                  {[0, 1, 2, 3].map((i) => {
                    const filled = passwordScore === 3 ? 4 : passwordScore;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i < filled
                            ? PASSWORD_BAR_COLOR[Math.max(passwordScore, 1)]
                            : "bg-neutral-200",
                        )}
                      />
                    );
                  })}
                </div>
                <p className={gcHelp}>
                  8+ characters, a number and a symbol.
                </p>
                {form.formState.errors.password ? (
                  <FieldWarn>{form.formState.errors.password.message}</FieldWarn>
                ) : null}
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="mt-9 space-y-6">
        <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={form.watch("termsAccepted")}
              onCheckedChange={(checked) =>
                form.setValue("termsAccepted", checked === true, {
                  shouldValidate: true,
                })
              }
              className="data-[state=checked]:bg-deep-pink data-[state=checked]:border-deep-pink data-[state=checked]:text-white mt-0.5 size-4 shrink-0 rounded-[4px] border border-neutral-300 shadow-none"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="terms"
                className="text-muted-foreground block min-w-0 text-[13px] leading-normal font-normal"
              >
                I agree to the{" "}
                <Link href="/legal/terms" className={gcLink}>
                  Terms of Service
                </Link>
                {", "}
                <Link href="/legal/privacy" className={gcLink}>
                  Privacy Policy
                </Link>
                {" and "}
                <Link href="/legal/guidelines" className={gcLink}>
                  Creator Quality Guidelines
                </Link>
                {", and confirm I'm over 13."}
              </Label>
              {form.formState.errors.termsAccepted ? (
                <FieldWarn>
                  {form.formState.errors.termsAccepted.message}
                </FieldWarn>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <Button
              type="submit"
              disabled={pendingSubmit}
              className="h-11 w-full rounded-xl border-0 bg-deep-pink text-sm font-semibold text-white shadow-none hover:bg-deep-pink/85 hover:translate-x-0 hover:translate-y-0 disabled:opacity-70"
            >
              {pendingSubmit ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Setting up your profile...
                </>
              ) : (
                "Create creator profile"
              )}
            </Button>

            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {CREATOR_TRUST.map((t) => (
                <span
                  key={t}
                  className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
                >
                  <Check
                    className="text-deep-pink size-3.5 shrink-0"
                    strokeWidth={2.6}
                  />
                  {t}
                </span>
              ))}
            </div>
          </div>
      </div>
    </form>
  );
}
