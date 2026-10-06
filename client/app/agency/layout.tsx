import type { Metadata } from "next";
import { Navbar } from "@/components/navbar/navbar";
import { OnboardingRuntime } from "@/components/onboarding/onboarding-runtime";
import { PostLoginSetupShell } from "@/components/post-login/post-login-setup-shell";
import { AuthenticatedAppProviders } from "@/providers/app-providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Agency Workspace",
    template: "%s - Agency | Collabry",
  },
  description: "Browse creators and manage client workspaces as an agency.",
};

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedAppProviders>
      <OnboardingRuntime scope="brand">
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <Navbar />
          <main id="main-content" className="flex-1 flex flex-col min-w-0">
            <PostLoginSetupShell role="agency">{children}</PostLoginSetupShell>
          </main>
        </div>
      </OnboardingRuntime>
    </AuthenticatedAppProviders>
  );
}
