"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { PillButton } from "@/components/landing/marketing/pill-button";
import { SITE_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Public marketing landing page.
 *
 * Two-sided narrative — it sells the marketplace to brands and creators at
 * once, handing each side its own CTA rather than picking a primary audience.
 * Shares the pink accent and `blush` wash ramp with the /creators page.
 */

/** Vertical rhythm shared with the /creators page. */
const sectionPadY = "py-[clamp(84px,11vw,152px)]";

/**
 * Pink CTA: solid fill with dark text, matching the onboarding screens.
 * `hover:bg-pink` is required — PillButton's primary variant ships
 * `hover:bg-foreground/90`, which would otherwise darken the fill on hover
 * and leave dark text on a near-black background.
 */
const pinkCta =
  "bg-pink hover:bg-pink text-foreground shadow-hard border-0 hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none";

/** White CTA used on the dark sections. */
const lightCta =
  "bg-background hover:bg-background/90 text-foreground border-0 px-[30px] py-4 text-[15px] font-bold";

/** Cards that slide into their own shadow on hover. */
const lift =
  "shadow-hard transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-hard";

const HERO_FILTERS = ["Beauty", "Delhi", "₹3K–₹10K", "≤5 Days"];

const HERO_CARDS = [
  {
    img: "/1.jpg",
    name: "Aditi R.",
    meta: "Beauty · Delhi",
    price: "₹2,400",
    rating: "4.9",
  },
  {
    img: "/3.jpg",
    name: "Meher K.",
    meta: "Fashion · Delhi",
    price: "₹3,200",
    rating: "4.8",
  },
  {
    img: "/5.jpg",
    name: "Sana V.",
    meta: "Skincare · Noida",
    price: "₹1,900",
    rating: "5.0",
  },
];

const BRAND_NAMES = [
  "Mamaearth",
  "Nykaa",
  "boAt",
  "Minimalist",
  "The Derma Co",
  "SUGAR",
];

const BRAND_BENEFITS = [
  "Search using relevant filters",
  "See pricing upfront",
  "Compare creators",
  "Place structured orders",
  "Track collaborations",
];

const CREATOR_BENEFITS = [
  "Create your creator storefront",
  "Set your own pricing",
  "Set your delivery time",
  "Showcase your portfolio",
  "Get discovered by brands",
];

const MINI_BRAND_CARDS = [
  { img: "/2.jpg", price: "₹1,599" },
  { img: "/4.jpg", price: "₹2,750" },
  { img: "/5.jpg", price: "₹3,400" },
];

const OLD_WAY = [
  "Search Instagram",
  "→ Open profiles",
  "→ DM creators",
  "→ Wait",
  "→ Ask pricing",
  "→ Ask availability",
  "→ Send brief",
  "→ Move to WhatsApp",
  "→ Follow up",
  "→ Track manually",
];

const NEW_WAY = ["Search", "→ Compare", "→ Order", "→ Track", "→ Receive"];

const HOW_STEPS = [
  {
    n: "01",
    title: "Discover",
    desc: "Brands search creators that match their requirements.",
  },
  {
    n: "02",
    title: "Collaborate",
    desc: "Choose deliverables, pricing and timeline.",
  },
  {
    n: "03",
    title: "Create",
    desc: "Creator receives the brief and creates the content.",
  },
  {
    n: "04",
    title: "Deliver",
    desc: `Content is delivered, reviewed and completed through ${SITE_NAME}.`,
  },
];

const MP_FILTERS = [
  { label: "Category", value: "Beauty" },
  { label: "Location", value: "Delhi NCR" },
  { label: "Price", value: "₹3K–₹10K" },
  { label: "Followers", value: "10k–100k" },
  { label: "Delivery Time", value: "≤5 Days" },
];

const MARKETPLACE = [
  {
    img: "/1.jpg",
    name: "Aditi Rathore",
    category: "Beauty",
    city: "Delhi",
    followers: "42k",
    price: "₹2,400",
    delivery: "3 days",
  },
  {
    img: "/2.jpg",
    name: "Nikhil Menon",
    category: "Tech",
    city: "Bengaluru",
    followers: "18k",
    price: "₹3,800",
    delivery: "5 days",
  },
  {
    img: "/3.jpg",
    name: "Meher Kaur",
    category: "Fashion",
    city: "Delhi",
    followers: "76k",
    price: "₹3,200",
    delivery: "4 days",
  },
  {
    img: "/4.jpg",
    name: "Riya Sharma",
    category: "Food",
    city: "Mumbai",
    followers: "31k",
    price: "₹2,100",
    delivery: "3 days",
  },
  {
    img: "/5.jpg",
    name: "Sana Verma",
    category: "Skincare",
    city: "Noida",
    followers: "9.4k",
    price: "₹1,900",
    delivery: "2 days",
  },
  {
    img: "/2.jpg",
    name: "Arjun Verma",
    category: "Fitness",
    city: "Pune",
    followers: "54k",
    price: "₹4,500",
    delivery: "6 days",
  },
  {
    img: "/4.jpg",
    name: "Ananya Singh",
    category: "Parenting",
    city: "Jaipur",
    followers: "22k",
    price: "₹2,650",
    delivery: "4 days",
  },
  {
    img: "/1.jpg",
    name: "Tanvi Iyer",
    category: "Lifestyle",
    city: "Chennai",
    followers: "13k",
    price: "₹1,750",
    delivery: "3 days",
  },
];

const REMOVES = [
  {
    title: "Discovery",
    desc: "Find relevant creators without endless scrolling.",
    bg: "bg-blush-100",
    bar: "border-t-pink",
  },
  {
    title: "Transparency",
    desc: "See pricing, services and timelines before starting.",
    bg: "bg-blush-150",
    bar: "border-t-blush-300",
  },
  {
    title: "Structure",
    desc: "Keep briefs, orders, revisions and deliveries organised.",
    bg: "bg-blush-100",
    bar: "border-t-blush-700",
  },
  {
    title: "Visibility",
    desc: `Creators get a professional place where brands can discover them.`,
    bg: "bg-blush-150",
    bar: "border-t-pink",
  },
];

const ORDER_FLOW = [
  "Payment / Order",
  "Brief",
  "Awaiting Shipment",
  "Shipped",
  "In Progress",
  "Delivered",
  "Revision",
  "Approved",
  "Completed",
];

const TESTIMONIALS = [
  {
    tag: "CREATOR",
    quote:
      "I don’t have to explain my pricing and services to every brand separately anymore.",
    name: "Meher Kaur",
    role: "Fashion creator, Delhi",
    img: "/3.jpg",
  },
  {
    tag: "BRAND",
    quote:
      "Instead of asking ten creators the same questions, I can compare everything before I decide.",
    name: "Priya Nambiar",
    role: "Marketing lead, D2C skincare",
    img: "/5.jpg",
  },
];

const MARKETING_FAQS = [
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

/** Horizontal snap-carousel on small screens, 4-up grid from md. */
const carousel =
  "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1.5 md:grid md:grid-cols-4 md:overflow-visible md:pb-0";
const carouselItem = "w-[62%] shrink-0 snap-start sm:w-[76%] md:w-auto";

/** Colours for a stage chip in the order-flow strip. */
function orderStageClass(index: number, last: boolean) {
  if (last) return "bg-pink border-pink text-white";
  if (index < 5) return "bg-pink/15 border-pink/20 text-[#8E0E32]";
  return "bg-secondary border-pink/15 text-muted-foreground";
}

export function MarketingLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-grain text-foreground bg-background overflow-x-clip">
      {/* 1. HERO */}
      <section className="relative px-6 pt-[clamp(72px,10vw,120px)] pb-[clamp(72px,9vw,110px)]">
        <div className="bg-pink/12 pointer-events-none absolute -top-[390px] left-1/2 h-[470px] w-[min(820px,92vw)] -translate-x-1/2 rounded-full blur-[90px]" />

        <div className="relative mx-auto grid max-w-[1240px] items-center gap-[clamp(40px,5vw,72px)] lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <div className="bg-pink/15 mb-6 inline-flex items-center gap-2 rounded-full px-4 py-[7px]">
              <span className="font-heading text-blush-700 text-[11px] font-bold tracking-[0.13em]">
                BUILT FOR BRANDS &amp; CREATORS
              </span>
            </div>
            <h1 className="font-heading mb-[22px] text-[clamp(2.3rem,4.5vw,3.7rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance">
              Where brands find creators — and creators get found.
            </h1>
            <p className="text-muted-foreground mb-[34px] max-w-[520px] text-[clamp(1.02rem,1.4vw,1.2rem)] leading-[1.55] text-pretty">
              Discover creators, compare collaborations and manage everything
              from order to delivery — all in one place.
            </p>
            <div className="mb-[26px] flex flex-wrap gap-3">
              <PillButton
                href="/register/brand"
                className={cn(pinkCta, "px-[30px] py-[17px] text-[15px]")}
              >
                Find Creators — Free
              </PillButton>
              <PillButton
                href="/creators"
                className="bg-card hover:bg-card text-foreground border-foreground shadow-hard border-2 px-[30px] py-[17px] text-[15px] font-bold hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none"
              >
                Get Discovered as a Creator
              </PillButton>
            </div>
            <div className="text-muted-foreground text-[13px]">
              Free to explore &nbsp;•&nbsp; No payment to browse &nbsp;•&nbsp;
              Creators control their own pricing
            </div>
          </div>

          <div className="relative">
            <div className="border-foreground shadow-hard bg-card rounded-[28px] border-2 p-[22px]">
              <div className="mb-[18px] flex flex-wrap gap-2">
                {HERO_FILTERS.map((f) => (
                  <span
                    key={f}
                    className="font-heading bg-blush-100 text-blush-700 border-foreground/10 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {HERO_CARDS.map((c, i) => (
                  <div
                    key={c.name}
                    className={cn(
                      "border-foreground bg-card overflow-hidden rounded-[18px] border-2",
                      i === 2 && "hidden sm:block",
                    )}
                  >
                    <Image
                      src={c.img}
                      alt=""
                      width={240}
                      height={320}
                      priority={i === 0}
                      className="aspect-[3/4] w-full object-cover"
                    />
                    <div className="px-3 pt-[11px] pb-[13px]">
                      <div className="font-heading text-[13px] font-bold">
                        {c.name}
                      </div>
                      <div className="text-muted-foreground mb-2 text-[11px]">
                        {c.meta}
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-heading font-bold">{c.price}</span>
                        <span className="text-muted-foreground">
                          ★ {c.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-foreground bg-card animate-float absolute -top-4 -right-3 rounded-full border-2 px-4 py-2.5 shadow-sticker">
              <span className="font-heading text-[12.5px] font-bold">
                <span className="text-pink">✦</span> Creator Found
              </span>
            </div>
            <div className="border-foreground bg-foreground text-background animate-float-delayed absolute bottom-11 -left-[26px] rounded-full border-2 px-4 py-2.5 shadow-sticker">
              <span className="font-heading text-[12.5px] font-bold">
                ₹4,500 / Video
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BRAND SOCIAL PROOF */}
      <section className="border-foreground/7 border-t px-6 py-[clamp(40px,5vw,64px)]">
        <div className="mx-auto max-w-[1240px] text-center">
          <div className="font-heading text-muted-foreground mb-8 text-sm font-semibold">
            Creators on {SITE_NAME} have created for brands like
          </div>
          <div className="flex flex-wrap items-center justify-center gap-[clamp(28px,5vw,64px)]">
            {BRAND_NAMES.map((b) => (
              <span
                key={b}
                className="font-heading text-foreground/35 text-[clamp(17px,2vw,22px)] font-bold tracking-[-0.02em] whitespace-nowrap"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TWO-SIDED PLATFORM */}
      <section className={cn("bg-blush-50 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading mb-[clamp(40px,5vw,60px)] max-w-[720px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            One platform. Built for both sides of the collaboration.
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Brands */}
            <div
              className={cn(
                lift,
                "border-foreground bg-card flex flex-col rounded-[32px] border-2 p-[clamp(28px,3.4vw,44px)]",
              )}
            >
              <div className="font-heading text-blush-700 mb-[18px] text-[11px] font-bold tracking-[0.13em]">
                FOR BRANDS
              </div>
              <h3 className="font-heading mb-3.5 text-[clamp(1.35rem,2.2vw,1.75rem)] leading-[1.18] font-bold tracking-[-0.02em] text-balance">
                Stop searching everywhere. Start searching in one place.
              </h3>
              <p className="text-muted-foreground mb-[26px] text-[15px] leading-relaxed">
                Find creators, compare their work, pricing and delivery
                timelines, and place orders directly.
              </p>
              <div className="mb-7 flex flex-col">
                {BRAND_BENEFITS.map((b) => (
                  <div
                    key={b}
                    className="border-foreground/13 border-t py-[11px] text-[15px]"
                  >
                    {b}
                  </div>
                ))}
              </div>
              <div className="bg-blush-100 mb-7 rounded-2xl p-4">
                <div className="mb-3 flex flex-wrap gap-[7px]">
                  {["Beauty", "Delhi", "≤5 Days"].map((t) => (
                    <span
                      key={t}
                      className="font-heading bg-card border-foreground/15 rounded-full border px-[11px] py-1.5 text-[11px] font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2.5">
                  {MINI_BRAND_CARDS.map((m, i) => (
                    <div
                      key={`${m.img}-${i}`}
                      className="bg-card flex-1 overflow-hidden rounded-[11px]"
                    >
                      <Image
                        src={m.img}
                        alt=""
                        width={120}
                        height={120}
                        className="aspect-square w-full object-cover"
                      />
                      <div className="font-heading px-[9px] py-2 text-[10.5px] font-bold">
                        {m.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <PillButton
                href="/brand/creators"
                className={cn(
                  pinkCta,
                  "mt-auto self-start px-[27px] py-[15px] text-[14.5px]",
                )}
              >
                Explore Creators →
              </PillButton>
            </div>

            {/* Creators */}
            <div
              className={cn(
                lift,
                "bg-foreground text-background flex flex-col rounded-[32px] p-[clamp(28px,3.4vw,44px)]",
              )}
            >
              <div className="font-heading text-blush-400 mb-[18px] text-[11px] font-bold tracking-[0.13em]">
                FOR CREATORS
              </div>
              <h3 className="font-heading text-background mb-3.5 text-[clamp(1.35rem,2.2vw,1.75rem)] leading-[1.18] font-bold tracking-[-0.02em] text-balance">
                Stop hoping brands discover your Instagram.
              </h3>
              <p className="text-background/60 mb-[26px] text-[15px] leading-relaxed">
                Create a professional profile that helps brands discover,
                understand and hire you.
              </p>
              <div className="mb-7 flex flex-col">
                {CREATOR_BENEFITS.map((b) => (
                  <div
                    key={b}
                    className="border-background/15 text-background/85 border-t py-[11px] text-[15px]"
                  >
                    {b}
                  </div>
                ))}
              </div>
              <div className="bg-background/5 mb-7 flex items-center gap-3.5 rounded-2xl p-4">
                <Image
                  src="/3.jpg"
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-[14px] object-cover"
                />
                <div className="min-w-0">
                  <div className="font-heading text-[13.5px] font-bold">
                    Your creator profile
                  </div>
                  <div className="text-background/55 mb-[7px] text-[11.5px]">
                    Beauty &amp; Skincare · Delhi
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="font-heading text-blush-400 rounded-full bg-[rgba(255,158,197,0.16)] px-[9px] py-1 text-[10.5px] font-semibold">
                      From ₹1,599
                    </span>
                    <span className="font-heading bg-background/10 rounded-full px-[9px] py-1 text-[10.5px] font-semibold">
                      3-day delivery
                    </span>
                  </div>
                </div>
              </div>
              <PillButton
                href="/creators"
                className={cn(
                  lightCta,
                  "mt-auto self-start px-[27px] py-[15px] text-[14.5px]",
                )}
              >
                Create My Profile →
              </PillButton>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BIG HUMAN PROBLEM */}
      <section className="px-6 py-[clamp(88px,12vw,164px)] text-center">
        <div className="mx-auto max-w-[940px]">
          <div className="font-heading text-muted-foreground mb-1.5 text-[clamp(1.35rem,2.6vw,2rem)] leading-[1.24] font-bold">
            Thousands of brands need creators.
          </div>
          <div className="font-heading text-muted-foreground mb-[34px] text-[clamp(1.35rem,2.6vw,2rem)] leading-[1.24] font-bold">
            Thousands of creators want opportunities.
          </div>
          <h2 className="font-heading mb-[26px] text-[clamp(2.1rem,5vw,3.8rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance">
            Finding each other shouldn&rsquo;t be this hard.
          </h2>
          <p className="text-muted-foreground text-[clamp(1rem,1.4vw,1.15rem)]">
            That&rsquo;s the problem {SITE_NAME} is built to solve.
          </p>
        </div>
      </section>

      {/* 5. OLD WAY VS GOCOLLAB */}
      <section className={cn("bg-blush-100 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1180px]">
          <h2 className="font-heading mb-[clamp(40px,5vw,60px)] max-w-[680px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Creator collaborations shouldn&rsquo;t be this complicated.
          </h2>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="border-foreground bg-card rounded-[28px] border-2 p-[clamp(26px,3.2vw,40px)]">
              <div className="font-heading text-muted-foreground mb-6 text-[11px] font-bold tracking-[0.13em]">
                THE OLD WAY
              </div>
              <div className="flex flex-col gap-2.5">
                {OLD_WAY.map((s) => (
                  <div key={s} className="text-muted-foreground text-[15px]">
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-pink text-foreground shadow-hard rounded-[28px] p-[clamp(26px,3.2vw,40px)]">
              <div className="font-heading mb-6 text-[11px] font-bold tracking-[0.13em] text-white/75">
                THE {SITE_NAME.toUpperCase()} WAY
              </div>
              <div className="flex flex-col gap-3.5">
                {NEW_WAY.map((s) => (
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
          <div className="font-heading mt-[clamp(36px,4vw,56px)] text-center text-[clamp(1.2rem,2.2vw,1.7rem)] font-bold text-balance">
            That&rsquo;s how simple it should have been all along.
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="how-it-works" className={cn("px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading mb-[clamp(44px,5vw,64px)] max-w-[600px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            From discovery to delivery. One place.
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_STEPS.map((s) => (
              <div
                key={s.n}
                className="border-foreground border-t-2 pt-6"
              >
                <div className="font-heading text-muted-foreground mb-3.5 text-xs font-bold tracking-[0.1em]">
                  {s.n}
                </div>
                <div className="font-heading mb-2.5 text-[clamp(20px,2.3vw,26px)] font-extrabold tracking-[-0.025em]">
                  {s.title}
                </div>
                <p className="text-muted-foreground text-[15px] leading-[1.55] text-pretty">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. LIVE MARKETPLACE */}
      <section
        id="marketplace"
        className={cn("bg-foreground text-background px-6", sectionPadY)}
      >
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading text-background mb-3.5 text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Your next creator could already be here.
          </h2>
          <p className="text-background/60 mb-[clamp(34px,4vw,48px)] text-[clamp(1rem,1.3vw,1.12rem)]">
            Search based on what your campaign actually needs.
          </p>

          <div className="border-background/30 bg-background/5 mb-[26px] flex flex-wrap items-end gap-3 rounded-3xl border-2 p-[18px]">
            {MP_FILTERS.map((f) => (
              <div
                key={f.label}
                className="border-background/30 bg-background/5 min-w-[150px] flex-1 rounded-2xl border-2 px-4 py-3"
              >
                <div className="font-heading text-background/45 mb-1.5 text-[10px] font-bold tracking-[0.11em] uppercase">
                  {f.label}
                </div>
                <div className="font-heading text-background text-sm font-semibold">
                  {f.value}
                </div>
              </div>
            ))}
            <PillButton
              href="/brand/creators"
              className={cn(
                pinkCta,
                "rounded-2xl px-[26px] py-4 text-[14.5px]",
              )}
            >
              Search
            </PillButton>
          </div>

          <div className={cn(carousel, "mb-[clamp(34px,4vw,48px)]")}>
            {MARKETPLACE.map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                className={cn(
                  carouselItem,
                  "overflow-hidden rounded-md transition-transform duration-200 hover:-translate-y-1",
                )}
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
                    {c.city} · {c.followers}
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
          <PillButton href="/brand/creators" className={lightCta}>
            View All Creators →
          </PillButton>
        </div>
      </section>

      {/* 8. WHAT GOCOLLAB REMOVES */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading mb-[clamp(44px,5vw,64px)] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em]">
            Less chasing. More collaborating.
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {REMOVES.map((r) => (
              <div
                key={r.title}
                className={cn(
                  "rounded-[22px] border-t-[3px] px-6 py-[26px]",
                  r.bg,
                  r.bar,
                )}
              >
                <div className="font-heading mb-2.5 text-xl font-bold">
                  {r.title}
                </div>
                <p className="text-foreground/70 text-[15px] leading-relaxed text-pretty">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. TRUST / PLATFORM FLOW */}
      <section className={cn("bg-blush-50 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1180px]">
          <h2 className="font-heading mb-[clamp(36px,4.5vw,56px)] max-w-[740px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Collaboration shouldn&rsquo;t disappear into a WhatsApp chat.
          </h2>
          <div className="border-foreground shadow-hard bg-card mb-7 rounded-[28px] border-2 p-[clamp(24px,3.5vw,44px)]">
            <div className="flex flex-wrap items-center gap-2.5">
              {ORDER_FLOW.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "font-heading rounded-full border px-[18px] py-[11px] text-[13.5px] font-semibold",
                    orderStageClass(i, i === ORDER_FLOW.length - 1),
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <p className="font-heading text-[clamp(1.05rem,1.7vw,1.35rem)] font-bold">
            Both sides always know where the collaboration stands.
          </p>
        </div>
      </section>

      {/* 10. TESTIMONIALS */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-blush-50 border-blush-200 flex flex-col rounded-[28px] border-2 p-[clamp(26px,3.2vw,40px)]"
            >
              <div className="font-heading text-blush-700 mb-[22px] text-[11px] font-bold tracking-[0.13em]">
                {t.tag}
              </div>
              <div className="font-heading mb-7 text-[clamp(1.3rem,2.4vw,1.95rem)] leading-[1.24] font-extrabold tracking-[-0.025em] text-pretty">
                &ldquo;{t.quote}&rdquo;
              </div>
              <div className="mt-auto flex items-center gap-[13px]">
                <Image
                  src={t.img}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <div className="font-heading text-sm font-bold">{t.name}</div>
                  <div className="text-muted-foreground text-[12.5px]">
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 11. FAQ */}
      <section className={cn("bg-blush-100 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[880px]">
          <h2 className="font-heading mb-[clamp(36px,4.5vw,52px)] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em]">
            Questions, answered.
          </h2>
          <div className="flex flex-col gap-3">
            {MARKETING_FAQS.map((f, i) => {
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
                      aria-controls={`marketing-faq-${i}`}
                      className="font-heading flex w-full cursor-pointer items-center justify-between gap-[18px] px-[26px] py-[22px] text-left text-[16.5px] font-bold"
                    >
                      {f.q}
                      <span
                        className={cn(
                          "bg-pink/15 inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full transition-transform duration-200",
                          open && "rotate-180",
                        )}
                      >
                        <ChevronDown
                          className="text-blush-700 h-3 w-3"
                          strokeWidth={3}
                        />
                      </span>
                    </button>
                  </h3>
                  {open ? (
                    <p
                      id={`marketing-faq-${i}`}
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

      {/* 12. FINAL DUAL CTA */}
      <section className="px-6 pt-[clamp(84px,11vw,152px)] pb-[clamp(84px,10vw,140px)]">
        <div className="bg-foreground text-background shadow-hard mx-auto max-w-[1180px] rounded-[36px] p-[clamp(36px,5vw,72px)]">
          <h2 className="font-heading text-background mb-[clamp(36px,4.5vw,52px)] text-center text-[clamp(2rem,3.8vw,3.1rem)] leading-[1.06] font-bold tracking-[-0.03em] text-balance">
            Ready to collaborate differently?
          </h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="border-background/30 border-t-2 pt-[clamp(24px,3vw,34px)]">
              <div className="font-heading mb-2.5 text-[clamp(1.25rem,2vw,1.6rem)] font-bold">
                I&rsquo;m a Brand
              </div>
              <p className="text-background/70 mb-[26px] text-[15px]">
                Find creators without the endless search.
              </p>
              <PillButton
                href="/register/brand"
                className={cn(lightCta, "px-[27px] py-[15px] text-[14.5px]")}
              >
                Explore Creators — Free
              </PillButton>
            </div>
            <div className="border-background/30 border-t-2 pt-[clamp(24px,3vw,34px)]">
              <div className="font-heading mb-2.5 text-[clamp(1.25rem,2vw,1.6rem)] font-bold">
                I&rsquo;m a Creator
              </div>
              <p className="text-background/70 mb-[26px] text-[15px]">
                Make it easier for brands to find you.
              </p>
              <PillButton
                href="/register/creator"
                className={cn(pinkCta, "px-[27px] py-[15px] text-[14.5px]")}
              >
                Create My Profile — Free
              </PillButton>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky mobile CTA */}
      <div className="h-[84px] md:hidden" aria-hidden />
      <div className="border-foreground bg-background/90 fixed inset-x-0 bottom-0 z-90 flex gap-2.5 border-t-2 px-3.5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[14px] md:hidden">
        <PillButton
          href="/register/brand"
          className="bg-pink hover:bg-pink text-foreground border-foreground flex-1 border-2 py-3.5 text-sm font-bold"
        >
          Find Creators — Free
        </PillButton>
        <PillButton
          href="/register/creator"
          className="bg-card hover:bg-card text-foreground border-foreground flex-1 border-2 py-3.5 text-sm font-bold"
        >
          Create Profile
        </PillButton>
      </div>
    </div>
  );
}
