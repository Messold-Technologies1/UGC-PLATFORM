import SideNavBar from "@/components/admin/SideNavBar";
import TopNavBar from "@/components/admin/TopNavBar";
import React from "react";
import { Manrope, Inter } from "next/font/google";
import { AuthenticatedAppProviders } from "@/providers/app-providers";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-heading" });
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedAppProviders>
      <div
        className={`${manrope.variable} ${inter.variable} bg-background text-foreground font-body selection:bg-primary/30 min-h-screen m-0 p-0`}
      >
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />

        <SideNavBar />

        <main className="ml-64 relative min-h-screen">
          <TopNavBar />
          {children}
        </main>
      </div>
    </AuthenticatedAppProviders>
  );
}
