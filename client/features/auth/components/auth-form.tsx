"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useCallback, useState } from "react";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";

interface AuthFormProps {
  mode: "login" | "signup";
}

interface FormErrors {
  name: string;
  email: string;
  password: string;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(mode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({ name: "", email: "", password: "" });

  const isLogin = activeTab === "login";

  const validate = useCallback((): boolean => {
    const next: FormErrors = { name: "", email: "", password: "" };
    let valid = true;

    if (!isLogin && !name.trim()) {
      next.name = "Full name is required";
      valid = false;
    }

    if (!email.trim()) {
      next.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      next.email = "Enter a valid email address";
      valid = false;
    }

    if (!password) {
      next.password = "Password is required";
      valid = false;
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters";
      valid = false;
    }

    setErrors(next);
    return valid;
  }, [isLogin, name, email, password]);

  const handleSubmit = useCallback(
    async (e: SubmitEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsLoading(true);

      try {
        if (isLogin) {
          const res = await api.post("/api/auth/login/normal", { email, password });

          if (res.data.success) {
            toast.success("Login successful!", { description: "Redirecting to your dashboard." });
            router.push("/brand/dashboard");
          }
        } else {
          const res = await api.post("/api/auth/signup", {
            username: name,
            email,
            password,
          });

          if (res.data.success) {
            toast.success("Account created!", { description: "Please log in with your new account." });
            setActiveTab("login");
            setName("");
            setEmail("");
            setPassword("");
          }
        }
      } catch (error) {
        if (isAxiosError(error) && error.response) {
          toast.error(error.response.data.message || "An error occurred");
        } else {
          toast.error("An unexpected error occurred");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [validate, isLogin, email, password, name, router],
  );

  const handleGoogleLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/auth/google?context=userLogin");
      window.location.href = res.data.authUrl;
    } catch {
      toast.error("Failed to connect to Google");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-6 py-12 lg:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to {SITE_NAME}
        </h1>
        <p className="mt-2 text-muted-foreground">{SITE_DESCRIPTION}</p>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "login" | "signup")}
          className="mt-8 w-full"
        >
          <TabsList className="w-full grid grid-cols-2 h-11 mb-6">
            <TabsTrigger value="login" className="text-sm">
              Log in
            </TabsTrigger>
            <TabsTrigger value="signup" className="text-sm">
              Sign up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-10"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-10"
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full bg-black text-white hover:bg-gray-600 cursor-pointer"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Logging in…
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
            </form>

            <Divider />

            <div className="space-y-3">
              <Button
                variant="outline"
                className="h-11 w-full"
                size="lg"
                disabled={isLoading}
                onClick={handleGoogleLogin}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name">Full name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                  className="h-10"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-10"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full bg-black text-white hover:bg-gray-600 cursor-pointer"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <Divider />

            <div className="space-y-3">
              <Button
                variant="outline"
                className="h-11 w-full"
                size="lg"
                disabled={isLoading}
                onClick={handleGoogleLogin}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </div>
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
