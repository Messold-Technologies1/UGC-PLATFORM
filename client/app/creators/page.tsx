import type { Metadata } from "next";
import { CreatorsLanding } from "@/components/landing/marketing/creators-landing";
import { SITE_NAME } from "@/config/site";

export const metadata: Metadata = {
  // `absolute`, so the root template does not append "| Go Collab" to a
  // title that already says it. Visible now that og:title is derived from
  // the page title rather than pinned to one line in the root layout.
  title: { absolute: `${SITE_NAME} for Creators — Your job is to create. Not chase brands.` },
  description:
    "Create your profile once and let brands find you when they need creators like you. Free to join, your pricing, your terms, your work.",
};

export default function CreatorsPage() {
  return <CreatorsLanding />;
}
