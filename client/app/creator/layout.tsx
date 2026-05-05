import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { PostLoginSetupShell } from "@/components/post-login/post-login-setup-shell";
import { AuthenticatedAppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: {
    default: "Creator Dashboard",
    template: "%s — Creator | Collabry",
  },
  description: "Manage your portfolio, campaigns, and earnings.",
};

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedAppProviders>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main
          id="main-content"
          className="flex-1 flex flex-col min-w-0"
        >
          <PostLoginSetupShell role="creator">{children}</PostLoginSetupShell>
        </main>
      </div>
    </AuthenticatedAppProviders>
  );
}
