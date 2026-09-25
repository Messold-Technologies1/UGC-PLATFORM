"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { registerAccount } from "@/features/auth/api/signup-account";
import { sendSignupPhoneOtp } from "@/features/auth/api/phone-otp";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { startGoogleOAuth } from "@/features/auth/lib/start-google-oauth";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { GoogleMark } from "./google-mark";
import { FieldWarn } from "@/features/auth/components/field-warn";
import {
  authCtaClass,
  authFieldClass,
  authLabelClass,
  authSecondaryClass,
  AuthDivider,
} from "./unified-auth-controls";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.email("Enter a valid email address").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  phoneOtpCode: z
    .string()
    .regex(/^\d{4,10}$/, "Enter the code sent to your phone"),
});

type SignupData = z.infer<typeof signupSchema>;

function readSignupError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 409) {
      return "An account with this email already exists. Try logging in instead.";
    }
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === "string") return data.message;
    if (Array.isArray(data?.message) && typeof data.message[0] === "string") {
      return data.message[0];
    }
  }
  return "Could not create your account. Please try again.";
}

export function UnifiedSignupForm() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl");
  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  const form = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      phoneOtpCode: "",
    },
  });
  const phoneValue = form.watch("phone");
  const phoneDigits = phoneValue?.startsWith("+91")
    ? phoneValue.slice(3)
    : phoneValue ?? "";
  const phoneComplete = /^\+91[6-9]\d{9}$/.test(phoneValue ?? "");

  const [otpSent, setOtpSent] = useState(false);
  const [otpResendAt, setOtpResendAt] = useState<number | null>(null);
  const [, setOtpTick] = useState(0);
  const resendSeconds = otpResendAt
    ? Math.max(0, Math.ceil((otpResendAt - Date.now()) / 1000))
    : 0;

  useEffect(() => {
    if (!otpResendAt) return;
    const id = window.setInterval(() => setOtpTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [otpResendAt]);

  const sendOtpMutation = useMutation({
    mutationFn: sendSignupPhoneOtp,
    onSuccess: () => {
      setOtpSent(true);
      setOtpResendAt(Date.now() + 60_000);
      form.clearErrors("phoneOtpCode");
      toast.success("Verification code sent");
    },
    onError: (error) => {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      toast.error(
        status === 429
          ? "Too many attempts. Please wait a moment."
          : status === 503
            ? "Phone verification is temporarily unavailable."
            : "Could not send the code. Check the number and try again.",
      );
    },
  });

  const handleSendOtp = useCallback(() => {
    if (!phoneComplete) {
      form.setError("phone", {
        message: "Enter a valid 10-digit mobile number",
      });
      return;
    }
    sendOtpMutation.mutate({ phone: phoneValue });
  }, [form, phoneComplete, phoneValue, sendOtpMutation]);

  const registerMutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: (user) => {
      queryClient.setQueryData(authMeQueryKey, user);
      const target = resolveImmediatePostAuthPath(user, callbackUrl);
      beginClientNavigation();
      window.location.replace(target);
    },
    onError: (error) => toast.error(readSignupError(error)),
  });

  const pending = registerMutation.isPending || googleLoading;

  const handleGoogle = useCallback(() => {
    setGoogleLoading(true);
    // No role param: the user chooses creator/brand after Google returns. The
    // Terms of Service / Privacy Policy consent is collected on that screen.
    startGoogleOAuth({ callbackUrl });
  }, [callbackUrl]);

  const onSubmit = (data: SignupData) => {
    registerMutation.mutate({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      phone: data.phone,
      phoneOtpCode: data.phoneOtpCode,
    });
  };

  const onInvalidSubmit = useCallback(() => {
    if (otpSent) return;
    form.setError("phoneOtpCode", {
      type: "manual",
      message: "Please verify your number. Click Send OTP.",
    });
    document.getElementById("signup-phone")?.focus();
  }, [form, otpSent]);

  const needsOtpWarning = !otpSent && Boolean(form.formState.errors.phoneOtpCode);

  return (
    <>
      <h2 className="text-[22px] font-extrabold tracking-tight text-[#181313]">
        Create your account
      </h2>
      <p className="mt-1.5 mb-4 text-[13px] text-[#8B8489]">
        Start with email — you’ll choose Creator or Brand next.
      </p>

      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)}
        className="flex flex-col"
      >
        <div className="mb-3">
          <label htmlFor="signup-name" className={authLabelClass}>
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            disabled={pending}
            aria-invalid={Boolean(form.formState.errors.name)}
            className={cn(
              authFieldClass,
              form.formState.errors.name &&
                "border-amber-500 focus:border-amber-500 focus:ring-amber-500/15",
            )}
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <FieldWarn>{form.formState.errors.name.message}</FieldWarn>
          ) : null}
        </div>

        <div className="mb-3">
          <label htmlFor="signup-email" className={authLabelClass}>
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            disabled={pending}
            aria-invalid={Boolean(form.formState.errors.email)}
            className={cn(
              authFieldClass,
              form.formState.errors.email &&
                "border-amber-500 focus:border-amber-500 focus:ring-amber-500/15",
            )}
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <FieldWarn>{form.formState.errors.email.message}</FieldWarn>
          ) : null}
        </div>

        <div className="mb-3">
          <label htmlFor="signup-password" className={authLabelClass}>
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a password"
              disabled={pending}
              aria-invalid={Boolean(form.formState.errors.password)}
              className={cn(
                authFieldClass,
                "pr-14",
                form.formState.errors.password &&
                  "border-amber-500 focus:border-amber-500 focus:ring-amber-500/15",
              )}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] font-semibold text-[#8B8489] hover:text-[#181313]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {form.formState.errors.password ? (
            <FieldWarn>{form.formState.errors.password.message}</FieldWarn>
          ) : null}
        </div>

        {/* Phone + OTP — verified at account creation for email signup. */}
        <div className="mb-3">
          <label htmlFor="signup-phone" className={authLabelClass}>
            Phone number
          </label>
          <div className="flex gap-2">
            <div
              className={cn(
                "flex flex-1 items-stretch overflow-hidden rounded-[11px] border-[1.5px] bg-white focus-within:border-deep-pink",
                form.formState.errors.phone || needsOtpWarning
                  ? "border-amber-500 focus-within:border-amber-500"
                  : "border-[#e7e1e4]",
              )}
            >
              <span className="flex items-center bg-[#faf4f6] px-2.5 text-[13px] font-semibold text-[#8B8489]">
                +91
              </span>
              <input
                id="signup-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="9876543210"
                disabled={pending}
                aria-invalid={
                  Boolean(form.formState.errors.phone) || needsOtpWarning
                }
                className="h-[42px] flex-1 bg-transparent px-3 text-[14px] text-[#181313] outline-none placeholder:text-[#B0AAAE]"
                value={phoneDigits}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  form.setValue("phone", digits ? `+91${digits}` : "", {
                    shouldValidate: true,
                  });
                  form.clearErrors("phoneOtpCode");
                  setOtpSent(false);
                  setOtpResendAt(null);
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={pending || !phoneComplete || resendSeconds > 0}
              className={cn(
                "h-[42px] shrink-0 rounded-[11px] border-[1.5px] bg-white px-3.5 text-[13px] font-semibold text-[#181313] hover:bg-[#faf4f6] disabled:opacity-60",
                needsOtpWarning ? "border-amber-500" : "border-[#e7e1e4]",
              )}
            >
              {sendOtpMutation.isPending
                ? "Sending…"
                : resendSeconds > 0
                  ? `${resendSeconds}s`
                  : otpSent
                    ? "Resend"
                    : "Send OTP"}
            </button>
          </div>
          {form.formState.errors.phone ? (
            <FieldWarn>{form.formState.errors.phone.message}</FieldWarn>
          ) : needsOtpWarning ? (
            <FieldWarn>Please verify your number. Click Send OTP.</FieldWarn>
          ) : null}
        </div>

        {otpSent ? (
          <div className="mb-3">
            <label htmlFor="signup-otp" className={authLabelClass}>
              Verification code
            </label>
            <input
              id="signup-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              placeholder="Enter the 6-digit code"
              disabled={pending}
              aria-invalid={Boolean(form.formState.errors.phoneOtpCode)}
              className={cn(
                authFieldClass,
                form.formState.errors.phoneOtpCode &&
                  "border-amber-500 focus:border-amber-500 focus:ring-amber-500/15",
              )}
              value={form.watch("phoneOtpCode")}
              onChange={(e) =>
                form.setValue(
                  "phoneOtpCode",
                  e.target.value.replace(/\D/g, "").slice(0, 10),
                  { shouldValidate: true },
                )
              }
            />
            <p className="mt-1 text-[11.5px] text-[#a89ea3]">
              Sent to +91 {phoneDigits}. It’s verified when you create your
              account.
            </p>
            {form.formState.errors.phoneOtpCode ? (
              <FieldWarn>{form.formState.errors.phoneOtpCode.message}</FieldWarn>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={cn(authCtaClass, "mt-1")}
        >
          {registerMutation.isPending ? (
            <>
              <Spinner className="size-4" aria-hidden /> Creating account…
            </>
          ) : (
            <>Create account →</>
          )}
        </button>
      </form>

      <AuthDivider>or</AuthDivider>

      <button
        type="button"
        disabled={pending}
        onClick={handleGoogle}
        className={authSecondaryClass}
      >
        {googleLoading ? (
          <Spinner className="size-4" aria-hidden />
        ) : (
          <GoogleMark className="size-5" />
        )}
        Continue with Google
      </button>

      <p className="mt-4 text-center text-[13px] text-[#8B8489]">
        Already have an account?{" "}
        <Link href={loginHref} className="font-bold text-[#181313] hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
