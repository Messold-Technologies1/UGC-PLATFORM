"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff, Instagram } from "lucide-react";
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

const PHONE_OTP_RESEND_SECONDS = 60;
const PHONE_E164_REGEX = /^\+\d{8,15}$/;
const OTP_CODE_REGEX = /^\d{4,10}$/;
/** Set to true when signup OTP verification is re-enabled (matches server). */
const SIGNUP_OTP_VERIFICATION_ENABLED = false;

const creatorSignupSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone is required"),
  phoneOtpCode: SIGNUP_OTP_VERIFICATION_ENABLED
    ? z
        .string()
        .regex(OTP_CODE_REGEX, "Enter the verification code from the SMS")
    : z.string().optional().or(z.literal("")),
  email: z.email("Enter a valid email address").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Optional now — creators are prompted to connect Instagram from their
  // profile after signup (OAuth needs an authenticated account), rather than
  // typing a handle here.
  instagramUrl: z.string().max(500),
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

/** Mobile-only wizard steps. Desktop (xl:) shows all sections at once. */
const STEP_TITLES = ["Account", "Social"] as const;
const STEP_FIELDS: (keyof CreatorSignupData)[][] = [
  ["name", "phone", "email", "password"],
  ["instagramUrl", "termsAccepted"],
];
const LAST_STEP = STEP_TITLES.length - 1;

