"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { cn } from "@/lib/utils";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { useLoginMutation } from "@/features/auth/hooks/use-login-mutation";
import { useForgotPasswordMutation } from "@/features/auth/hooks/use-password-mutations";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import type { LoginRoleConfig } from "@/features/auth/lib/login-role-config";
import {
  LOGIN_ROLES,
  ROLE_CONFIGS,
  setRememberedRole,
} from "@/features/auth/lib/login-role-config";
import { GoogleMark } from "./google-mark";
import { startGoogleOAuth } from "@/features/auth/lib/start-google-oauth";

const loginLabel = "text-[13px] font-semibold text-[#181313]";

const loginInput =
  "h-[46px] w-full rounded-xl border border-[#E8E4E6] bg-white px-3.5 text-sm text-[#181313] shadow-none outline-none placeholder:text-[#B0AAAE] focus:border-[#D4CED2]";

const loginSubmit =
  "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-(--login-accent) text-[14.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-70";

const loginSecondary =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#E8E4E6] bg-white text-[14.5px] font-semibold text-[#181313] no-underline transition-colors hover:border-[#DDD8DA] hover:bg-[#FAFAFA]";

const loginSchema = z.object({
  email: z
    .email({ error: "Enter a valid email address" })
    .min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginData = z.infer<typeof loginSchema>;

function LoginDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-7 flex items-center gap-3">
      <span className="h-px flex-1 bg-[#EDE8EA]" />
      <span className="text-[13px] font-medium whitespace-nowrap text-[#8B8489]">
        {children}
      </span>
      <span className="h-px flex-1 bg-[#EDE8EA]" />
    </div>
  );
}


interface AuthFormProps {
  roleConfig?: LoginRoleConfig;
}

