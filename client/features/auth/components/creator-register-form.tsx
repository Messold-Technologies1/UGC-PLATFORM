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
  instagramUrl: z
    .string()
    .min(1, "Instagram handle is required")
    .max(500),
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
  instagramUrl: "Instagram handle",
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
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Account details only — finish your profile after signup to go live.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm lg:items-end">
            <p className="text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 md:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Your name"
              disabled={pendingAny}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-red-500">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+919876543210"
                disabled={pendingAny}
                value={phoneInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setPhoneInput(next);
                  form.setValue("phone", normalizePhoneForSignup(next), {
                    shouldValidate: true,
                  });
                  setPhoneError(null);
                }}
              />
              {SIGNUP_OTP_VERIFICATION_ENABLED ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    pendingAny ||
                    resendSecondsRemaining > 0 ||
                    !PHONE_E164_REGEX.test(normalizedPhone)
                  }
                  onClick={handleSendPhoneOtp}
                  className="shrink-0"
                >
                  {sendSignupPhoneOtpMutation.isPending
                    ? "Sending…"
                    : resendSecondsRemaining > 0
                      ? `Resend (${resendSecondsRemaining}s)`
                      : activeOtpPhone
                        ? "Resend code"
                        : "Send code"}
                </Button>
              ) : null}
            </div>
            {phoneError || form.formState.errors.phone ? (
              <p className="text-xs text-red-500">
                {phoneError ?? form.formState.errors.phone?.message}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Use E.164 format, e.g. +919876543210
              </p>
            )}
          </div>

          {SIGNUP_OTP_VERIFICATION_ENABLED ? (
            <div className="space-y-2">
              <Label htmlFor="phoneOtpCode">Verification code</Label>
              <Input
                id="phoneOtpCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter SMS code"
                disabled={pendingAny}
                {...form.register("phoneOtpCode")}
              />
              {form.formState.errors.phoneOtpCode ? (
                <p className="text-xs text-red-500">
                  {form.formState.errors.phoneOtpCode.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              disabled={pendingAny}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-500">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                disabled={pendingAny}
                className="pr-10"
                {...form.register("password")}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className="text-xs text-red-500">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram handle</Label>
            <div className="relative">
              <Instagram className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="instagramUrl"
                autoComplete="off"
                placeholder="@yourhandle"
                disabled={pendingAny}
                className="pl-9"
                {...form.register("instagramUrl")}
              />
            </div>
            {form.formState.errors.instagramUrl ? (
              <p className="text-xs text-red-500">
                {form.formState.errors.instagramUrl.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="shrink-0 sticky bottom-0 z-10 space-y-4 border-t border-slate-200 bg-[#fdfcfb] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5 md:px-8 dark:border-slate-800 dark:bg-slate-950">
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
    </form>
  );
}
