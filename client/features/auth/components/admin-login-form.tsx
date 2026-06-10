"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { useLoginMutation } from "@/features/auth/hooks/use-login-mutation";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { cn } from "@/lib/utils";

const adminLoginSchema = z.object({
  email: z
    .email({ error: "Enter a valid email address" })
    .min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type AdminLoginData = z.infer<typeof adminLoginSchema>;

interface AdminLoginFormProps {
  onClose: () => void;
}

export default function AdminLoginForm({ onClose }: AdminLoginFormProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const pendingAuth = loginMutation.isPending;

  const form = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 z-[9999]",
        "flex items-center justify-center",
        "bg-black/60 backdrop-blur-sm",
        "animate-in fade-in duration-200",
        "p-4 sm:p-6",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Admin login"
    >
      <div
        className={cn(
          "relative w-full max-w-[400px]",
          "rounded-2xl",
          "bg-white text-foreground",
          "shadow-2xl",
          "border border-border",
          "animate-in zoom-in-95 slide-in-from-bottom-4 duration-300",
          "overflow-y-auto max-h-[calc(100dvh-2rem)]",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute right-3 top-4 z-10",
            "flex size-8 items-center justify-center rounded-lg",
            "text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Close admin login"
        >
          <X size={18} />
        </button>

        <div className="px-6 pt-6 pb-7 sm:px-8 sm:pt-7 sm:pb-8">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-[14px]",
                "bg-foreground",
                "shadow-lg shadow-foreground/15",
              )}
            >
              <ShieldCheck size={22} className="text-white" />
            </span>
            <div>
              <h2 className="text-[16px] font-extrabold tracking-tight font-heading text-foreground">
                Admin Access
              </h2>
              <p className="text-[12px] font-medium text-muted-foreground">
                Restricted — authorised personnel only
              </p>
            </div>
          </div>

          <div className="my-5 h-px bg-border" />

          <form
            onSubmit={form.handleSubmit(handleLogin)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-email"
                className="text-[12px] font-bold text-muted-foreground"
              >
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                  <Mail size={16} />
                </span>
                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@gocollab.io"
                  disabled={pendingAuth}
                  autoComplete="email"
                  className={cn(
                    "h-[46px] w-full rounded-xl border-[1.5px] border-border bg-background",
                    "pl-10 pr-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/50",
                    "outline-none transition-all duration-150",
                    "focus:border-[#a855f7] focus:shadow-[0_0_0_4px_rgba(168,85,247,0.12)]",
                    form.formState.errors.email && "border-destructive",
                  )}
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-[12px] font-semibold text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-password"
                className="text-[12px] font-bold text-muted-foreground"
              >
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                  <Lock size={16} />
                </span>
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  disabled={pendingAuth}
                  autoComplete="current-password"
                  className={cn(
                    "h-[46px] w-full rounded-xl border-[1.5px] border-border bg-background",
                    "pl-10 pr-11 text-[14px] text-foreground placeholder:text-muted-foreground/50",
                    "outline-none transition-all duration-150",
                    "focus:border-[#a855f7] focus:shadow-[0_0_0_4px_rgba(168,85,247,0.12)]",
                    form.formState.errors.password && "border-destructive",
                  )}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className={cn(
                    "absolute right-1.5 top-1/2 -translate-y-1/2",
                    "flex size-[34px] items-center justify-center rounded-[9px]",
                    "text-muted-foreground transition-colors",
                    "hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-[12px] font-semibold text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={pendingAuth}
              className={cn(
                "mt-1 flex h-[48px] w-full items-center justify-center gap-2",
                "rounded-xl font-extrabold text-[14.5px]",
                "bg-foreground text-background",
                "shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)]",
                "transition-all duration-150",
                "hover:bg-foreground/80",
                "active:translate-y-px",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "cursor-pointer",
              )}
            >
              {pendingAuth ? (
                <>
                  <span className="size-[17px] animate-spin rounded-full border-[2.4px] border-white/40 border-t-white" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Authenticate</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-muted-foreground leading-relaxed">
            Press{" "}
            <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
              Esc
            </kbd>{" "}
            to dismiss
          </p>
        </div>
      </div>
    </div>
  );
}
