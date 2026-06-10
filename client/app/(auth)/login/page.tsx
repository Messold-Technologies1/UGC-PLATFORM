import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthPage } from "@/features/auth";
import AuthLoading from "@/app/(auth)/loading";

export const metadata: Metadata = { title: "Log In" };

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthPage />
    </Suspense>
  );
}
