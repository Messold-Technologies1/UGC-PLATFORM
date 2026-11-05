import type { MarketingFaq } from "@/components/landing/marketing/marketing-faqs";
import { SITE_NAME, SITE_URL } from "@/config/site";

/**
 * schema.org JSON-LD builders.
 *
 * Each returns a plain object; `<JsonLd>` serializes it. Keeping them as data
 * rather than template strings is what lets the FAQ markup be generated from
 * the same array the page renders, so the two cannot drift apart.
 */

/** Loose shape — schema.org graphs are open-ended by design. */
export type JsonLdSchema = Record<string, unknown>;

/**
 * Publisher identity. Google reads `name`, `logo` and `sameAs` for the
 * knowledge panel, so `sameAs` should only list profiles the organization
 * actually controls.
 */
export function organizationSchema(): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Gocollab",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand-logo.png`,
    sameAs: [
      "https://www.instagram.com/gocollab.io",
      "https://www.linkedin.com/company/messold-technologies",
    ],
  };
}

/**
 * Site identity.
 *
 * Deliberately no `potentialAction`/`SearchAction`: the sitelinks searchbox it
 * feeds needs a URL that runs a search, and nothing on the site takes a search
 * term from the URL today — `/creators` is a marketing page, and the browse
 * list at `/brand/creators` only reads `?creatorId=`. Pointing a SearchAction
 * at a URL that does not search is worse than omitting it. See the note in
 * app/(main)/page.tsx.
 */
export function websiteSchema(): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
  };
}

/**
 * FAQ rich result.
 *
 * Built from the rendered FAQ list. Google requires every marked-up answer to
 * be present in the page HTML — hidden behind an accordion is fine, absent
 * from the DOM is not — which is why the landing page keeps collapsed answers
 * mounted.
 */
export function faqPageSchema(faqs: readonly MarketingFaq[]): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}
