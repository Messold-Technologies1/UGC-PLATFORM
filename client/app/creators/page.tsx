import type { Metadata } from "next";
import { CreatorsLanding } from "@/components/landing/marketing/creators-landing";
import { CREATOR_FAQS } from "@/components/landing/marketing/creator-faqs";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_NAME } from "@/config/site";
import { faqPageSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: `${SITE_NAME} for Creators — Your job is to create. Not chase brands.`,
  description:
    "Create your profile once and let brands find you when they need creators like you. Free to join, your pricing, your terms, your work.",
};

export default function CreatorsPage() {
  return (
    <>
      {/* Built from the same array the accordion renders, so the markup
          cannot drift from the copy. Organization and WebSite stay on `/`,
          which is the canonical URL they describe. */}
      <JsonLd id="ld-faq" schema={faqPageSchema(CREATOR_FAQS)} />
      <CreatorsLanding />
    </>
  );
}
