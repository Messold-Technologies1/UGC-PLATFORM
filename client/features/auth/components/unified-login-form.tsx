"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { useLoginMutation } from "@/features/auth/hooks/use-login-mutation";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { startGoogleOAuth } from "@/features/auth/lib/start-google-oauth";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { GoogleMark } from "./google-mark";
import {
  authCtaClass,
  authFieldClass,
  authLabelClass,
  authSecondaryClass,
  AuthDivider,
} from "./unified-auth-controls";

const loginSchema = z.object({
  email: z.email("Enter a valid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

function readLoginError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) {
      return "Invalid email or password.";
    }
    if (error.response?.status === 429) {
      return "Too many attempts. Please wait and try again.";
    }
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === "string") return data.message;
  }
  return "Could not log you in. Please try again.";
}

export function UnifiedLoginForm() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const pending = loginMutation.isPending || googleLoading;

  const callbackUrl = searchParams.get("callbackUrl");
  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleGoogle = useCallback(() => {
    setGoogleLoading(true);
    startGoogleOAuth({ callbackUrl });
  }, [callbackUrl]);

  const onSubmit = (data: LoginData) => {
    // No role sent — the server detects it from the email.
    loginMutation.mutate(
      { email: data.email.trim().toLowerCase(), password: data.password },
      {
        onSuccess: (result) => {
          if (!result.user) return;
          queryClient.setQueryData(authMeQueryKey, result.user);
          toast.success("Welcome back!");
          const target = resolveImmediatePostAuthPath(result.user, callbackUrl);
          beginClientNavigation();
          window.location.replace(target);
        },
        onError: (error) => toast.error(readLoginError(error)),
      },
    );
  };

  return (
    <>
      <h2 className="text-[24px] font-extrabold tracking-tight text-[#181313]">
        Log in
      </h2>
      <p className="mt-2 mb-6 text-[13.5px] text-[#8B8489]">
        Enter your details to continue.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        <label htmlFor="login-email" className={authLabelClass}>
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          disabled={pending}
          className={cn(authFieldClass, "mb-4")}
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="mb-2 text-xs font-semibold text-[#DB4A4A]">
            {form.formState.errors.email.message}
          </p>
        ) : null}

        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="login-password" className={authLabelClass}>
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-[12.5px] font-semibold text-deep-pink hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative mb-5">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            disabled={pending}
            className={cn(authFieldClass, "pr-14")}
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#8B8489] hover:text-[#181313]"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {form.formState.errors.password ? (
          <p className="mb-2 text-xs font-semibold text-[#DB4A4A]">
            {form.formState.errors.password.message}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={authCtaClass}>
          {loginMutation.isPending ? (
            <>
              <Spinner className="size-4" aria-hidden /> Logging in…
            </>
          ) : (
            <>Log in →</>
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

      <p className="mt-5 text-center text-[13px] text-[#8B8489]">
        New here?{" "}
        <Link href={registerHref} className="font-bold text-[#181313] hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
