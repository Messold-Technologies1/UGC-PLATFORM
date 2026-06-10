import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { DashboardPreview } from "@/features/auth/components/dashboard-preview";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <DashboardPreview />
      <ForgotPasswordForm />
    </div>
  );
}
