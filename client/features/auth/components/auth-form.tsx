"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Plus, Mail, Lock } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { useLoginMutation } from "@/features/auth/hooks/use-login-mutation";
import { useRegisterMutation } from "@/features/auth/hooks/use-register-mutation";
import { useForgotPasswordMutation } from "@/features/auth/hooks/use-password-mutations";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import type { LoginRoleConfig } from "@/features/auth/lib/login-role-config";
import {
  LOGIN_ROLES,
  ROLE_CONFIGS,
  setRememberedRole,
  clearRememberedRole,
} from "@/features/auth/lib/login-role-config";
import styles from "./login-page.module.css";


const loginSchema = z.object({
  email: z
    .email({ error: "Enter a valid email address" })
    .min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z
    .email({ error: "Enter a valid email address" })
    .min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;


interface AuthFormProps {
  mode: "login" | "signup";
  roleConfig?: LoginRoleConfig;
}

export function AuthForm({ mode, roleConfig }: AuthFormProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const forgotMutation = useForgotPasswordMutation();
  const [activeTab, setActiveTab] = useState(mode);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "forgot-sent">("login");
  const pendingAuth =
    loginMutation.isPending || registerMutation.isPending || googleLoading;

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
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

  const handleSignup = useCallback(
    (data: SignupData) => {
      registerMutation.mutate(
        {
          name: data.name,
          email: data.email,
          password: data.password,
        },
        {
          onSuccess: async (result) => {
            toast.success("Account created!", {
              description: "Let's get your profile set up.",
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
        },
      );
    },
    [registerMutation, queryClient, searchParams],
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
    const TagIcon = roleConfig.icon;

    return (
      <div className="w-full max-w-[392px]">
        <div className={styles.mobileHead}>
          <Link
            href="/login"
            className="inline-block -ml-2"
            onClick={clearRememberedRole}
          >
            <img
              src="/brand-logo.png"
              alt="GoCollab"
              className="h-16 sm:h-20 w-auto object-contain object-left"
              draggable={false}
            />
          </Link>
          <Link
            href="/login"
            className={styles.mobileHeadBack}
            onClick={clearRememberedRole}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Account types
          </Link>
        </div>

        <span className={styles.formTag}>
          <TagIcon size={13} aria-hidden="true" />
          {view === "login" ? roleConfig.tag : "Reset password"}
        </span>

        {view === "login" && (
          <>
            <h2 className="mt-4 text-[25px] font-extrabold tracking-tight font-heading">
              {roleConfig.formTitle}
            </h2>
            <p className="mt-[7px] text-[13.5px] text-muted-foreground">
              {roleConfig.formSub}
            </p>
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="mt-[26px] flex flex-col gap-[15px]"
              noValidate
            >
              <div className="flex flex-col gap-[7px]">
                <Label
                  htmlFor="login-email"
                  className="text-[12.5px] font-bold"
                >
                  Email
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Mail size={17} aria-hidden="true" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@company.com"
                    disabled={pendingAuth}
                    autoComplete="email"
                    className={cn(
                      "h-[46px] w-full rounded-xl border-[1.5px] border-border bg-white pl-[42px] pr-[14px] text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-150",
                      "placeholder:text-muted-foreground",
                      "focus:border-[var(--login-accent)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--login-accent)_14%,transparent)]",
                      loginForm.formState.errors.email && "border-destructive",
                    )}
                    {...loginForm.register("email")}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs font-semibold text-destructive flex items-center gap-[5px]">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-[7px]">
                <Label
                  htmlFor="login-password"
                  className="text-[12.5px] font-bold"
                >
                  Password
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock size={16} aria-hidden="true" />
                  </span>
                  <input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    disabled={pendingAuth}
                    autoComplete="current-password"
                    className={cn(
                      "h-[46px] w-full rounded-xl border-[1.5px] border-border bg-white pl-[42px] pr-[44px] text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-150",
                      "placeholder:text-muted-foreground",
                      "focus:border-[var(--login-accent)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--login-accent)_14%,transparent)]",
                      loginForm.formState.errors.password && "border-destructive",
                    )}
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex size-[34px] items-center justify-center rounded-[9px] border-0 bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    aria-label={
                      showLoginPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showLoginPassword ? (
                      <EyeOff size={17} aria-hidden="true" />
                    ) : (
                      <Eye size={17} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs font-semibold text-destructive flex items-center gap-[5px]">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 -mt-0.5">
                <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground cursor-pointer select-none">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <span
                    className={cn(
                      "flex size-[18px] items-center justify-center rounded-[6px] border-[1.6px] border-border text-white transition-all",
                      "peer-checked:bg-[var(--login-accent)] peer-checked:border-[var(--login-accent)]",
                    )}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="text-[13px] font-bold text-[var(--login-accent)] no-underline whitespace-nowrap hover:underline hover:underline-offset-[3px] cursor-pointer bg-transparent border-0 p-0"
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={pendingAuth}
                className={styles.submitBtn}
              >
                {loginMutation.isPending ? (
                  <>
                    <span className={styles.spinner} />
                    <span>Logging in…</span>
                  </>
                ) : (
                  <>
                    <span>Log in</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
            <div className={styles.formDivider}>
              <span className={styles.formDividerLine} />
              <span className={styles.formDividerText}>
                {roleConfig.signupLine}
              </span>
              <span className={styles.formDividerLine} />
            </div>
            <Link href={roleConfig.signupHref} className={styles.formSecondary}>
              <Plus size={16} aria-hidden="true" />
              {roleConfig.signupCta}
            </Link>
            <div className={styles.roleSwitch}>
              <span className={styles.roleSwitchLabel}>
                Not a {roleConfig.name.toLowerCase()}?
              </span>
              <span className={styles.roleSwitchLinks}>
                {LOGIN_ROLES.filter((k) => k !== roleConfig.key).map((k) => {
                  const other = ROLE_CONFIGS[k];
                  return (
                    <Link
                      key={k}
                      href={`/login?role=${k}`}
                      replace
                      className={styles.roleSwitchLink}
                      onClick={() => setRememberedRole(k)}
                    >
                      <span>Log in as {other.name}</span>
                      <ArrowRight size={12} aria-hidden="true" />
                    </Link>
                  );
                })}
              </span>
            </div>
            <p className="mt-[22px] text-center text-[11.5px] text-muted-foreground leading-[1.55]">
              By continuing, you agree to our{" "}
              <Link
                href="/terms"
                prefetch={false}
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                prefetch={false}
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </>
        )}

        {view === "forgot" && (
          <>
            <h2 className="mt-4 text-[25px] font-extrabold tracking-tight font-heading">
              Reset your password
            </h2>
            <p className="mt-[7px] text-[13.5px] text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </p>

            <form
              onSubmit={forgotForm.handleSubmit(handleForgotPassword)}
              className="mt-[26px] flex flex-col gap-[15px]"
              noValidate
            >
              <div className="flex flex-col gap-[7px]">
                <Label
                  htmlFor="forgot-email"
                  className="text-[12.5px] font-bold"
                >
                  Email
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Mail size={17} aria-hidden="true" />
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="you@company.com"
                    disabled={forgotMutation.isPending}
                    autoComplete="email"
                    className={cn(
                      "h-[46px] w-full rounded-xl border-[1.5px] border-border bg-white pl-[42px] pr-[14px] text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-150",
                      "placeholder:text-muted-foreground",
                      "focus:border-[var(--login-accent)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--login-accent)_14%,transparent)]",
                      forgotForm.formState.errors.email && "border-destructive",
                    )}
                    {...forgotForm.register("email")}
                  />
                </div>
                {forgotForm.formState.errors.email && (
                  <p className="text-xs font-semibold text-destructive flex items-center gap-[5px]">
                    {forgotForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={forgotMutation.isPending}
                className={styles.submitBtn}
              >
                {forgotMutation.isPending ? (
                  <>
                    <span className={styles.spinner} />
                    <span>Sending…</span>
                  </>
                ) : (
                  <>
                    <span>Send reset link</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setView("login")}
              className="mt-[18px] flex items-center justify-center gap-[6px] w-full text-[13px] font-bold text-[var(--login-accent)] cursor-pointer bg-transparent border-0 p-0 hover:underline hover:underline-offset-[3px]"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to login
            </button>
          </>
        )}

        {view === "forgot-sent" && (
          <>
            <h2 className="mt-4 text-[25px] font-extrabold tracking-tight font-heading">
              Check your email
            </h2>
            <p className="mt-[7px] text-[13.5px] text-muted-foreground">
              If an account exists for that email, we sent reset instructions.
              The link expires in one hour.
            </p>

            <button
              type="button"
              onClick={() => {
                setView("login");
                forgotForm.reset();
              }}
              className={cn(styles.submitBtn, "mt-[26px]")}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              <span>Back to login</span>
            </button>
          </>
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

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as "login" | "signup");
            setShowLoginPassword(false);
            setShowSignupPassword(false);
          }}
          className="mt-8 w-full"
        >
          <TabsList className="w-full grid grid-cols-1 h-11 mb-6">
            <TabsTrigger value="login" className="text-sm">
              Log in
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
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
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            <form
              onSubmit={signupForm.handleSubmit(handleSignup)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="signup-name">Full name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Your full name"
                  disabled={pendingAuth}
                  autoComplete="name"
                  className="h-10"
                  {...signupForm.register("name")}
                />
                {signupForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@company.com"
                  disabled={pendingAuth}
                  autoComplete="email"
                  className="h-10"
                  {...signupForm.register("email")}
                />
                {signupForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <PasswordField
                id="signup-password"
                label="Password"
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={pendingAuth}
                show={showSignupPassword}
                onToggleShow={() => setShowSignupPassword((v) => !v)}
                registration={signupForm.register("password")}
                errorMessage={signupForm.formState.errors.password?.message}
                hint={
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                }
              />

              <Button
                type="submit"
                disabled={pendingAuth}
                className="h-11 w-full bg-foreground text-background hover:bg-foreground/80 cursor-pointer"
                size="lg"
              >
                {registerMutation.isPending ? (
                  <>
                    <Spinner className="size-4" aria-hidden />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            prefetch={false}
            className="underline hover:text-foreground"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
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
