import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar/navbar";
import { NavbarFallback } from "@/components/navbar/navbar-fallback";
import { AuthProvider } from "@/providers/auth-provider";
import AuthLoading from "@/app/(auth)/loading";
import { UnifiedAuthShell } from "@/features/auth/components/unified-auth-shell";
import { UnifiedSignupForm } from "@/features/auth/components/unified-signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  // The unified /register page carries the site navbar itself.
  // Brand setup after role choice lives at /onboarding/brand.
  return (
    <AuthProvider>
      <div className="relative min-h-dvh">
        <div className="absolute inset-x-0 top-0 z-50 pt-4">
          <Suspense fallback={<NavbarFallback />}>
            <Navbar className="mb-0" />
          </Suspense>
        </div>
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
      </div>
    </AuthProvider>
  );
}
