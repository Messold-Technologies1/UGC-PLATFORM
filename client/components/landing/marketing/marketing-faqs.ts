import { SITE_NAME } from "@/config/site";
import type { FaqItem } from "@/lib/seo/structured-data";

/**
 * FAQ copy for the public landing page at `/`.
 *
 * Kept in its own module so the page's FAQPage structured data can be built
 * from the same array the accordion renders. Google requires the marked-up
 * question and answer text to match what a visitor sees, so a second,
 * hand-written copy of this list in a JSON-LD blob would be a correctness bug
 * waiting on the next copy edit.
 */
export const MARKETING_FAQS: FaqItem[] = [
  {
    q: `What is ${SITE_NAME}?`,
    a: `${SITE_NAME} is a marketplace where brands find and hire creators, and creators create a profile that brands can discover, understand and order from.`,
  },
  {
    q: `Is ${SITE_NAME} free?`,
    a: "Creating an account is free for both brands and creators. Brands can browse creators without any payment, and creators join without a joining fee.",
  },
  {
    q: "Can brands browse creators before paying?",
    a: "Yes. Search, filters, portfolios, pricing and delivery timelines are visible before you place an order.",
  },
  {
    q: "How do creators get discovered?",
    a: `Brands search ${SITE_NAME} by category, location, budget, followers and delivery time. Profiles matching those requirements appear in the results.`,
  },
  {
    q: "How does an order work?",
    a: "A brand selects a creator’s service, agrees the deliverables and timeline, and places the order. The collaboration then moves through clearly defined stages until delivery.",
  },
  {
    q: "What happens after content is delivered?",
    a: "The brand reviews the delivery, can request revisions where applicable, and approves it to complete the order.",
  },
  {
    q: "How are revisions handled?",
    a: "Revisions are part of the agreed service. Creators list how many are included, and additional revisions can be offered as an add-on.",
  },
];
