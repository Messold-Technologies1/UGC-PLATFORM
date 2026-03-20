import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "UGC Platform — Where Creators Meet Brands",
    template: "%s | UGC Platform",
  },
  description:
    "The marketplace for authentic user-generated content. Connect with vetted creators, collaborate, and create content that drives real results.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ugcplatform.com"),
  openGraph: {
    type: "website",
    siteName: "UGC Platform",
    title: "UGC Platform — Where Creators Meet Brands",
    description:
      "The marketplace for authentic user-generated content. Connect with vetted creators, collaborate, and create content that drives real results.",
  },
  twitter: {
    card: "summary_large_image",
    title: "UGC Platform — Where Creators Meet Brands",
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-svh flex-col`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
