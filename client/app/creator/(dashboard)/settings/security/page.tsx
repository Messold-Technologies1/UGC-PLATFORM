import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const metadata: Metadata = { title: "Security" };

export default function CreatorSecuritySettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Security"
        description="Update your password and manage account security."
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password you don&apos;t use elsewhere.
        </p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href="/creator/settings" className="underline hover:text-foreground">
          Back to settings
        </Link>
      </p>
    </div>
  );
}
