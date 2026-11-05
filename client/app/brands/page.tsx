import type { Metadata } from "next";
import { BrandsLanding } from "@/components/landing/marketing/brands-landing";
import { BRAND_FAQS } from "@/components/landing/marketing/brand-faqs";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_NAME } from "@/config/site";
import { faqPageSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: `${SITE_NAME} for Brands — Before you DM another 20 creators`,
  description:
    "Find creators by category, location, price, followers and delivery time. Compare their work and collaboration details before placing an order. Free to explore.",
};

export default function BrandsPage() {
  return (
    <>
      {/* Built from the same array the accordion renders, so the markup
          cannot drift from the copy. Organization and WebSite stay on `/`,
          which is the canonical URL they describe. */}
      <JsonLd id="ld-faq" schema={faqPageSchema(BRAND_FAQS)} />
      <BrandsLanding />
    </>
  );
}
