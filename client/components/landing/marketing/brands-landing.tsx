"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { PillButton } from "@/components/landing/marketing/pill-button";
import {
  MARKETING_CREATORS as C,
  creatorMeta,
} from "@/components/landing/marketing/marketing-creators";
import { SITE_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Public "For Brands" marketing page (/brands).
 *
 * Argues the case for searching instead of cold-DMing. The brand surface
 * pairs plum CTAs with light-plum accents — the badge, the "GoCollab way"
 * panel, the why-cards and the FAQ chevrons — which is what separates it
 * visually from the creator side.
 */

/** Vertical rhythm shared across the marketing pages. */
const sectionPadY = "py-[clamp(84px,11vw,152px)]";

/**
 * Plum CTA (`#6e2545`). `hover:bg-plum-700` is required —
 * PillButton's primary variant ships `hover:bg-foreground/90`, which would
 * otherwise darken the fill and leave text on a near-black background.
 */
const plumCta =
  "bg-plum-700 hover:bg-plum-700 text-white shadow-hard border-0 hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none";

/** Light plum fill (`#e8dde2`) used in place of lime on this page. */
const plumFill = "bg-plum-150";

/** Cards that lift on hover. */
const lift = "transition-transform duration-200 hover:-translate-y-1";

const HERO_SEARCH = [
  { label: "Category", value: "Beauty" },
  { label: "Location", value: "Delhi NCR" },
  { label: "Budget", value: "₹3,000–₹7,500" },
  { label: "Followers", value: "10k–100k" },
  { label: "Delivery Time", value: "≤5 Days" },
];

const HERO_MATCHES = [C.punya, C.sakshi, C.anju];

const CHAOS = [
  "Instagram",
  "DMs",
  "Excel",
  "WhatsApp",
  "Drive",
  "Payments",
  "Follow-ups",
];

/** Status pill colours for the collaboration dashboard mock. */
const STATUS_STYLE: Record<string, string> = {
  "In Progress": "bg-plum-50 text-plum-700",
  "Awaiting Shipment": "bg-secondary text-muted-foreground",
  Delivered: "bg-[#E8F7F0] text-foreground",
  Revision: "bg-[#FFF1F5] text-[#B02A62]",
  Completed: "bg-foreground text-white",
};

const DASHBOARD = [
  {
    creator: C.anju,
    brief: `1 UGC video · ${C.anju.category}`,
    status: "In Progress",
  },
  {
    creator: C.kabir,
    brief: `2 reels · ${C.kabir.category}`,
    status: "Awaiting Shipment",
  },
  {
    creator: C.punya,
    brief: `1 reel + 3 stories · ${C.punya.category}`,
    status: "Delivered",
  },
  {
    creator: C.ananya,
    brief: `3 product videos · ${C.ananya.category}`,
    status: "Revision",
  },
  {
    creator: C.suresh,
    brief: `1 UGC ad · ${C.suresh.category}`,
    status: "Completed",
  },
];

const ANSWERED = [
  "What’s your price?",
  "Where are you based?",
  "How long will you take?",
  "What kind of content do you create?",
  "Can I see your work?",
  "What’s included?",
];

type SearchMatch = (typeof C)[keyof typeof C];

/** The conversational search line — static words plus typed field values. */
const SEARCH_EXAMPLES: {
  who: string;
  where: string;
  budget: string;
  when: string;
  matches: SearchMatch[];
}[] = [
  {
    who: "Female Beauty & Skincare Creators",
    where: "Delhi NCR",
    budget: "₹3,000–₹7,500",
    when: "5 Days",
    matches: [C.anju, C.punya, C.sana, C.disha],
  },
  {
    who: "Male Fitness Creators",
    where: "Mumbai",
    budget: "₹5,000–₹12,000",
    when: "7 Days",
    matches: [C.yash, C.kabir],
  },
  {
    who: "Female Skincare Creators",
    where: "North India",
    budget: "₹2,000–₹8,000",
    when: "5 Days",
    matches: [C.sana, C.disha],
  },
];

const SEARCH_FIELDS = ["who", "where", "budget", "when"] as const;

type SearchField = (typeof SEARCH_FIELDS)[number];

const SEARCH_LINE: ({ text: string } | { field: SearchField })[] = [
  { text: "I need" },
  { field: "who" },
  { text: "in" },
  { field: "where" },
  { text: "with a budget of" },
  { field: "budget" },
  { text: "who can deliver within" },
  { field: "when" },
];

const KNOW_ITEMS = [
  "Portfolio",
  "Price",
  "Deliverables",
  "Delivery time",
  "Followers",
  "Category",
  "Location",
  "Add-ons",
  "Other relevant creator details",
];

const TODAY = [
  "Search Instagram",
  "→ Open profiles",
  "→ Shortlist",
  "→ DM",
  "→ Wait",
  "→ Follow up",
  "→ Ask pricing",
  "→ Negotiate",
  "→ Ask availability",
  "→ Send brief",
];

const GOCOLLAB_WAY = ["Search", "→ Compare", "→ Order", "→ Track", "→ Receive"];

const ORDER_FLOW = [
  "Order Placed",
  "Creator Accepts",
  "Awaiting Shipment",
  "Product Shipped",
  "In Progress",
  "Delivered",
  "Revision",
  "Approved",
  "Completed",
];

const HIRE_FOR = [
  { title: "UGC Ads", creator: C.punya },
  { title: "Product Videos", creator: C.disha },
  { title: "Instagram Reels", creator: C.anju },
  { title: "Influencer Collaborations", creator: C.kabir },
  { title: "Product Photography", creator: C.yash },
  { title: "Website Content", creator: C.sana },
  { title: "Campaign Content", creator: C.sakshi },
  { title: "Product Launches", creator: C.suresh },
];

const WHY = [
  { title: "Find Faster", desc: "Search instead of endlessly scrolling." },
  {
    title: "Know More",
    desc: "See pricing, work and timelines before ordering.",
  },
  {
    title: "Stay Organised",
    desc: "Manage collaboration stages in one place.",
  },
  {
    title: "Reduce Uncertainty",
    desc: "Clear deliverables, timelines and order progress.",
  },
];

const AVATARS = [C.anju, C.sana, C.punya, C.ananya, C.aashi].map((c) => c.img);

const BRAND_FAQS = [
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

/** Horizontal snap-carousel on small screens, 4-up grid from md. */
const carousel =
  "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1.5 md:grid md:grid-cols-4 md:overflow-visible md:pb-0";
const carouselItem = "w-[62%] shrink-0 snap-start sm:w-[76%] md:w-auto";

/** Timeline dot colour: solid through delivery, faded after, dark at the end. */
function flowDot(index: number, last: boolean) {
  if (last) return "bg-foreground";
  return index < 5 ? "bg-pink" : "bg-pink/35";
}

const pillText =
  "font-heading text-[clamp(19px,3vw,38px)] leading-[1.32] tracking-[-0.02em]";

function ConversationalSearch({
  example,
  onExampleChange,
}: {
  example: number;
  onExampleChange: (index: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [fieldIdx, setFieldIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const last = SEARCH_FIELDS.length - 1;
      setFieldIdx(last);
      setChars(SEARCH_EXAMPLES[0][SEARCH_FIELDS[last]].length);
      setPhase("hold");
      return;
    }
    if (!inView) return;

    const values = SEARCH_FIELDS.map((key) => SEARCH_EXAMPLES[example][key]);
    const current = values[fieldIdx];
    const delay =
      phase === "hold" ? 1800 : phase === "out" ? 28 : 46;

    const t = window.setTimeout(() => {
      if (phase === "in") {
        if (chars < current.length) setChars(chars + 1);
        else if (fieldIdx < SEARCH_FIELDS.length - 1) {
          setFieldIdx(fieldIdx + 1);
          setChars(0);
        } else {
          setPhase("hold");
        }
      } else if (phase === "hold") {
        setPhase("out");
      } else if (chars > 0) {
        setChars(chars - 1);
      } else if (fieldIdx > 0) {
        const prev = fieldIdx - 1;
        setFieldIdx(prev);
        setChars(values[prev].length);
        } else {
          onExampleChange((example + 1) % SEARCH_EXAMPLES.length);
          setFieldIdx(0);
          setChars(0);
          setPhase("in");
        }
    }, delay);

    return () => window.clearTimeout(t);
  }, [chars, example, fieldIdx, inView, onExampleChange, phase]);

  const shown = (key: SearchField) => {
    const i = SEARCH_FIELDS.indexOf(key);
    const full = SEARCH_EXAMPLES[example][key];
    if (phase === "hold") return full;
    if (phase === "in") {
      if (i < fieldIdx) return full;
      if (i === fieldIdx) return full.slice(0, chars);
      return "";
    }
    if (i > fieldIdx) return "";
    if (i === fieldIdx) return full.slice(0, chars);
    return full;
  };

  const caretOn = (key: SearchField) =>
    inView && phase !== "hold" && SEARCH_FIELDS[fieldIdx] === key;

  return (
    <div
      ref={rootRef}
      className="mb-[clamp(28px,3.4vw,40px)] flex flex-wrap items-center gap-x-3.5 gap-y-2.5"
      aria-live="polite"
    >
      {SEARCH_LINE.map((part) => {
        if ("text" in part) {
          return (
            <span
              key={part.text}
              className={cn(pillText, "text-background/50 font-normal")}
            >
              {part.text}
            </span>
          );
        }

        const text = shown(part.field);
        const active = caretOn(part.field);
        if (!text && !active) return null;

        return (
          <span
            key={part.field}
            className={cn(
              pillText,
              "text-background border-background/15 bg-background/7 inline-flex min-h-[1.32em] items-center rounded-[14px] border px-4 py-2 font-bold",
            )}
          >
            {text}
            {active ? (
              <span
                className="bg-background ml-[3px] inline-block h-[0.78em] w-[2px] shrink-0 animate-gc-caret"
                aria-hidden
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function BrandsLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [searchExample, setSearchExample] = useState(0);
  const searchMatches = SEARCH_EXAMPLES[searchExample].matches;

  return (
    <div className="bg-grain text-foreground bg-background">
      {/* 1. HERO */}
      <section className="relative overflow-x-clip px-6 pt-[clamp(32px,4.5vw,52px)] pb-[clamp(40px,5.5vw,68px)]">
        <div className="bg-sky/12 pointer-events-none absolute -top-[380px] -left-[34%] h-[480px] w-[min(700px,84vw)] rounded-full blur-[90px]" />

        <div className="relative mx-auto grid max-w-[1240px] items-center gap-[clamp(40px,5vw,68px)] lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <div className={`border-foreground ${plumFill} mb-[26px] inline-flex items-center gap-2.5 rounded-full border-2 px-[22px] py-[11px] shadow-sticker`}>
              <span className="bg-foreground h-[9px] w-[9px] rounded-full" />
              <span className="font-heading text-foreground text-[15px] font-extrabold tracking-[0.1em]">
                FREE TO EXPLORE
              </span>
            </div>
            <h1 className="font-heading mb-[22px] text-[clamp(2.25rem,4.5vw,3.65rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance">
              Before you DM another 20 creators, search {SITE_NAME}.
            </h1>
            <p className="text-muted-foreground mb-[22px] max-w-[520px] text-[clamp(1rem,1.35vw,1.15rem)] leading-relaxed text-pretty">
              Find creators by category, location, price, followers and delivery
              time. Compare their work and collaboration details before placing
              an order.
            </p>
            <p className="font-heading mb-8 max-w-[500px] text-[clamp(1.08rem,1.65vw,1.3rem)] leading-[1.4] font-bold text-balance">
              Explore first. Pay only when you find someone you want to work
              with.
            </p>
            <div className="mb-6 flex flex-wrap gap-3">
              <PillButton
                href="/register/brand"
                className={cn(plumCta, "px-[30px] py-[17px] text-[15px]")}
              >
                Explore Creators — Free
              </PillButton>
              <PillButton
                href="/register/brand"
                variant="ghost"
                className="text-muted-foreground self-center px-1 py-2 text-[14.5px] font-semibold underline underline-offset-[3px]"
              >
                or create a brand account
              </PillButton>
            </div>
            <div className="text-muted-foreground text-[13px]">
              No payment to browse &nbsp;•&nbsp; Pricing visible upfront
              &nbsp;•&nbsp; No commitment
            </div>
          </div>

          <div className="relative">
            <div className="border-foreground shadow-hard bg-card rounded-[26px] border-2 p-[clamp(20px,2.4vw,26px)]">
              <div className="font-heading mb-[18px] text-base font-bold">
                What kind of creator does your brand need?
              </div>
              <div className="mb-3.5 grid gap-2.5 sm:grid-cols-2">
                {HERO_SEARCH.map((f) => (
                  <div
                    key={f.label}
                    className="border-foreground bg-blush-50 rounded-[14px] border-2 px-3.5 py-[11px]"
                  >
                    <div className="font-heading text-muted-foreground mb-1 text-[9.5px] font-bold tracking-[0.11em] uppercase">
                      {f.label}
                    </div>
                    <div className="font-heading text-[13.5px] font-semibold">
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
              <PillButton
                href="/register/brand"
                className={cn(
                  plumCta,
                  "mb-[18px] w-full rounded-[14px] py-[15px] text-[14.5px]",
                )}
              >
                Find My Creators
              </PillButton>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {HERO_MATCHES.map((m, i) => (
                  <div
                    key={m.id}
                    className={cn(
                      "border-foreground overflow-hidden rounded-[14px] border-2",
                      i === 2 && "hidden sm:block",
                    )}
                  >
                    <Image
                      src={m.img}
                      alt=""
                      width={160}
                      height={160}
                      priority={i === 0}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="px-2.5 pt-[9px] pb-[11px]">
                      <div className="font-heading text-[11.5px] font-bold">
                        {m.shortName}
                      </div>
                      <div className="text-muted-foreground mb-[5px] text-[10px]">
                        {m.city}
                      </div>
                      <div className="font-heading text-[11.5px] font-bold">
                        {m.price}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`border-foreground ${plumFill} animate-float absolute -top-3.5 -right-3 rounded-full border-2 px-[15px] py-[9px] shadow-sticker`}>
              <span className="font-heading text-foreground text-xs font-bold">
                12 creators match
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CURRENT PAIN */}
      <section className={cn("bg-blush-100 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1180px]">
          <h2 className="font-heading mb-[clamp(36px,4.5vw,56px)] max-w-[900px] text-[clamp(1.85rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            You shouldn&rsquo;t need 50 DMs, 10 spreadsheets and endless
            follow-ups just to work with creators.
          </h2>
          <div className="mb-[clamp(40px,5vw,60px)] flex max-w-[760px] flex-wrap gap-2.5">
            {CHAOS.map((c) => (
              <span
                key={c}
                className="font-heading text-foreground/30 text-[clamp(19px,2.6vw,32px)] leading-[1.1] font-bold tracking-[-0.025em]"
              >
                {c}
              </span>
            ))}
          </div>
          <h3 className="font-heading mb-[clamp(28px,3.5vw,40px)] text-[clamp(1.5rem,2.8vw,2.2rem)] leading-[1.1] font-bold tracking-[-0.03em]">
            {SITE_NAME} puts the collaboration in one place.
          </h3>
          <div className="border-foreground shadow-hard bg-card overflow-hidden rounded-3xl border-2">
            <div className="border-foreground/7 flex items-center justify-between gap-4 border-b px-6 py-[18px]">
              <div className="font-heading text-[14.5px] font-bold">
                Active collaborations
              </div>
              <div className="text-muted-foreground text-xs">5 orders</div>
            </div>
            {DASHBOARD.map((d) => (
              <div
                key={d.creator.id}
                className="border-foreground/5 flex items-center gap-4 border-b px-6 py-[15px]"
              >
                <Image
                  src={d.creator.img}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-sm font-bold">{d.creator.name}</div>
                  <div className="text-muted-foreground text-[11.5px]">
                    {d.brief}
                  </div>
                </div>
                <span
                  className={cn(
                    "font-heading rounded-full px-[13px] py-1.5 text-[11.5px] font-bold whitespace-nowrap",
                    STATUS_STYLE[d.status],
                  )}
                >
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. EVERYTHING ALREADY ANSWERED */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto grid max-w-[1240px] items-end gap-x-[clamp(40px,6vw,88px)] gap-y-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          <div className="border-foreground shadow-hard bg-card mx-auto w-full max-w-[520px] overflow-hidden rounded-[28px] border-2 lg:mx-0 lg:max-w-none">
            <Image
              src={C.punya.img}
              alt=""
              width={560}
              height={420}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="px-6 pt-[22px] pb-[26px]">
              <div className="font-heading text-[19px] font-bold">
                {C.punya.name}
              </div>
              <div className="text-muted-foreground mb-5 text-[13px]">
                {creatorMeta(C.punya)}
              </div>
              <div className="flex flex-col gap-[11px] text-[13px]">
                {[
                  { k: "1 UGC video", v: C.punya.price },
                  { k: "Delivery", v: C.punya.delivery },
                  { k: "Included", v: "1 revision, raw files" },
                  { k: "Add-ons", v: "Faster delivery" },
                ].map((row) => (
                  <div key={row.k} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{row.k}</span>
                    <span className="font-heading text-right font-bold">
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-heading mb-4 text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
              Everything you normally ask a creator. Already answered.
            </h2>
            <div className="grid gap-x-[clamp(28px,4vw,56px)] sm:grid-cols-2">
              {ANSWERED.map((a) => (
                <div
                  key={a}
                  className="border-foreground/15 flex items-baseline justify-between gap-4 border-t py-3"
                >
                  <span className="text-muted-foreground text-[15px] leading-[1.4]">
                    &ldquo;{a}&rdquo;
                  </span>
                  <span className="font-heading text-[15px] font-extrabold whitespace-nowrap">
                    Visible.
                  </span>
                </div>
              ))}
            </div>
            <h3 className="font-heading mt-5 text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
              Spend your time choosing creators. Not collecting information
              from them.
            </h3>
          </div>
        </div>
      </section>

      {/* 4. SEARCH FOR CAMPAIGN FIT */}
      <section
        id="explore"
        className={cn("bg-foreground text-background px-6", sectionPadY)}
      >
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading text-background mb-[clamp(36px,4.5vw,52px)] max-w-[700px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Search like you&rsquo;re actually hiring for a campaign.
          </h2>
          <div className="border-background/30 bg-background/5 mb-[clamp(32px,4vw,48px)] rounded-[26px] border-2 p-[clamp(24px,3vw,40px)]">
            <ConversationalSearch
              example={searchExample}
              onExampleChange={setSearchExample}
            />
            <PillButton
              href="/register/brand"
              className={cn(plumCta, "px-[30px] py-4 text-[15px]")}
            >
              Show Me Creators
            </PillButton>
          </div>
          <div className="text-background/45 mb-4 text-[13px]">
            {searchMatches.length} creators match ·{" "}
            {SEARCH_EXAMPLES[searchExample].where}
          </div>
          <div key={SEARCH_EXAMPLES[searchExample].who} className={carousel}>
            {searchMatches.map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                className={cn(carouselItem, lift, "overflow-hidden rounded-md")}
              >
                <div className="relative">
                  <Image
                    src={c.img}
                    alt=""
                    width={300}
                    height={400}
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <span className="font-heading text-background absolute top-[11px] left-[11px] rounded-full bg-[rgba(24,19,19,0.72)] px-[11px] py-[5px] text-[10.5px] font-bold backdrop-blur-[6px]">
                    {c.category}
                  </span>
                </div>
                <div className="px-0.5 pt-3.5">
                  <div className="font-heading text-[15.5px] font-bold">
                    {c.name}
                  </div>
                  <div className="text-background/50 mb-3 text-xs">
                    {c.city}
                  </div>
                  <div className="border-background/10 flex items-center justify-between border-t pt-3">
                    <span className="font-heading text-[14.5px] font-bold">
                      {c.price}
                    </span>
                    <span className="text-background/50 text-[11.5px]">
                      {c.delivery}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. KNOW BEFORE YOU SPEND */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1180px]">
          <h2 className="font-heading mb-3.5 text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em]">
            Know more before you spend.
          </h2>
          <p className="text-muted-foreground mb-[clamp(36px,4.5vw,52px)] max-w-[600px] text-[clamp(1rem,1.4vw,1.15rem)] text-pretty">
            The creator may look right. Make sure the collaboration is right
            too.
          </p>
          <div className="mb-[clamp(44px,5vw,64px)] grid gap-x-[clamp(28px,4vw,56px)] sm:grid-cols-2 lg:grid-cols-3">
            {KNOW_ITEMS.map((k) => (
              <div
                key={k}
                className="font-heading border-foreground/15 border-t py-[clamp(15px,1.9vw,20px)] text-[clamp(17px,1.9vw,21px)] font-bold tracking-[-0.02em]"
              >
                {k}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-7">
            <h3 className="font-heading text-[clamp(1.5rem,2.8vw,2.2rem)] leading-[1.1] font-bold tracking-[-0.03em]">
              See. Compare. Choose with confidence.
            </h3>
            <PillButton
              href="/register/brand"
              className={cn(plumCta, "px-[30px] py-4 text-[15px]")}
            >
              Explore Creators
            </PillButton>
          </div>
        </div>
      </section>

      {/* 6. OLD WAY VS GOCOLLAB */}
      <section className={cn("bg-blush-50 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1180px]">
          <h2 className="font-heading mb-[clamp(40px,5vw,60px)] max-w-[640px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            The right creator shouldn&rsquo;t take hours to find.
          </h2>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="border-foreground bg-card rounded-[28px] border-2 p-[clamp(26px,3.2vw,40px)]">
              <div className="font-heading text-muted-foreground mb-6 text-[11px] font-bold tracking-[0.13em]">
                TODAY
              </div>
              <div className="flex flex-col gap-2.5">
                {TODAY.map((s) => (
                  <div key={s} className="text-muted-foreground text-[15px]">
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div className={`border-foreground ${plumFill} text-foreground shadow-hard rounded-[28px] border-2 p-[clamp(26px,3.2vw,40px)]`}>
              <div className="font-heading text-foreground/55 mb-6 text-[11px] font-bold tracking-[0.13em]">
                {SITE_NAME.toUpperCase()}
              </div>
              <div className="flex flex-col gap-3.5">
                {GOCOLLAB_WAY.map((s) => (
                  <div
                    key={s}
                    className="font-heading text-[clamp(1.2rem,2.2vw,1.7rem)] leading-[1.15] font-bold"
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <h3 className="font-heading mt-[clamp(36px,4vw,56px)] text-center text-[clamp(1.5rem,2.8vw,2.2rem)] leading-[1.1] font-bold tracking-[-0.03em]">
            Less chasing. More creating.
          </h3>
        </div>
      </section>

      {/* 7. ORDER SECURITY */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1180px]">
          <h2 className="font-heading mb-[clamp(36px,4.5vw,56px)] max-w-[840px] text-[clamp(1.85rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Creator collaborations shouldn&rsquo;t feel like sending money and
            hoping for the best.
          </h2>
          <div className="mb-[clamp(36px,4.5vw,52px)] flex flex-col">
            {ORDER_FLOW.map((label, i) => {
              const last = i === ORDER_FLOW.length - 1;
              return (
                <div
                  key={label}
                  className="grid grid-cols-[34px_1fr] items-center gap-[18px]"
                >
                  <div className="flex h-full flex-col items-center self-stretch">
                    <span
                      className={cn(
                        "my-1.5 h-3 w-3 shrink-0 rounded-full",
                        flowDot(i, last),
                      )}
                    />
                    {!last ? (
                      <span className="bg-pink/20 w-0.5 flex-1" />
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      "font-heading pt-3 text-[clamp(15px,1.8vw,19px)] font-bold",
                      last ? "pb-0" : "pb-3",
                    )}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
          <h3 className="font-heading mb-[22px] text-[clamp(1.5rem,2.8vw,2.2rem)] leading-[1.1] font-bold tracking-[-0.03em]">
            You always know what&rsquo;s happening next.
          </h3>
          <p className="text-muted-foreground max-w-[720px] text-[14.5px] leading-[1.65] text-pretty">
            If an order is not delivered according to the applicable committed
            timeline, brands can use {SITE_NAME}&rsquo;s refund request process
            according to platform policy.
          </p>
        </div>
      </section>

      {/* 8. MULTIPLE CREATOR MANAGEMENT */}
      <section className={cn("bg-blush-100 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1080px]">
          <h2 className="font-heading mb-[clamp(36px,4.5vw,52px)] max-w-[620px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Five creators shouldn&rsquo;t mean five different workflows.
          </h2>
          <div className="border-foreground shadow-hard bg-card mb-[clamp(32px,4vw,44px)] overflow-hidden rounded-[26px] border-2">
            {DASHBOARD.map((d) => (
              <div
                key={d.creator.id}
                className="border-foreground/5 flex items-center gap-4 border-b px-[26px] py-[18px]"
              >
                <Image
                  src={d.creator.img}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-[15px] font-bold">
                    {d.creator.name}
                  </div>
                  <div className="text-muted-foreground text-xs">{d.brief}</div>
                </div>
                <span
                  className={cn(
                    "font-heading rounded-full px-[15px] py-[7px] text-xs font-bold whitespace-nowrap",
                    STATUS_STYLE[d.status],
                  )}
                >
                  {d.status}
                </span>
              </div>
            ))}
          </div>
          <h3 className="font-heading text-[clamp(1.4rem,2.6vw,2.1rem)] leading-[1.12] font-bold tracking-[-0.02em] text-balance">
            One place to know where every collaboration stands.
          </h3>
        </div>
      </section>

      {/* 9. WHAT CAN YOU HIRE FOR */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading mb-[clamp(40px,5vw,60px)] max-w-[620px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Whatever you&rsquo;re creating, find creators for it.
          </h2>
          <div className={carousel}>
            {HIRE_FOR.map((h, i) => (
              <div
                key={`${h.title}-${i}`}
                className={cn(carouselItem, lift, "relative overflow-hidden rounded")}
              >
                <Image
                  src={h.creator.img}
                  alt=""
                  width={400}
                  height={500}
                  className="aspect-[4/5] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(24,19,19,0.85)] from-0% to-[rgba(24,19,19,0.1)] to-[58%]" />
                <span className="font-heading text-background absolute top-[11px] left-[11px] rounded-full bg-[rgba(24,19,19,0.72)] px-[11px] py-[5px] text-[10.5px] font-bold backdrop-blur-[6px]">
                  {h.creator.category}
                </span>
                <div className="absolute inset-x-0 bottom-0 px-[18px] pt-[18px] pb-5">
                  <div className="font-heading text-base leading-[1.22] font-bold text-white">
                    {h.title}
                  </div>
                  <div className="mt-1 text-[12px] text-white/70">
                    {h.creator.price} · {h.creator.delivery}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. WHY GOCOLLAB */}
      <section
        className={cn("bg-foreground text-background px-6", sectionPadY)}
      >
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading text-background mb-[clamp(44px,5vw,64px)] max-w-[640px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Built to remove friction from creator collaboration.
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <div key={w.title} className="border-t-plum-150 border-t-2 pt-[22px]">
                <div className="font-heading mb-[11px] text-[clamp(20px,2.1vw,24px)] font-bold tracking-[-0.02em]">
                  {w.title}
                </div>
                <p className="text-background/60 text-[14.5px] leading-relaxed text-pretty">
                  {w.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. LOW-RISK EXPLORATION */}
      <section className="px-6 py-[clamp(84px,11vw,150px)]">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="font-heading mb-3 text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.06] font-bold tracking-[-0.03em]">
            Not ready to collaborate yet?
          </h2>
          <h2 className="font-heading mb-8 text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.06] font-bold tracking-[-0.03em]">
            Good. You don&rsquo;t have to.
          </h2>
          <p className="text-muted-foreground mx-auto mb-7 max-w-[620px] text-[clamp(1.02rem,1.5vw,1.2rem)] leading-relaxed text-pretty">
            Browse creators. See their work. Compare pricing. Understand
            what&rsquo;s available. Come back when you&rsquo;re ready.
          </p>
          <div className="font-heading mb-[34px] text-[clamp(1.15rem,2vw,1.5rem)] font-bold">
            There&rsquo;s no payment required to browse.
          </div>
          <PillButton
            href="/register/brand"
            className={cn(plumCta, "px-8 py-[18px] text-[15.5px]")}
          >
            Explore Creators — Free
          </PillButton>
        </div>
      </section>

      {/* 12. FAQ */}
      <section className={cn("bg-blush-50 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[880px]">
          <h2 className="font-heading mb-[clamp(36px,4.5vw,52px)] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em]">
            Brand questions, answered.
          </h2>
          <div className="flex flex-col gap-3">
            {BRAND_FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={f.q}
                  className="border-foreground bg-card overflow-hidden rounded-[20px] border-2"
                >
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      aria-controls={`brand-faq-${i}`}
                      className="font-heading flex w-full cursor-pointer items-center justify-between gap-[18px] px-[26px] py-[21px] text-left text-base font-bold"
                    >
                      {f.q}
                      <span
                        className={cn(
                          `${plumFill} inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full transition-transform duration-200`,
                          open && "rotate-180",
                        )}
                      >
                        <ChevronDown
                          className="text-foreground h-3 w-3"
                          strokeWidth={3}
                        />
                      </span>
                    </button>
                  </h3>
                  {open ? (
                    <p
                      id={`brand-faq-${i}`}
                      className="text-muted-foreground px-[26px] pb-6 text-[15px] leading-[1.62] text-pretty"
                    >
                      {f.a}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 13. FINAL CTA */}
      <section className="px-6 pt-[clamp(84px,11vw,152px)] pb-[clamp(84px,10vw,140px)]">
        <div className="bg-foreground shadow-hard mx-auto max-w-[1180px] rounded-[36px] p-[clamp(36px,5vw,72px)] text-center text-white">
          <h2 className="font-heading mb-[22px] text-[clamp(2rem,3.8vw,3.1rem)] leading-[1.05] font-bold tracking-[-0.03em] text-white text-balance">
            Your next creator search can take hours.
            <br />
            Or it can start here.
          </h2>
          <p className="mx-auto mb-9 max-w-[620px] text-[clamp(1rem,1.4vw,1.15rem)] text-white/70 text-pretty">
            Browse creators for free. No calls. No commitment. No payment until
            you&rsquo;re ready to order.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[18px]">
            <div className="flex pl-3">
              {AVATARS.map((a) => (
                <Image
                  key={a}
                  src={a}
                  alt=""
                  width={42}
                  height={42}
                  className="border-foreground -ml-3 h-[42px] w-[42px] rounded-full border-2 object-cover"
                />
              ))}
            </div>
            <PillButton
              href="/register/brand"
              className="bg-white text-foreground shadow-hard border-0 px-8 py-[18px] text-[15.5px] font-bold hover:bg-white hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
            >
              Explore Creators — Free
            </PillButton>
          </div>
        </div>
      </section>

      {/* Sticky mobile CTA */}
      <div className="h-[84px] md:hidden" aria-hidden />
      <div className="border-foreground bg-background/90 fixed inset-x-0 bottom-0 z-90 flex gap-2.5 border-t-2 px-3.5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[14px] md:hidden">
        <PillButton
          href="/register/brand"
          className="bg-plum-700 hover:bg-plum-700 border-foreground w-full border-2 py-3.5 text-sm font-bold text-white"
        >
          Explore Creators — Free
        </PillButton>
      </div>
    </div>
  );
}
