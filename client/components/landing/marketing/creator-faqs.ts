import { SITE_NAME } from "@/config/site";
import type { FaqItem } from "@/lib/seo/structured-data";

/**
 * FAQ copy for the public "For Creators" page at `/creators`.
 *
 * Kept in its own module so the page's FAQPage structured data can be built
 * from the same array the accordion renders. Google requires the marked-up
 * question and answer text to match what a visitor sees, so a second,
 * hand-written copy of this list in a JSON-LD blob would be a correctness bug
 * waiting on the next copy edit.
 */
export const CREATOR_FAQS: FaqItem[] = [
  {
    q: `Is ${SITE_NAME} free for creators?`,
    a: "Yes. Creating your profile and being discoverable costs nothing. There is no joining fee.",
  },
  {
    q: "Do I need a minimum follower count?",
    a: "No. Brands search for different things — some need content, some need audience. Your profile shows what you offer either way.",
  },
  {
    q: "Can UGC creators join without a large audience?",
    a: "Yes. Many brands are looking for content they can use in ads and on product pages, not for your follower count.",
  },
  {
    q: "Can I decide my own pricing?",
    a: "You set your own prices, for every service you list.",
  },
  {
    q: "Can I choose what services I offer?",
    a: "Yes. You choose your deliverables, what is included, and any add-ons you want to offer.",
  },
  {
    q: "Can I change my pricing later?",
    a: "You can update your pricing, services, delivery timelines and add-ons whenever you want.",
  },
  {
    q: "How do brands discover me?",
    a: "Brands search by category, location, budget, followers and delivery time. Profiles matching their requirements appear in the results.",
  },
  {
    q: "What happens when I receive an order?",
    a: "You receive the brief and the agreed deliverables, timeline and pricing. You accept it and then create the content.",
  },
  {
    q: "How do revisions work?",
    a: "Revisions are part of the service you listed. You decide how many are included, and can offer extra revisions as an add-on.",
  },
  {
    q: "When do creators get paid?",
    a: "Payment is released once the delivery is completed according to the agreed brief and platform policy.",
  },
];
