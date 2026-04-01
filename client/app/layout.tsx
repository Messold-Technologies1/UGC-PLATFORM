import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Collabry — Where Creators Meet Brands",
    template: "%s | Collabry",
  },
  description:
    "The marketplace for authentic user-generated content. Connect with vetted creators, collaborate, and create content that drives real results.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://collabry.com"),
  openGraph: {
    type: "website",
    siteName: "Collabry",
    title: "Collabry — Where Creators Meet Brands",
    description:
      "The marketplace for authentic user-generated content. Connect with vetted creators, collaborate, and create content that drives real results.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Collabry — Where Creators Meet Brands",
    description:
      "The marketplace for authentic user-generated content. Connect with vetted creators, collaborate, and create content that drives real results.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} antialiased flex min-h-svh flex-col`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-100 focus:left-4 focus:top-4 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
