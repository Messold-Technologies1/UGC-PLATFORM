"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { registerAccount } from "@/features/auth/api/signup-account";
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

const signupSchema = z.object({
  email: z.email("Enter a valid email address").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  termsAccepted: z.boolean().refine((v) => v === true, {
    message: "Please accept the terms to continue",
  }),
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
    defaultValues: { email: "", password: "", termsAccepted: false },
  });
  const termsAccepted = form.watch("termsAccepted");

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
    if (!form.getValues("termsAccepted")) {
      form.setError("termsAccepted", {
        message: "Please accept the terms to continue",
      });
      return;
    }
    setGoogleLoading(true);
    // No role param: the user chooses creator/brand after Google returns.
    startGoogleOAuth({ callbackUrl });
  }, [callbackUrl, form]);

  const onSubmit = (data: SignupData) => {
    registerMutation.mutate({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });
  };

  return (
    <>
      <h2 className="text-[24px] font-extrabold tracking-tight text-[#181313]">
        Create your account
      </h2>
      <p className="mt-2 mb-6 text-[13.5px] text-[#8B8489]">
        Start with email — you’ll choose Creator or Brand next.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        <label htmlFor="signup-email" className={authLabelClass}>
          Email
        </label>
        <input
          id="signup-email"
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

        <label htmlFor="signup-password" className={authLabelClass}>
          Password
        </label>
        <div className="relative mb-4">
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a password"
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

        {/* Terms — required for BOTH email and Google signup. */}
        <div className="mb-5 mt-1 flex items-start gap-3">
          <Checkbox
            id="signup-terms"
            checked={termsAccepted}
            disabled={pending}
            onCheckedChange={(checked) =>
              form.setValue("termsAccepted", checked === true, {
                shouldValidate: true,
              })
            }
            className="mt-0.5 size-4 shrink-0 rounded-[4px] border border-neutral-300 shadow-none data-[state=checked]:border-deep-pink data-[state=checked]:bg-deep-pink data-[state=checked]:text-white"
          />
          <div className="min-w-0 flex-1">
            <label
              htmlFor="signup-terms"
              className="block text-[12.5px] font-normal leading-normal text-[#8B8489]"
            >
              I agree to the{" "}
              <Link
                href="/legal/terms"
                className="font-medium text-deep-pink hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                className="font-medium text-deep-pink hover:underline"
              >
                Privacy Policy
              </Link>
              , and confirm I’m over 13.
            </label>
            {form.formState.errors.termsAccepted ? (
              <p className="mt-1 text-xs font-semibold text-[#DB4A4A]">
                {form.formState.errors.termsAccepted.message}
              </p>
            ) : null}
          </div>
        </div>

        <button type="submit" disabled={pending} className={authCtaClass}>
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
        disabled={pending || !termsAccepted}
        onClick={handleGoogle}
        aria-disabled={!termsAccepted}
        title={!termsAccepted ? "Accept the terms first" : undefined}
        className={authSecondaryClass}
      >
        {googleLoading ? (
          <Spinner className="size-4" aria-hidden />
        ) : (
          <GoogleMark className="size-5" />
        )}
        Continue with Google
      </button>
      {!termsAccepted ? (
        <p className="mt-2 text-center text-[11.5px] text-[#a89ea3]">
          Tick the box above to sign up with Google.
        </p>
      ) : null}

      <p className="mt-5 text-center text-[13px] text-[#8B8489]">
        Already have an account?{" "}
        <Link href={loginHref} className="font-bold text-[#181313] hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
