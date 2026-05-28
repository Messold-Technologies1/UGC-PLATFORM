import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { BoneyardBootstrap } from "@/app/bones/bootstrap";
import { ErrorBoundary } from "@/components/error-boundary";
import { AppShellProviders } from "@/providers/app-providers";
import { GlobalVideoManager } from "@/components/global-video-manager";
import { ThemeProvider } from "@/providers/theme-provider";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css";

const themeColorScript = `
try {
  const themeColor = window.localStorage.getItem("ugc-theme-color");
  if (themeColor) {
    document.documentElement.dataset.themeColor = themeColor;
  }
} catch {}
`;

const dmSans = DM_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Go Collab — Where Creators Meet Brands",
    template: "%s | Go Collab",
  },
  description:
    "The marketplace for authentic user-generated content. Connect with vetted creators, collaborate, and create content that drives real results.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://gocollab.io",
  ),
  openGraph: {
    type: "website",
    siteName: "Go Collab",
    title: "Go Collab — Where Creators Meet Brands",
    description:
      "The marketplace for authentic user-generated content. Connect with vetted creators, collaborate, and create content that drives real results.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Go Collab — Where Creators Meet Brands",
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
      <Analytics />
      <SpeedInsights />
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeColorScript }} />
      </head>
      <body
        className={`${inter.variable} ${dmSans.variable} font-sans antialiased flex min-h-svh flex-col`}
      >
        <GlobalVideoManager />
        <BoneyardBootstrap />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-100 focus:left-4 focus:top-4 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AppShellProviders>
            <ErrorBoundary>{children}</ErrorBoundary>
          </AppShellProviders>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
