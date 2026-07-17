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
    return [
      {
        source: "/favicon.ico",
        destination: "/logo.png",
      },
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
