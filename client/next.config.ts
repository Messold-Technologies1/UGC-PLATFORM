import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui"],
  },
  images: {
    // Bypass Vercel Image Optimization (avoids OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async rewrites() {
    // BFF proxy: browser calls go to the frontend's own origin (`/api/*`) and
    // are proxied to the backend here. This makes the auth cookie first-party,
    // so login/signup work inside in-app browsers (Instagram/Facebook) and
    // under Safari ITP, where cross-site cookies are blocked. Next's own
    // route handlers (e.g. `/api/internal/*`) still win via afterFiles order.
    const apiBase = (
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000"
    ).replace(/\/$/, "");

    return [
      {
        source: "/favicon.ico",
        destination: "/logo.png",
      },
      ...(apiBase
        ? [
            {
              source: "/api/:path*",
              destination: `${apiBase}/api/:path*`,
            },
          ]
        : []),
    ];
  },
  async redirects() {
    return [
      {
        source: "/brand/orders/:orderId/brief",
        destination: "/brand/orders/:orderId",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
