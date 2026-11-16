import { Suspense } from "react";
import type { Metadata } from "next";
import AuthLoading from "@/app/(auth)/loading";
import { UnifiedAuthShell } from "@/features/auth/components/unified-auth-shell";
import { UnifiedLoginForm } from "@/features/auth/components/unified-login-form";

/**
 * A link to any page behind auth redirects here, so this is the page Slack
 * and friends actually unfurl — not the wishlist or order that was shared.
 * Without a description of its own it inherits the root one and pitches the
 * marketplace at colleagues who already work here.
 */
export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to Go Collab to view this page.",
};

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
        subtitle="Just your email and password — we’ll take you straight to your creator, brand, or agency workspace."
      >
        <UnifiedLoginForm />
      </UnifiedAuthShell>
    </Suspense>
  );
}