export function CreatorRegisterForm() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [otpSentToPhone, setOtpSentToPhone] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState<
    number | null
  >(null);
  const [otpClockTick, setOtpClockTick] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<CreatorSignupData>({
    resolver: zodResolver(creatorSignupSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      instagramUrl: "",
      password: "",
      termsAccepted: false,
      phone: "",
      phoneOtpCode: "",
    },
  });

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
    onSuccess: (result, variables) => {
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
      toast.success("Creator profile created");
      queryClient.setQueryData(authMeQueryKey, result.user);
      const callback = searchParams.get("callbackUrl");
      const target = resolveImmediatePostAuthPath(result.user, callback);
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

  const handleNextStep = useCallback(async () => {
    const valid = await form.trigger(STEP_FIELDS[currentStep]);
    if (!valid) return;
    setCurrentStep((step) => Math.min(step + 1, LAST_STEP));
  }, [form, currentStep]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }, []);

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
      instagramUrl: data.instagramUrl.trim(),
      ...(metaFbp ? { metaFbp } : {}),
      ...(metaFbc ? { metaFbc } : {}),
      metaSignupEventId,
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-w-0 flex-col bg-[#fdfcfb] dark:bg-slate-950 xl:min-h-0 xl:h-full"
    >
      <div className="shrink-0 sticky top-0 z-20 border-b border-slate-200 bg-[#fdfcfb] px-4 py-3 sm:px-6 sm:py-4 md:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start lg:gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Create your creator profile
            </h1>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm lg:items-end">
            <p className="text-slate-500">
              Already a creator?{" "}
              <Link
                href="/login?role=creator"
                className="font-semibold text-slate-900 hover:underline dark:text-slate-50"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 xl:hidden">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>
              Step {currentStep + 1} of {STEP_TITLES.length}:{" "}
              {STEP_TITLES[currentStep]}
            </span>
            <span>
              {Math.round(((currentStep + 1) / STEP_TITLES.length) * 100)}%
            </span>
          </div>
          <div className="flex gap-1.5">
            {STEP_TITLES.map((title, i) => (
              <div
                key={title}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= currentStep
                    ? "bg-[#ef3e51]"
                    : "bg-slate-200 dark:bg-slate-800",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 px-4 pt-4 pb-6 sm:px-6 sm:pt-6 sm:pb-8 md:px-8 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--ink-4)_transparent]">
        <div className="space-y-6">
          {/* STEP 1: Account */}
          <div
            className={cn(
              currentStep === 0 ? "block" : "hidden",
              "xl:block",
              "space-y-3",
            )}
          >
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                1
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Account
              </h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label
                  htmlFor="name"
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Full name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  className="h-[42px] rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#ef3e51] focus-visible:ring-[3px] focus-visible:ring-[#ef3e51]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800"
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
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Phone number <span className="text-red-500">*</span>
                </Label>
                <div className="grid gap-3">
                  <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white overflow-hidden w-full transition-[border-color,box-shadow] duration-150 focus-within:border-[#ef3e51] focus-within:ring-[3px] focus-within:ring-[#ef3e51]/[0.13] focus-within:bg-white dark:bg-slate-950 dark:border-slate-800 dark:focus-within:border-slate-700 dark:focus-within:ring-slate-800">
                    <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-4 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[15px] font-semibold text-[#8b8489]">
                      +91
                    </div>
                    <Input
                      id="creator-signup-phone"
                      placeholder="0123456789"
                      autoComplete="tel-national"
                      inputMode="tel"
                      disabled={pendingAny}
                      aria-invalid={phoneError ? true : undefined}
                      className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-[15px] font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                      value={
                        phoneInput.startsWith("+91")
                          ? phoneInput.slice(3)
                          : phoneInput
                      }
                      onChange={(event) => {
                        let val = event.target.value;
                        if (val.startsWith("+91")) val = val.slice(3);
                        const digits = val.replace(/\D/g, "");
                        const next = digits ? `+91${digits}` : "";
                        setPhoneInput(next);
                        setOtpSentToPhone(null);
                        setPhoneError(null);
                        form.setValue("phone", next, {
                          shouldValidate: true,
                        });
                        form.setValue("phoneOtpCode", "");
                        form.clearErrors("phoneOtpCode");
                      }}
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
                  className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                >
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#ef3e51] focus-within:ring-[3px] focus-within:ring-[#ef3e51]/[0.13] focus-within:bg-white dark:bg-slate-950 dark:border-slate-800 dark:focus-within:border-slate-700 dark:focus-within:ring-slate-800">
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
                <div className="flex flex-col items-start gap-1 lg:flex-row lg:items-center lg:gap-2">
                  <Label
                    htmlFor="password"
                    className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]"
                  >
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    min 8 chars, mix letters + numbers + symbol
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    className="h-[42px] pr-10 rounded-[11px] border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white transition-[border-color,box-shadow] duration-150 focus-visible:border-[#ef3e51] focus-visible:ring-[3px] focus-visible:ring-[#ef3e51]/[0.13] focus-visible:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-800"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: Social (Instagram only) */}
          <div
            className={cn(
              currentStep === 1 ? "block" : "hidden",
              "xl:block",
              "space-y-3",
            )}
          >
            <div className="inline-flex items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                2
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B8489] font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                Social
              </h2>
            </div>

            <div className="space-y-3">
              <div className="rounded-[11px] border border-slate-200 bg-white p-4 dark:bg-slate-950 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white">
                    <Instagram className="size-4" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-[13px] font-[800] text-black dark:text-white font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
                      Connect your Instagram after signup
                    </p>
                    <p className="text-[12px] leading-relaxed text-[#6b6469] dark:text-slate-400">
                      Once your profile is created, connect your Instagram in one
                      tap to verify your audience and get better brand matches.
                      You can connect, change, or disconnect it anytime from your
                      profile — no need to enter a handle here.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 sticky bottom-0 z-10 space-y-4 border-t border-slate-200 bg-[#fdfcfb] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5 md:px-8 dark:border-slate-800 dark:bg-slate-950">
        {currentStep < LAST_STEP ? (
          <div className="flex items-center gap-3 xl:hidden">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="h-11 rounded-full px-6 text-[15px] font-bold"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              onClick={handleNextStep}
              className="h-11 flex-1 rounded-full bg-[#ef3e51] text-[15px] font-bold text-white hover:bg-[#d63647] dark:bg-[#ef3e51] dark:hover:bg-[#d63647]"
            >
              Next
            </Button>
          </div>
        ) : null}

        <div
          className={cn(
            currentStep === LAST_STEP ? "space-y-4" : "hidden",
            "xl:block xl:space-y-4",
          )}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={form.watch("termsAccepted")}
              onCheckedChange={(checked) =>
                form.setValue("termsAccepted", checked === true, {
                  shouldValidate: true,
                })
              }
              className="mt-0.5 shrink-0 h-4 w-4 border border-slate-300 accent-[#ef3e51] data-[state=checked]:bg-[#ef3e51] data-[state=checked]:border-[#ef3e51] data-[state=checked]:text-white dark:border-slate-600"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="terms"
                className="block min-w-0 text-[13px] font-normal leading-snug text-slate-600 dark:text-slate-400"
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
              <Button
                type="submit"
                disabled={!isSignupComplete || pendingSubmit}
                className={cn(
                  "h-11 w-full rounded-full text-[15px] font-bold transition-colors lg:flex-1",
                  isSignupComplete
                    ? "bg-[#ef3e51] text-white hover:bg-[#d63647] disabled:opacity-70 dark:bg-[#ef3e51] dark:hover:bg-[#d63647]"
                    : "bg-[#F2F2F2] text-[#8B8489] hover:bg-[#E8E8E8] hover:text-[#7A7579] dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                )}
              >
                {pendingSubmit ? (
                  <>
                    <Spinner className="size-4" aria-hidden />
                    Creating profile...
                  </>
                ) : (
                  <>Create my creator profile &rarr;</>
                )}
              </Button>

              <div className="w-full text-center text-[11px] text-[#8B8489] leading-tight lg:w-auto lg:shrink-0 lg:text-right">
                Hiring instead? <br />
                <Link
                  href="/register/brand"
                  className="font-bold text-slate-950 hover:underline dark:text-slate-50 text-[13px]"
                >
                  Sign up as a brand
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
