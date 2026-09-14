import { Suspense } from "react";
import type { Metadata } from "next";
import AuthLoading from "@/app/(auth)/loading";
import { UnifiedAuthShell } from "@/features/auth/components/unified-auth-shell";
import { UnifiedLoginForm } from "@/features/auth/components/unified-login-form";

export const metadata: Metadata = { title: "Log In" };

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <UnifiedAuthShell
        eyebrow="Welcome back"
        title={
          <>
            Pick up right
            <br />
            where you
            <br />
            left off.
          </>
        }
        subtitle="Just your email and password — we’ll take you straight to your creator or brand workspace."
        altPrompt={{
          label: "New here?",
          cta: "Create an account",
          href: "/register",
        }}
      >
        <UnifiedLoginForm />
      </UnifiedAuthShell>
    </Suspense>
  );
}
