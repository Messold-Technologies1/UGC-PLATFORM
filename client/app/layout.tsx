import type { Metadata } from "next";
import Script from "next/script";
import { DM_Sans, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { BoneyardBootstrap } from "@/app/bones/bootstrap";
import { ErrorBoundary } from "@/components/error-boundary";
import { AppShellProviders } from "@/providers/app-providers";
import { GlobalVideoManager } from "@/components/global-video-manager";
import { ThemeProvider } from "@/providers/theme-provider";
import { TawkToChat } from "@/components/tawk-to";
import { ClarityInit, ClarityUserSync } from "@/components/clarity";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const themeColorScript = `
try {
  const themeColor = window.localStorage.getItem("ugc-theme-color");
  if (themeColor) {
    document.documentElement.dataset.themeColor = themeColor;
  }
} catch {}
`;

// Meta (Facebook) Pixel base loader. Only injected when NEXT_PUBLIC_META_PIXEL_ID
// is set (see lib/env.ts) — leaving it empty is the kill switch. Initializes the
// pixel and fires PageView; all other events are fired via lib/meta-pixel.ts.
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const metaPixelScript = metaPixelId
  ? `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');
`
  : null;

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
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
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
        className={`${inter.variable} ${dmSans.variable} font-sans antialiased flex min-h-svh flex-col`}
      >
        <Script
          id="ugc-theme-color-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeColorScript }}
        />
        {metaPixelScript ? (
          <>
            <Script
              id="meta-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{ __html: metaPixelScript }}
            />
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                alt=""
                src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        ) : null}
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
            <ClarityUserSync />
            <ErrorBoundary>{children}</ErrorBoundary>
          </AppShellProviders>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        <ClarityInit />
        <Analytics />
        <SpeedInsights />
        <TawkToChat />
      </body>
    </html>
  );
}
