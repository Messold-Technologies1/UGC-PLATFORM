import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordPageClient } from "@/features/auth/components/reset-password-page-client";
import { DashboardPreview } from "@/features/auth/components/dashboard-preview";
import AuthLoading from "@/app/(auth)/loading";

export const metadata: Metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <DashboardPreview />
      <Suspense fallback={<AuthLoading />}>
        <ResetPasswordPageClient />
      </Suspense>
    </div>
  );
}
