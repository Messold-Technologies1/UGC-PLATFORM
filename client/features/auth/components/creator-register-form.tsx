"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Check, Eye, EyeOff } from "lucide-react";
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

/**
 * Field styling from the Creator Registration design: 2px near-black border,
 * 14px radius, pink focus ring. Shared so every field stays in step.
 */
const gcLabel =
  "font-heading flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground";

const gcInput =
  "h-[52px] w-full rounded-[14px] border-2 border-foreground bg-white px-4 text-[16px] text-foreground placeholder:text-foreground/35 transition-shadow focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-pink/35 dark:bg-slate-950";

const gcFieldBox =
  "flex items-stretch h-[52px] rounded-[14px] border-2 border-foreground bg-white overflow-hidden transition-shadow focus-within:ring-[3px] focus-within:ring-pink/35 dark:bg-slate-950";

const gcHelp = "text-[12.5px] leading-[1.45] text-muted-foreground";

/** Strength-bar colour by score, per the design (weak red → pink → lime). */
const PASSWORD_BAR_COLOR: Record<number, string> = {
  1: "bg-[#DB4A4A]",
  2: "bg-pink",
  3: "bg-lime",
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

const SIGNUP_FIELD_LABELS: Partial<Record<keyof CreatorSignupData, string>> = {
  name: "Full name",
  phone: "Phone number",
  phoneOtpCode: "Phone verification code",
  email: "Email",
  password: "Password (at least 8 characters)",
  termsAccepted: "Terms & guidelines acceptance",
};

function getCreatorSignupBlockers(values: CreatorSignupData): string[] {
  const blockers: string[] = [];
  const parsed = creatorSignupSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CreatorSignupData | undefined;
      const label = key ? SIGNUP_FIELD_LABELS[key] : undefined;
      if (label && !blockers.includes(label)) blockers.push(label);
    }
  }
  return blockers;
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

  const signupFormValues = form.watch();
  const signupBlockers = useMemo(
    () => getCreatorSignupBlockers(signupFormValues),
    [signupFormValues],
  );
  const isSignupComplete = signupBlockers.length === 0;

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
      /* The heading and the "log in" link live in CreatorRegisterPage — this
         is just the card. */
      className="border-foreground shadow-hard flex min-w-0 flex-col overflow-hidden rounded-[28px] border-2 bg-white dark:bg-slate-950"
    >
      <div className="min-w-0 p-[clamp(24px,3.2vw,36px)]">
        <div className="space-y-6">
          {/* Account details */}
          <div className="space-y-3">
            <div className="flex flex-col gap-[22px]">
              <div className="space-y-1">
                <Label
                  htmlFor="name"
                  className={gcLabel}
                >
                  Full name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  className={gcInput}
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="phone"
                  className={gcLabel}
                >
                  Phone number <span className="text-red-500">*</span>
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
                      className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-[15px] font-medium disabled:opacity-70 disabled:cursor-not-allowed"
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
                  <p className={gcHelp}>
                    Select your country code, then enter your mobile number.
                  </p>
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
                    <p className="text-xs text-red-500">{phoneError}</p>
                  ) : null}
                </div>
                {form.formState.errors.phone && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.phone.message}
                  </p>
                )}
                {SIGNUP_OTP_VERIFICATION_ENABLED &&
                form.formState.errors.phoneOtpCode ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.phoneOtpCode.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="email"
                  className={gcLabel}
                >
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className={gcFieldBox}>
                  <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className={gcLabel}>
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    className={cn(gcInput, "pr-13")}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-4"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <div className="flex gap-1.5 pt-[11px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        i < passwordScore
                          ? PASSWORD_BAR_COLOR[passwordScore]
                          : "bg-foreground/12",
                      )}
                    />
                  ))}
                </div>
                <p className={gcHelp}>
                  Minimum 8 characters, with letters, a number and a symbol.
                </p>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="border-foreground bg-secondary shrink-0 space-y-4 border-t-2 p-[clamp(22px,3vw,30px)]">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={form.watch("termsAccepted")}
              onCheckedChange={(checked) =>
                form.setValue("termsAccepted", checked === true, {
                  shouldValidate: true,
                })
              }
              className="border-foreground data-[state=checked]:bg-pink data-[state=checked]:border-foreground data-[state=checked]:text-foreground mt-px h-5 w-5 shrink-0 rounded-[6px] border-2"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="terms"
                className="text-foreground block min-w-0 text-sm leading-[1.55] font-normal"
              >
                I agree to the{" "}
                <Link
                  href="/legal/terms"
                  className="whitespace-nowrap font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
                >
                  Terms of Service
                </Link>
                {", "}
                <Link
                  href="/legal/privacy"
                  className="whitespace-nowrap font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
                >
                  Privacy Policy
                </Link>
                {", "}
                <Link
                  href="/legal/guidelines"
                  className="whitespace-nowrap font-bold text-slate-900 underline decoration-slate-900 underline-offset-2 dark:text-slate-200 dark:decoration-slate-200"
                >
                  Creator Quality Guidelines
                </Link>
                {", and confirm I'm over 13."}
              </Label>
              {form.formState.errors.termsAccepted && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.termsAccepted.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {!isSignupComplete && signupBlockers.length > 0 && !pendingSubmit ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Still needed: {signupBlockers.join(" · ")}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={!isSignupComplete || pendingSubmit}
              className={cn(
                "font-heading h-auto w-full rounded-full border-2 py-[17px] text-base font-bold transition-all",
                isSignupComplete
                  ? "bg-grape border-foreground shadow-hard text-white hover:-translate-y-0.5 hover:translate-x-0.5 hover:bg-grape hover:shadow-none disabled:opacity-70"
                  : "border-foreground/15 text-foreground/40 bg-foreground/[0.07] hover:bg-foreground/[0.07] hover:text-foreground/40",
              )}
            >
              {pendingSubmit ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Setting up your profile...
                </>
              ) : (
                <>Create creator profile &rarr;</>
              )}
            </Button>

            <div className="flex flex-wrap gap-x-5 gap-y-2.5 pt-1">
              {CREATOR_TRUST.map((t) => (
                <span
                  key={t}
                  className="text-muted-foreground inline-flex items-center gap-[7px] text-[12.5px]"
                >
                  <Check
                    className="text-foreground size-3 shrink-0"
                    strokeWidth={3.4}
                  />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