export function AuthForm({ roleConfig }: AuthFormProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();
  const forgotMutation = useForgotPasswordMutation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "forgot-sent">("login");
  const pendingAuth = loginMutation.isPending || googleLoading;

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const forgotForm = useForm<{ email: string }>({
    resolver: zodResolver(
      z.object({
        email: z
          .email({ error: "Enter a valid email address" })
          .min(1, "Email is required"),
      }),
    ),
    defaultValues: { email: "" },
  });
  useEffect(() => {
    if (roleConfig) {
      document.title = `GoCollab — ${roleConfig.name} log in`;
    }
    return () => {
      document.title = "GoCollab";
    };
  }, [roleConfig]);

  const handleLogin = useCallback(
    (data: LoginData) => {
      if (!roleConfig) {
        toast.error("Please select a login role (e.g., Brand, Creator) before logging in.");
        return;
      }
      
      loginMutation.mutate(
        {
          ...data,
          role: roleConfig.key.toUpperCase(),
        },
        {
        onSuccess: async (result) => {
          if (!result.user) return;
          toast.success("Welcome back!", {
            description: "Taking you to your dashboard.",
          });
          queryClient.setQueryData(authMeQueryKey, result.user);
          const callback = searchParams.get("callbackUrl");
          const target = resolveImmediatePostAuthPath(result.user, callback);
          beginClientNavigation();
          window.location.replace(target);
        },
        onError: (error) => {
          if (isAxiosError(error) && error.response) {
            toast.error(error.response.data.message || "An error occurred");
          } else {
            toast.error("An unexpected error occurred");
          }
        },
      });
    },
    [loginMutation, queryClient, searchParams],
  );

  const handleForgotPassword = useCallback(
    (data: { email: string }) => {
      forgotMutation.mutate(data.email, {
        onSuccess: () => {
          setView("forgot-sent");
          toast.success("Check your email", {
            description:
              "If an account exists for that address, we sent reset instructions.",
          });
        },
        onError: (error) => {
          if (isAxiosError(error) && error.response) {
            toast.error(error.response.data.message || "An error occurred");
          } else {
            toast.error("An unexpected error occurred");
          }
        },
      });
    },
    [forgotMutation],
  );

  if (roleConfig) {
    const callbackUrl = searchParams.get("callbackUrl");
    const callbackQuery = callbackUrl
      ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "";
    const callbackAmp = callbackUrl
      ? `&callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "";

    return (
      <div className="w-full max-w-100">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-(--login-accent) uppercase">
            <span
              className="size-1.5 shrink-0 rounded-full bg-(--login-accent)"
              aria-hidden="true"
            />
            {view === "login" ? roleConfig.tag : "Reset password"}
          </span>

          {view === "login" && (
            <>
              <h2 className="font-heading mt-3.5 text-[28px] font-bold tracking-[-0.03em] text-[#181313]">
                {roleConfig.formTitle}
              </h2>
              <p className="mt-1.5 text-[14.5px] leading-snug text-[#8B8489]">
                {roleConfig.formSub}
              </p>
            </>
          )}

          {view === "forgot" && (
            <>
              <h2 className="font-heading mt-3.5 text-[28px] font-bold tracking-[-0.03em] text-[#181313]">
                Reset your password
              </h2>
              <p className="mt-1.5 text-[14.5px] leading-snug text-[#8B8489]">
                Enter your email and we&apos;ll send you a link to reset your
                password.
              </p>
            </>
          )}

          {view === "forgot-sent" && (
            <>
              <h2 className="font-heading mt-3.5 text-[28px] font-bold tracking-[-0.03em] text-[#181313]">
                Check your email
              </h2>
              <p className="mt-1.5 text-[14.5px] leading-snug text-[#8B8489]">
                If an account exists for that email, we sent reset instructions.
                The link expires in one hour.
              </p>
            </>
          )}
        </div>

        {view === "login" && (
          <>
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="mt-7 flex flex-col gap-4"
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-email" className={loginLabel}>
                  Email
                </Label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  disabled={pendingAuth}
                  autoComplete="email"
                  aria-invalid={
                    loginForm.formState.errors.email ? true : undefined
                  }
                  className={cn(
                    loginInput,
                    loginForm.formState.errors.email && "border-[#DB4A4A]",
                  )}
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-destructive text-xs font-semibold">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="login-password" className={loginLabel}>
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium whitespace-nowrap text-(--login-accent) no-underline hover:underline hover:underline-offset-[3px]"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Your password"
                    disabled={pendingAuth}
                    autoComplete="current-password"
                    aria-invalid={
                      loginForm.formState.errors.password ? true : undefined
                    }
                    className={cn(
                      loginInput,
                      "pr-14",
                      loginForm.formState.errors.password && "border-[#DB4A4A]",
                    )}
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-[#8B8489] hover:text-[#181313]"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    aria-label={
                      showLoginPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showLoginPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-destructive text-xs font-semibold">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={pendingAuth}
                className={cn(loginSubmit, "mt-2")}
              >
                {loginMutation.isPending ? (
                  <>
                    <Spinner className="size-4" aria-hidden />
                    <span>Logging in…</span>
                  </>
                ) : (
                  roleConfig.submitLabel
                )}
              </button>
            </form>
            {roleConfig.key === "brand" ? (
              <>
                <LoginDivider>or</LoginDivider>
                <button
                  type="button"
                  disabled={pendingAuth}
                  className={loginSecondary}
                  onClick={() => {
                    setGoogleLoading(true);
                    startGoogleOAuth({
                      role: "BRAND",
                      callbackUrl: searchParams.get("callbackUrl"),
                    });
                  }}
                >
                  {googleLoading ? (
                    <Spinner className="size-4" aria-hidden />
                  ) : (
                    <GoogleMark className="size-5" />
                  )}
                  Continue with Google
                </button>
              </>
            ) : null}
            <LoginDivider>{roleConfig.signupLine}</LoginDivider>
            <Link
              href={`${roleConfig.signupHref}${callbackQuery}`}
              className={loginSecondary}
            >
              {roleConfig.signupCta} →
            </Link>
            <div className="mt-6 text-left">
              <span className="text-[13.5px] text-[#8B8489]">
                Not a {roleConfig.name.toLowerCase()}?
              </span>
              {LOGIN_ROLES.filter(
                (k) => k !== roleConfig.key && k !== "agency",
              ).map((k) => {
                const other = ROLE_CONFIGS[k];
                return (
                  <Link
                    key={k}
                    href={`/login?role=${k}${callbackAmp}`}
                    replace
                    className="ml-1.5 inline text-[13.5px] font-bold text-[#181313] no-underline hover:underline hover:underline-offset-[3px]"
                    onClick={() => setRememberedRole(k)}
                  >
                    Log in as {other.name}
                  </Link>
                );
              })}
            </div>
            <p className="mt-8 text-[12px] leading-relaxed text-[#8B8489]">
              By continuing you agree to our{" "}
              <Link
                href="/legal/terms"
                prefetch={false}
                className="text-(--login-accent) no-underline hover:underline hover:underline-offset-2"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                prefetch={false}
                className="text-(--login-accent) no-underline hover:underline hover:underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </>
        )}

        {view === "forgot" && (
          <>
            <form
              onSubmit={forgotForm.handleSubmit(handleForgotPassword)}
              className="mt-7 flex flex-col gap-4"
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="forgot-email" className={loginLabel}>
                  Email
                </Label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  disabled={forgotMutation.isPending}
                  autoComplete="email"
                  aria-invalid={
                    forgotForm.formState.errors.email ? true : undefined
                  }
                  className={cn(
                    loginInput,
                    forgotForm.formState.errors.email && "border-[#DB4A4A]",
                  )}
                  {...forgotForm.register("email")}
                />
                {forgotForm.formState.errors.email && (
                  <p className="text-destructive text-xs font-semibold">
                    {forgotForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={forgotMutation.isPending}
                className={cn(loginSubmit, "mt-2")}
              >
                {forgotMutation.isPending ? (
                  <>
                    <Spinner className="size-4" aria-hidden />
                    <span>Sending…</span>
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setView("login")}
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-1.5 border-0 bg-transparent p-0 text-[13px] font-bold text-(--login-accent) hover:underline hover:underline-offset-[3px]"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to login
            </button>
          </>
        )}

        {view === "forgot-sent" && (
          <button
            type="button"
            onClick={() => {
              setView("login");
              forgotForm.reset();
            }}
            className={cn(loginSubmit, "mt-7")}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            <span>Back to login</span>
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-6 py-12 lg:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to {SITE_NAME}
        </h1>
        <p className="mt-2 text-muted-foreground">{SITE_DESCRIPTION}</p>

        <div className="mt-8 w-full">
          <form
            onSubmit={loginForm.handleSubmit(handleLogin)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@company.com"
                disabled={pendingAuth}
                autoComplete="email"
                className="h-10"
                {...loginForm.register("email")}
              />
              {loginForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <PasswordField
              id="login-password"
              label="Password"
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={pendingAuth}
              show={showLoginPassword}
              onToggleShow={() => setShowLoginPassword((v) => !v)}
              registration={loginForm.register("password")}
              errorMessage={loginForm.formState.errors.password?.message}
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                prefetch={false}
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={pendingAuth}
              className="h-11 w-full bg-foreground text-background hover:bg-foreground/80 cursor-pointer"
              size="lg"
            >
              {loginMutation.isPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Logging in…
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link
            href="/legal/terms"
            prefetch={false}
            className="underline hover:text-foreground"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/privacy"
            prefetch={false}
            className="underline hover:text-foreground"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  disabled: boolean;
  show: boolean;
  onToggleShow: () => void;
  registration: UseFormRegisterReturn;
  errorMessage?: string;
  hint?: ReactNode;
};

function PasswordField({
  id,
  label,
  placeholder,
  autoComplete,
  disabled,
  show,
  onToggleShow,
  registration,
  errorMessage,
  hint,
}: PasswordFieldProps) {
  const describedByIds = [
    hint ? `${id}-hint` : null,
    errorMessage ? `${id}-error` : null,
  ].filter(Boolean);
  const describedBy =
    describedByIds.length > 0 ? describedByIds.join(" ") : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className="h-10 pr-10"
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={describedBy}
          {...registration}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleShow}
              className={cn(
                "absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md",
                "text-muted-foreground outline-none transition-colors",
                "hover:text-foreground",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              aria-label={show ? "Hide password" : "Show password"}
              aria-controls={id}
              aria-pressed={show}
            >
              {show ? (
                <EyeOff className="size-4 shrink-0" aria-hidden />
              ) : (
                <Eye className="size-4 shrink-0" aria-hidden />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {show ? "Hide password" : "Show password"}
          </TooltipContent>
        </Tooltip>
      </div>
      {hint ? <div id={`${id}-hint`}>{hint}</div> : null}
      {errorMessage ? (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}