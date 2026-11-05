import { SITE_NAME } from "@/config/site";
import type { FaqItem } from "@/lib/seo/structured-data";

/**
 * FAQ copy for the public "For Brands" page at `/brands`.
 *
 * Kept in its own module so the page's FAQPage structured data can be built
 * from the same array the accordion renders. Google requires the marked-up
 * question and answer text to match what a visitor sees, so a second,
 * hand-written copy of this list in a JSON-LD blob would be a correctness bug
 * waiting on the next copy edit.
 */
export const BRAND_FAQS: FaqItem[] = [
  {
    q: `Is ${SITE_NAME} free for brands?`,
    a: "Creating a brand account and browsing creators is free. You pay only when you place an order.",
  },
  {
    q: "Do I need to pay to browse creators?",
    a: "No. Search, filters, portfolios, pricing and delivery timelines are all visible without any payment.",
  },
  {
    q: "Can I see pricing before placing an order?",
    a: "Yes. Each creator lists their pricing, what is included and their add-ons upfront.",
  },
  {
    q: "How do I find the right creator?",
    a: "Search by category, location, budget, followers and delivery time, then compare the profiles that match.",
  },
  {
    q: "What happens after I place an order?",
    a: "The creator receives the brief and the collaboration moves through defined stages — from acceptance to delivery — so you always know the current status.",
  },
  {
    q: "How does product shipping work?",
    a: "If the collaboration requires your product, the order includes shipment stages so both sides can track when it was sent and received.",
  },
  {
    q: "Can I request revisions?",
    a: "Yes, within the revisions included in the creator’s service. Additional revisions can be purchased as an add-on where offered.",
  },
  {
    q: "What if a creator doesn’t deliver?",
    a: `If an order is not delivered according to the applicable committed timeline, you can use ${SITE_NAME}’s refund request process according to platform policy.`,
  },
  {
    q: "Can I collaborate with multiple creators?",
    a: "Yes. Every order appears in one dashboard so you can see where each collaboration stands.",
  },
  {
    q: `Can agencies use ${SITE_NAME}?`,
    a: "Yes. Agencies can source creators across client niches and manage multiple collaborations from the same account.",
  },
];
