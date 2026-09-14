import { Suspense } from "react";
import type { Metadata } from "next";
import AuthLoading from "@/app/(auth)/loading";
import { UnifiedAuthShell } from "@/features/auth/components/unified-auth-shell";
import { UnifiedSignupForm } from "@/features/auth/components/unified-signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <UnifiedAuthShell
        eyebrow="One account · two worlds"
        title={
          <>
            Where creators
            <br />
            and brands
            <br />
            find each other.
          </>
        }
        subtitle="Sign up once. Pick whether you’re a creator or a brand right after — your workspace is built around it."
      >
        <UnifiedSignupForm />
      </UnifiedAuthShell>
    </Suspense>
  );
}
