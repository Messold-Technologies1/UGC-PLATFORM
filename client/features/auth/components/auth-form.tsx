"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
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
import { ENDPOINTS } from "@/lib/endpoints";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";

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
}

export function AuthForm({ mode }: AuthFormProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const [activeTab, setActiveTab] = useState(mode);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
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

  const handleLogin = useCallback(
    (data: LoginData) => {
      loginMutation.mutate(data, {
        onSuccess: async (result) => {
          if (!result.user) return;
          toast.success("Login successful!", {
            description: "Choose how you want to continue.",
          });
          queryClient.setQueryData(authMeQueryKey, result.user);
          const callback = searchParams.get("callbackUrl");
          const target = resolveImmediatePostAuthPath(result.user, callback);
          beginClientNavigation();
          // Use a hard navigation so the next request definitely includes the
          // freshly-set HttpOnly cookies, while replacing /login in history.
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
              description: "Choose how you want to continue.",
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

  // const handleGoogleLogin = useCallback(() => {
  //   setGoogleLoading(true);
  //   window.location.replace(resolveApiUrl(ENDPOINTS.AUTH.GOOGLE));
  // }, []);

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
            {/* <TabsTrigger value="signup" className="text-sm">
              Sign up
            </TabsTrigger> */}
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

            {/* <Divider />

            <div className="space-y-3">
              <Button
                variant="outline"
                className="h-11 w-full"
                size="lg"
                disabled={pendingAuth}
                onClick={handleGoogleLogin}
              >
                {googleLoading ? (
                  <Spinner className="size-4" aria-hidden />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>
            </div> */}
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

            {/* <Divider />

            <div className="space-y-3">
              <Button
                variant="outline"
                className="h-11 w-full"
                size="lg"
                disabled={pendingAuth}
                onClick={handleGoogleLogin}
              >
                {googleLoading ? (
                  <Spinner className="size-4" aria-hidden />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>
            </div> */}
          </TabsContent>
        </Tabs>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
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
          <TooltipContent>{show ? "Hide password" : "Show password"}</TooltipContent>
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

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
