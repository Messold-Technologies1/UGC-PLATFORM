import type { Metadata } from "next";
import { BrandsLanding } from "@/components/landing/marketing/brands-landing";
import { SITE_NAME } from "@/config/site";

export const metadata: Metadata = {
  // `absolute`, so the root template does not append "| Go Collab" to a
  // title that already says it. Visible now that og:title is derived from
  // the page title rather than pinned to one line in the root layout.
  title: { absolute: `${SITE_NAME} for Brands — Before you DM another 20 creators` },
  description:
    "Find creators by category, location, price, followers and delivery time. Compare their work and collaboration details before placing an order. Free to explore.",
};

export default function BrandsPage() {
  return <BrandsLanding />;
}
