"use client";

import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
  Settings,
  Users,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { useLoginMutation } from "@/features/auth/hooks/use-login-mutation";
import { useForgotPasswordMutation } from "@/features/auth/hooks/use-password-mutations";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { cn } from "@/lib/utils";
import styles from "./login-page.module.css";

const adminLoginSchema = z.object({
  email: z
    .email({ error: "Enter a valid email address" })
    .min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type AdminLoginData = z.infer<typeof adminLoginSchema>;

const ADMIN_THEME = {
  accent: "#1e2632",
  accent2: "#4a5568",
  tint: "#f1f5f9",
  heroGrad:
    "linear-gradient(165deg, #f1f5f9 0%, #e8edf2 55%, #dce3eb 100%)",
  blob: "rgba(30,38,50,.18)",
  dot: "rgba(60,70,90,.14)",
  highlight: "transparent",
} as const;

function AdminLoginHero() {
  return (
    <div className={`${styles.hero} hidden lg:flex`}>
      <div
        className={`${styles.blob} ${styles.blobTop}`}
        aria-hidden="true"
      />
      <div
        className={`${styles.blob} ${styles.blobBottom}`}
        aria-hidden="true"
      />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.heroTop}>
        <img
          src="/brand-logo.png"
          alt="GoCollab"
          className="h-24 md:h-32 w-auto object-contain object-left -ml-4"
          draggable={false}
        />
      </div>

      <div className={styles.heroMid}>
        <span className={styles.heroEyebrow}>
          <ShieldCheck size={13} aria-hidden="true" />
          Admin Portal
        </span>

        <h1 className={`${styles.heroH1} font-heading`}>
          Manage your
          <br />
          <span className={styles.heroHighlight}>entire platform.</span>
        </h1>

        <p className={styles.heroSub}>
          Approve creators, manage brands, oversee orders, and keep everything
          running smoothly from one centralised dashboard.
        </p>

        <ul className={styles.heroBullets}>
          <li className={styles.heroBulletItem}>
            <span className={styles.heroBulletIcon}>
              <Users size={18} aria-hidden="true" />
            </span>
            <span>
              <span className={styles.heroBulletTitle}>
                Creator & brand approvals
              </span>
              <span className={styles.heroBulletDesc}>
                Review, approve, or reject in one click.
              </span>
            </span>
          </li>
          <li className={styles.heroBulletItem}>
            <span className={styles.heroBulletIcon}>
              <BarChart3 size={18} aria-hidden="true" />
            </span>
            <span>
              <span className={styles.heroBulletTitle}>
                Order & revenue oversight
              </span>
              <span className={styles.heroBulletDesc}>
                Track every order, payout, and dispute.
              </span>
            </span>
          </li>
          <li className={styles.heroBulletItem}>
            <span className={styles.heroBulletIcon}>
              <Settings size={18} aria-hidden="true" />
            </span>
            <span>
              <span className={styles.heroBulletTitle}>
                Platform settings
              </span>
              <span className={styles.heroBulletDesc}>
                Configure fees, policies, and system-wide controls.
              </span>
            </span>
          </li>
        </ul>
      </div>

      <div className={styles.heroBottom}>
        <div className={styles.heroStat}>
          <span className={`${styles.heroStatBig} font-heading`}>
            Full control
          </span>
          <span className={styles.heroStatLabel}>
            over the GoCollab platform
          </span>
        </div>
      </div>
    </div>
  );
}

function AdminLoginFormInner() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();
  const forgotMutation = useForgotPasswordMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "forgot-sent">("login");
  const pendingAuth = loginMutation.isPending;

  const loginForm = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
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

  const handleLogin = useCallback(
    (data: AdminLoginData) => {
      loginMutation.mutate(
        {
          ...data,
          role: "ADMIN",
        },
        {
          onSuccess: async (result) => {
            if (!result.user) return;
            toast.success("Welcome, admin.", {
              description: "Redirecting to the admin dashboard.",
            });
            queryClient.setQueryData(authMeQueryKey, result.user);
            const callback = searchParams.get("callbackUrl");
            const target = resolveImmediatePostAuthPath(result.user, callback);
            beginClientNavigation();
            window.location.replace(target);
          },
          onError: (error) => {
            if (isAxiosError(error) && error.response) {
              toast.error(
                error.response.data.message || "Authentication failed",
              );
            } else {
              toast.error("An unexpected error occurred");
            }
          },
        },
      );
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

  return (
    <div className="w-full max-w-[392px]">
      <div className={styles.mobileHead}>
        <img
          src="/brand-logo.png"
          alt="GoCollab"
          className="h-16 sm:h-20 w-auto object-contain object-left -ml-2"
          draggable={false}
        />
      </div>

      <span className={styles.formTag}>
        <ShieldCheck size={13} aria-hidden="true" />
        {view === "login" ? "Admin login" : "Reset password"}
      </span>

      {view === "login" && (
        <>
          <h2 className="mt-4 text-[25px] font-extrabold tracking-tight font-heading">
            Log in to the admin dashboard
          </h2>
          <p className="mt-[7px] text-[13.5px] text-muted-foreground">
            Restricted access. Authorised personnel only.
          </p>

          <form
            onSubmit={loginForm.handleSubmit(handleLogin)}
            className="mt-[26px] flex flex-col gap-[15px]"
            noValidate
          >
            <div className="flex flex-col gap-[7px]">
              <Label
                htmlFor="admin-email"
                className="text-[12.5px] font-bold"
              >
                Email
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail size={17} aria-hidden="true" />
                </span>
                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@gocollab.io"
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
                htmlFor="admin-password"
                className="text-[12.5px] font-bold"
              >
                Password
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock size={16} aria-hidden="true" />
                </span>
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
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
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
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

            <div className="flex items-center justify-end gap-3 -mt-0.5">
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

          <p className="mt-[22px] text-center text-[11.5px] text-muted-foreground leading-[1.55]">
            By continuing, you agree to our{" "}
            <Link
              href="/legal/terms"
              prefetch={false}
              className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/privacy"
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
                  placeholder="admin@gocollab.io"
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
            If an account exists for that email, we sent reset instructions. The
            link expires in one hour.
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

export default function AdminLoginForm() {
  return (
    <div
      className={styles.authpage}
      style={
        {
          "--login-accent": ADMIN_THEME.accent,
          "--login-accent2": ADMIN_THEME.accent2,
          "--login-tint": ADMIN_THEME.tint,
          "--login-hero-grad": ADMIN_THEME.heroGrad,
          "--login-blob": ADMIN_THEME.blob,
          "--login-dot": ADMIN_THEME.dot,
          "--login-highlight": ADMIN_THEME.highlight,
        } as React.CSSProperties
      }
    >
      <div className={styles.authGrid}>
        <AdminLoginHero />
        <div className={styles.formWrap}>
          <Suspense fallback={null}>
            <AdminLoginFormInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
