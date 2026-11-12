import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { BoneyardBootstrap } from "@/app/bones/bootstrap";
import { ErrorBoundary } from "@/components/error-boundary";
import { AppShellProviders } from "@/providers/app-providers";
import { GlobalVideoManager } from "@/components/global-video-manager";
import { ThemeProvider } from "@/providers/theme-provider";
import { ClarityInit, ClarityUserSync } from "@/components/clarity";
import { SITE_URL } from "@/config/site";
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

// Meta (Facebook) Pixel base loader. The platform runs two datasets — the
// creator pixel (NEXT_PUBLIC_META_PIXEL_ID) and the brand pixel
// (NEXT_PUBLIC_META_BRAND_PIXEL_ID) — so both are initialized here and both
// receive PageView. Clearing an ID is the kill switch for that dataset;
// clearing both means the loader is never injected at all. Signup events are
// routed to a single dataset via lib/meta-pixel.ts.
const metaPixelIds = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim(),
      process.env.NEXT_PUBLIC_META_BRAND_PIXEL_ID?.trim(),
    ].filter((id): id is string => Boolean(id)),
  ),
);
const metaPixelScript = metaPixelIds.length
  ? `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
${metaPixelIds.map((id) => `fbq('init', '${id}');`).join("\n")}
fbq('track', 'PageView');
`
  : null;

// Self-hosted (via next/font/local) instead of next/font/google so the
// production build never has to reach fonts.googleapis.com — the Turbopack
// build fails to resolve Google fonts when that network call is blocked.
// Satoshi (Fontshare) for UI copy and headings on every page.
const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});

// Figtree (SIL OFL) is the typeface the creator public-page templates are
// designed in. Declared here so the variable exists app-wide, but applied only
// by those templates via `font-figtree` — the rest of the app stays on Satoshi.
const figtree = localFont({
  src: "./fonts/Figtree-latin.woff2",
  variable: "--font-figtree-face",
  weight: "300 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Go Collab — Where Creators Meet Brands",
    template: "%s | Go Collab",
  },
  description:
    "The marketplace for authentic user-generated content. Connect with vetted creators, collaborate, and create content that drives real results.",
  metadataBase: new URL(SITE_URL),
  // No `title`/`description` here on purpose. Next inherits a parent's
  // `openGraph` block wholesale when a child does not declare one, so spelling
  // them out pinned the marketing pitch onto every link in the product — a
  // wishlist shared in Slack unfurled as "The marketplace for authentic
  // user-generated content…". Left out, Next derives og:title and
  // og:description from whatever title and description the page resolves to,
  // so a page-specific title is all a route needs.
  openGraph: {
    type: "website",
    siteName: "Go Collab",
  },
  // `summary`, not `summary_large_image`: nothing here sets an og:image, and
  // the large-image card makes Slack reserve a picture area it then renders as
  // an empty grey placeholder.
  twitter: {
    card: "summary",
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  // Required for web push on iOS, which only delivers to a site the user has
  // added to their Home Screen — and that requires a manifest with a
  // standalone display mode. Harmless everywhere else.
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${figtree.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        {/* Google Tag Manager — must sit immediately after <head> */}
        <Script
          id="gtm-js"
          src="https://www.googletagmanager.com/gtm.js?id=GTM-P3WZFZL4"
          strategy="beforeInteractive"
        />
        <Script
          id="gtm-datalayer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
`,
          }}
        />
      </head>
      <body
        className="font-sans antialiased flex min-h-svh flex-col"
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P3WZFZL4"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
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
              {metaPixelIds.map((id) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={id}
                  height="1"
                  width="1"
                  style={{ display: "none" }}
                  alt=""
                  src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
                />
              ))}
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
      </body>
    </html>
  );
}
