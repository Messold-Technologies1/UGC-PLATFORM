import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthPage } from "@/features/auth";
import AuthLoading from "@/app/(auth)/loading";

export const metadata: Metadata = { title: "Sign Up" };

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthPage mode="signup" />
    </Suspense>
  );
}
