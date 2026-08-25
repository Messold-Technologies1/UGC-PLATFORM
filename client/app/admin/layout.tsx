import { Navbar } from "@/components/navbar/navbar";
import React from "react";
import { AuthenticatedAppProviders } from "@/providers/app-providers";

// Auth-gated workspace: the segment template reads the session cookie and calls
// the auth guard, so these routes are always per-request. Force dynamic so the
// build never prerenders them (which would run the guard with no API reachable).
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedAppProviders>
      <div className="bg-background text-foreground font-sans selection:bg-primary/30 min-h-screen m-0 p-0">
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />

        <Navbar />

        <main className="flex-1 relative min-h-screen">
          {children}
        </main>
      </div>
    </AuthenticatedAppProviders>
  );
}
