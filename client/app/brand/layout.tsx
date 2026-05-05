import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { PostLoginSetupShell } from "@/components/post-login/post-login-setup-shell";
import { AuthenticatedAppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: {
    default: "Brand Dashboard",
    template: "%s — Brand | Collabry",
  },
  description: "Manage your campaigns, browse creators, and track performance.",
};

export default function BrandLayout({
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
          <PostLoginSetupShell role="brand">{children}</PostLoginSetupShell>
        </main>
      </div>
    </AuthenticatedAppProviders>
  );
}
