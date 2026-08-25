"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, X } from "lucide-react";
import { PillButton } from "@/components/landing/marketing/pill-button";
import { SITE_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Public "For Creators" marketing page (/creators).
 *
 * Argues the case for listing a profile: it leads with the creator's own
 * pain rather than platform features. Leans on the pink accent paired with
 * the `blush` wash ramp for the alternating section backgrounds.
 */

/** Vertical rhythm for this page. */
const sectionPadY = "py-[clamp(84px,11vw,152px)]";

/**
 * Deep-pink CTA (`#B3123F`). `hover:bg-deep-pink` is required —
 * PillButton's primary variant ships `hover:bg-foreground/90`, which would
 * otherwise darken the fill on hover.
 */
const pinkCta =
  "bg-deep-pink hover:bg-deep-pink text-white shadow-hard border-0 hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none";

/** Cards that slide into their own shadow on hover. */
const hardCard = "border-foreground shadow-hard rounded-[28px] border-2";

const DISCOVERY = [
  {
    title: "Brand searched: Beauty Creator • Delhi",
    sub: "Budget ₹3,000–₹7,000 · Delivery ≤5 days",
    dot: "bg-pink",
  },
  { title: "Your profile appeared", sub: null, dot: "bg-pink/60" },
  { title: "Brand viewed your work", sub: null, dot: "bg-pink/40" },
  {
    title: "New collaboration",
    sub: "Order placed · 1 reel + 2 stories",
    dot: "bg-lime",
  },
];

const NOT_TO = [
  "Search for brand contacts",
  "Send 50 cold DMs",
  "Send your portfolio repeatedly",
  "Explain your pricing again and again",
  "Ask “Any update?”",
  "Track everything through WhatsApp",
];

const REALITY = [
  "Create content",
  "Search brands",
  "Check Instagram",
  "Find email/contact",
  "Send DM",
  "Wait",
  "Follow up",
  "Send portfolio",
  "Share prices",
  "Wait again",
  "Maybe get a collaboration",
];

const BRAND_SEARCH = [
  { label: "Creator", value: "Female Creator" },
  { label: "Category", value: "Beauty" },
  { label: "Location", value: "Delhi NCR" },
  { label: "Budget", value: "₹3,000–₹7,000" },
  { label: "Delivery", value: "≤5 Days" },
];

const REVERSE_FLOW = [
  "Search",
  "Your profile appears",
  "Brand sees your portfolio",
  "Brand sees your pricing",
  "Brand selects your service",
  "Collaboration begins",
];

const CALLOUTS = [
  { title: "Your Portfolio", desc: "Show brands what you can create." },
  {
    title: "Your Pricing",
    desc: "No need to send commercials repeatedly.",
  },
  {
    title: "Your Services",
    desc: "Show exactly what brands can hire you for.",
  },
  { title: "Your Delivery Time", desc: "Set realistic timelines." },
  {
    title: "Your Add-ons",
    desc: "Additional revisions, faster delivery, location shoots etc.",
  },
  {
    title: "Your Creator Details",
    desc: "Category, city, followers and relevant information.",
  },
];

const CONTROL = [
  { title: "Your Price", desc: "You decide what your work costs." },
  {
    title: "Your Services",
    desc: "Choose what you want brands to hire you for.",
  },
  {
    title: "Your Timeline",
    desc: "Set a delivery timeline that works for you.",
  },
  {
    title: "Your Add-ons",
    desc: "Offer additional services and earn more.",
  },
  { title: "Your Profile", desc: "Show brands what makes you different." },
];

const BRAND_NAMES = [
  "Mamaearth",
  "Nykaa",
  "boAt",
  "Minimalist",
  "The Derma Co",
  "SUGAR",
];

const ASPIRATION_CARDS = [
  { img: "/1.jpg", name: "Aditi Rathore", meta: "Beauty · Delhi" },
  { img: "/5.jpg", name: "Sana Verma", meta: "Skincare · Noida" },
  { img: "/2.jpg", name: "Nikhil Menon", meta: "Tech · Bengaluru" },
  { img: "/4.jpg", name: "Riya Sharma", meta: "Food · Mumbai" },
];

const CREATOR_TYPES = [
  {
    title: "UGC Creators",
    desc: "Brands need your content, not necessarily your audience.",
    img: "/4.jpg",
  },
  {
    title: "Nano Creators",
    desc: "Smaller audience. Strong community.",
    img: "/5.jpg",
  },
  {
    title: "Micro Creators",
    desc: "Niche audience and engaged followers.",
    img: "/2.jpg",
  },
  {
    title: "Influencers",
    desc: "Collaborate using your content and audience.",
    img: "/3.jpg",
  },
];

const CATEGORIES = [
  "Beauty",
  "Fashion",
  "Lifestyle",
  "Food",
  "Fitness",
  "Parenting",
  "Travel",
  "Technology",
];

const STEPS = [
  "Create your profile",
  "Showcase your work",
  "Set pricing & services",
  "Get discovered",
  "Receive collaborations",
  "Create & deliver",
  "Complete & earn",
];

const AVATARS = ["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg"];

const TESTIMONIALS = [
  {
    quote:
      "Earlier I was sending my portfolio separately to every brand. Now everything they need to know is on my profile.",
    name: "Meher Kaur",
    role: "Fashion creator, Delhi",
    img: "/3.jpg",
  },
  {
    quote:
      "Brands can understand my services and pricing before approaching me.",
    name: "Sana Verma",
    role: "Skincare creator, Noida",
    img: "/5.jpg",
  },
  {
    quote:
      "I can focus more on creating instead of constantly searching for collaborations.",
    name: "Riya Sharma",
    role: "Food creator, Mumbai",
    img: "/4.jpg",
  },
];

const CREATOR_FAQS = [
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

/** Horizontal snap-carousel on small screens, 4-up grid from md. */
const carousel =
  "flex snap-x snap-mandatory gap-[clamp(14px,1.7vw,22px)] overflow-x-auto pb-1.5 md:grid md:grid-cols-4 md:overflow-visible md:pb-0";
const carouselItem = "w-[62%] shrink-0 snap-start sm:w-[76%] md:w-auto";

export function CreatorsLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-grain text-foreground bg-background">
      {/* 1. HERO */}
      <section className="relative overflow-x-clip px-6 pt-[clamp(32px,4.5vw,52px)] pb-[clamp(40px,5.5vw,68px)]">
        <div className="bg-pink/15 pointer-events-none absolute -top-[380px] -right-[32%] h-[480px] w-[min(700px,84vw)] rounded-full blur-[90px]" />

        <div className="relative mx-auto grid max-w-[1240px] items-center gap-[clamp(40px,5vw,72px)] lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="bg-pink/12 mb-6 inline-flex rounded-full px-4 py-[7px]">
              <span className="font-heading text-deep-pink text-[11px] font-bold tracking-[0.13em]">
                FOR CREATORS
              </span>
            </div>
            <h1 className="font-heading mb-[22px] text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] font-bold tracking-[-0.03em] text-balance">
              Your job is to create.
              <br />
              Not chase brands.
            </h1>
            <p className="text-muted-foreground mb-[22px] max-w-[540px] text-[clamp(1rem,1.35vw,1.15rem)] leading-relaxed text-pretty">
              You shouldn&rsquo;t have to spend your day finding brand contacts,
              sending DMs, sharing your portfolio, explaining your prices and
              following up.
            </p>
            <p className="font-heading mb-[34px] max-w-[540px] text-[clamp(1.1rem,1.7vw,1.35rem)] leading-[1.38] font-bold text-balance">
              Create your {SITE_NAME} profile once. Let brands find you when
              they need creators like you.
            </p>
            <PillButton
              href="/register/creator"
              className={cn(pinkCta, "px-8 py-[18px] text-[15.5px] font-bold")}
            >
              Create My Profile — Free
            </PillButton>
            <div className="text-muted-foreground mt-[22px] text-[13px]">
              Free to join &nbsp;•&nbsp; Your pricing &nbsp;•&nbsp; Your terms
              &nbsp;•&nbsp; Your work
            </div>
          </div>

          <div className="relative">
            <div className="shadow-hard overflow-hidden rounded-[28px]">
              <Image
                src="/4.jpg"
                alt="Creator filming content"
                width={720}
                height={540}
                priority
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            {/* Discovery timeline, overlapping the photo */}
            <div className="border-foreground shadow-hard bg-card relative -mt-[46px] ml-[clamp(0px,3vw,28px)] max-w-[340px] rounded-[22px] border-2 p-5">
              {DISCOVERY.map((d) => (
                <div key={d.title} className="flex items-start gap-3 py-[9px]">
                  <span
                    className={cn(
                      "mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full",
                      d.dot,
                    )}
                  />
                  <div>
                    <div className="font-heading text-[13.5px] leading-[1.35] font-bold">
                      {d.title}
                    </div>
                    {d.sub ? (
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {d.sub}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-foreground bg-foreground text-background animate-float absolute top-[22px] -right-3.5 rounded-full border-2 px-4 py-2.5 shadow-sticker">
              <span className="font-heading text-[12.5px] font-bold">
                You create → you get discovered
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EMOTIONAL RECOGNITION */}
      <section className={cn("bg-blush-50 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1000px]">
          <h2 className="font-heading mb-[clamp(36px,4.5vw,56px)] text-[clamp(2rem,4vw,3.2rem)] leading-[1.06] font-bold tracking-[-0.03em] text-balance">
            You became a creator to create content.
          </h2>
          <div className="font-heading text-muted-foreground mb-5 text-[15px] font-bold">
            Not to:
          </div>
          <div className="mb-[clamp(48px,6vw,76px)] flex max-w-[640px] flex-col gap-0.5">
            {NOT_TO.map((n) => (
              <div
                key={n}
                className="text-muted-foreground border-foreground/10 flex items-center gap-3.5 border-b py-[15px] text-[clamp(1rem,1.5vw,1.15rem)]"
              >
                <X
                  className="text-foreground/30 h-[15px] w-[15px] shrink-0"
                  strokeWidth={2.6}
                />
                {n}
              </div>
            ))}
          </div>
          <h2 className="font-heading text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Let {SITE_NAME} handle the discovery part.
            <br />
            <span className="text-deep-pink">You focus on creating.</span>
          </h2>
        </div>
      </section>

      {/* 3. CURRENT REALITY */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1180px]">
          <h2 className="font-heading mb-[clamp(40px,5vw,60px)] max-w-[720px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Does getting a collaboration currently look like this?
          </h2>
          <div className="mb-[clamp(44px,5vw,64px)] flex flex-wrap items-center gap-2.5">
            {REALITY.map((label, i) => (
              <div key={label} className="contents">
                {i > 0 ? (
                  <span
                    aria-hidden
                    className="border-foreground bg-blush-100 text-foreground/30 font-heading rounded-full border-2 px-5 py-3 text-sm font-semibold"
                  >
                    ↓
                  </span>
                ) : null}
                <span className="border-foreground bg-blush-100 text-muted-foreground font-heading rounded-full border-2 px-5 py-3 text-sm font-semibold">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <h2 className="font-heading max-w-[900px] text-[clamp(1.7rem,3.2vw,2.6rem)] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
            It shouldn&rsquo;t take all this just to get paid for what
            you&rsquo;re already good at.
          </h2>
        </div>
      </section>

      {/* 4. REVERSE THE PROCESS */}
      <section
        className={cn("bg-foreground text-background px-6", sectionPadY)}
      >
        <div className="mx-auto max-w-[1180px]">
          <h2 className="font-heading text-background mb-[clamp(40px,5vw,60px)] max-w-[680px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Imagine if the brand came looking for you.
          </h2>
          <div className="grid items-start gap-[clamp(28px,4vw,52px)] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-background/30 bg-background/5 rounded-[26px] border-2 p-[clamp(24px,3vw,34px)]">
              <div className="font-heading text-background/45 mb-[22px] text-[11px] font-bold tracking-[0.13em]">
                LOOKING FOR:
              </div>
              <div className="flex flex-col gap-3">
                {BRAND_SEARCH.map((s) => (
                  <div
                    key={s.label}
                    className="border-background/10 flex items-center justify-between gap-4 border-b pb-3"
                  >
                    <span className="text-background/50 text-[12.5px]">
                      {s.label}
                    </span>
                    <span className="font-heading text-sm font-bold">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-background/15 flex flex-col border-b">
              {REVERSE_FLOW.map((label, i) => {
                const last = i === REVERSE_FLOW.length - 1;
                return (
                  <div
                    key={label}
                    className="border-background/15 flex items-baseline gap-[clamp(14px,2vw,26px)] border-t py-[clamp(15px,1.9vw,22px)]"
                  >
                    <span
                      className={cn(
                        "font-heading min-w-[22px] text-xs font-bold",
                        last ? "text-blush-400" : "text-background/35",
                      )}
                    >
                      0{i + 1}
                    </span>
                    <span
                      className={cn(
                        "font-heading text-[clamp(17px,2.3vw,27px)] leading-[1.18] font-bold tracking-[-0.025em]",
                        last ? "text-lime" : "text-background/90",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <h2 className="font-heading text-blush-400 mt-[clamp(44px,5vw,68px)] text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.06] font-bold tracking-[-0.03em]">
            That&rsquo;s {SITE_NAME}.
          </h2>
        </div>
      </section>

      {/* 5. PROFILE AS STOREFRONT */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1240px]">
          <div className="grid items-end gap-[clamp(32px,4vw,56px)] lg:grid-cols-[0.85fr_1.15fr]">
            <div
              className={cn(
                hardCard,
                "bg-card mx-auto w-full max-w-[520px] overflow-hidden lg:mx-0 lg:max-w-none",
              )}
            >
              <Image
                src="/3.jpg"
                alt=""
                width={560}
                height={420}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="px-6 pt-[22px] pb-[26px]">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="font-heading text-[19px] font-bold">
                    Meher Kaur
                  </div>
                  <span className="font-heading text-muted-foreground text-[11px] font-bold">
                    ● Profile live
                  </span>
                </div>
                <div className="text-muted-foreground mb-5 text-[13px]">
                  Fashion &amp; Beauty · Delhi · 76k followers
                </div>
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {["/1.jpg", "/2.jpg", "/5.jpg"].map((src) => (
                    <Image
                      key={src}
                      src={src}
                      alt=""
                      width={180}
                      height={320}
                      className="aspect-[9/16] w-full rounded-[10px] object-cover"
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-2.5 text-[13px]">
                  {[
                    { k: "1 reel + 2 stories", v: "₹3,200" },
                    { k: "Delivery", v: "4 days" },
                    { k: "Add-ons", v: "Faster delivery, extra revision" },
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
            <h2 className="font-heading mb-[clamp(28px,3.5vw,40px)] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
              Your profile should do the pitching for you.
            </h2>
            <div className="grid gap-x-[clamp(28px,4vw,56px)] sm:grid-cols-2">
              {CALLOUTS.map((c) => (
                <div
                  key={c.title}
                  className="border-foreground/15 border-t py-[clamp(18px,2.2vw,24px)]"
                >
                  <div className="font-heading mb-[7px] text-[clamp(16px,1.7vw,19px)] font-bold">
                    {c.title}
                  </div>
                  <p className="text-muted-foreground text-[14.5px] leading-relaxed text-pretty">
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>
            <h3 className="font-heading mt-[clamp(32px,4vw,48px)] text-[clamp(1.35rem,2.4vw,2rem)] leading-[1.14] font-bold tracking-[-0.02em] text-balance">
              One profile. Everything a brand needs to decide if you&rsquo;re
              right for them.
            </h3>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CONTROL */}
      <section className={cn("bg-blush-50 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading mb-[clamp(40px,5vw,60px)] max-w-[620px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            {SITE_NAME} brings you opportunities.
            <br />
            You stay in control.
          </h2>
          <div className="border-foreground/20 mb-[clamp(48px,6vw,72px)] flex flex-col border-b">
            {CONTROL.map((c) => (
              <div
                key={c.title}
                className="border-foreground/20 grid items-baseline gap-2 border-t py-[clamp(20px,2.6vw,30px)] sm:grid-cols-[minmax(220px,0.85fr)_1fr] sm:gap-[clamp(8px,3vw,52px)]"
              >
                <div className="font-heading text-[clamp(1.45rem,2.9vw,2.2rem)] leading-[1.08] font-extrabold tracking-[-0.03em]">
                  {c.title}
                </div>
                <p className="text-muted-foreground text-[clamp(15px,1.5vw,17.5px)] leading-relaxed text-pretty">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
          <h2 className="font-heading text-[clamp(1.7rem,3.4vw,2.7rem)] leading-[1.08] font-bold tracking-[-0.03em]">
            Your work. Your price.{" "}
            <span className="text-deep-pink">Your terms.</span>
          </h2>
        </div>
      </section>

      {/* 7. BRAND ASPIRATION */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1180px]">
          <h2 className="font-heading mb-[clamp(36px,4.5vw,52px)] max-w-[820px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            The next brand looking for someone like you should be able to find
            you.
          </h2>
          <div className="border-foreground/10 mb-[clamp(32px,4vw,48px)] flex flex-wrap items-center gap-[clamp(24px,4vw,56px)] border-y py-[26px]">
            {BRAND_NAMES.map((b) => (
              <span
                key={b}
                className="font-heading text-foreground/30 text-[clamp(16px,1.8vw,20px)] font-bold tracking-[-0.02em] whitespace-nowrap"
              >
                {b}
              </span>
            ))}
          </div>
          <div className={cn(carousel, "mb-[clamp(28px,3.5vw,40px)]")}>
            {ASPIRATION_CARDS.map((c) => (
              <div
                key={c.name}
                className={cn(carouselItem, "relative overflow-hidden rounded")}
              >
                <Image
                  src={c.img}
                  alt=""
                  width={420}
                  height={560}
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(24,19,19,0.86)] to-transparent px-[15px] py-3.5 text-white">
                  <div className="font-heading text-[13.5px] font-bold">
                    {c.name}
                  </div>
                  <div className="text-[11.5px] opacity-70">{c.meta}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground max-w-[660px] text-[clamp(1rem,1.5vw,1.15rem)] text-pretty">
            Good content deserves to be discoverable beyond referrals, agencies
            and cold DMs.
          </p>
        </div>
      </section>

      {/* 8. WHO CAN JOIN */}
      <section
        className={cn("bg-foreground text-background px-6", sectionPadY)}
      >
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading text-background mb-[clamp(40px,5vw,60px)] max-w-[780px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            You don&rsquo;t need millions of followers to be valuable to a
            brand.
          </h2>
          <div
            className={cn(
              carousel,
              "mb-[clamp(40px,5vw,56px)] md:gap-[clamp(16px,2.2vw,30px)]",
            )}
          >
            {CREATOR_TYPES.map((t) => (
              <div key={t.title} className={carouselItem}>
                <Image
                  src={t.img}
                  alt=""
                  width={420}
                  height={525}
                  className="mb-[18px] aspect-[4/5] w-full rounded object-cover"
                />
                <div className="font-heading mb-2 text-[clamp(17px,1.9vw,21px)] font-bold tracking-[-0.02em]">
                  {t.title}
                </div>
                <p className="text-background/60 text-sm leading-relaxed text-pretty">
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className="border-background/30 bg-background/5 text-background/85 font-heading rounded-full border-2 px-5 py-[11px] text-sm font-semibold"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 9. HOW IT WORKS */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1240px]">
          <h2 className="font-heading mb-[clamp(40px,5vw,60px)] max-w-[660px] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Set it up once. Let your profile keep working for you.
          </h2>
          <div className="border-foreground/10 flex flex-col border-b">
            {STEPS.map((title, i) => (
              <div
                key={title}
                className="border-foreground/10 grid grid-cols-[76px_1fr] items-center gap-[clamp(16px,3vw,40px)] border-t py-[22px]"
              >
                <div className="font-heading text-deep-pink text-[clamp(17px,2vw,22px)] font-bold">
                  0{i + 1}
                </div>
                <div className="font-heading text-[clamp(1.15rem,2.2vw,1.7rem)] leading-[1.2] font-bold tracking-[-0.02em]">
                  {title}
                </div>
              </div>
            ))}
          </div>
          <h3 className="font-heading mt-[clamp(40px,5vw,60px)] text-[clamp(1.5rem,2.8vw,2.2rem)] leading-[1.1] font-bold tracking-[-0.02em]">
            Less time pitching. More time creating.
          </h3>
        </div>
      </section>

      {/* 10. WHY JOIN NOW */}
      <section className={cn("bg-blush-100 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[1000px] text-center">
          <h2 className="font-heading mb-6 text-[clamp(1.8rem,3.6vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
            Every brand search you&rsquo;re not part of is an opportunity you
            can&rsquo;t be considered for.
          </h2>
          <p className="text-muted-foreground mb-[30px] text-[clamp(1rem,1.4vw,1.15rem)]">
            You can&rsquo;t control whether every brand chooses you.
          </p>
          <h3 className="font-heading text-deep-pink mb-[38px] text-[clamp(1.4rem,2.8vw,2.2rem)] leading-[1.12] font-bold tracking-[-0.02em] text-balance">
            But you can make sure you&rsquo;re there when they search.
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
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
              href="/register/creator"
              className={cn(pinkCta, "px-8 py-[17px] text-[15.5px] font-bold")}
            >
              Make My Profile Discoverable
            </PillButton>
          </div>
        </div>
      </section>

      {/* 11. TESTIMONIALS */}
      <section className={cn("px-6", sectionPadY)}>
        <div className="mx-auto grid max-w-[1240px] gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className={cn(
                hardCard,
                "bg-card flex flex-col rounded-[26px] p-[clamp(26px,3vw,36px)]",
              )}
            >
              <div className="font-heading mb-[26px] text-[clamp(1.05rem,1.6vw,1.25rem)] leading-[1.38] font-bold text-pretty">
                &ldquo;{t.quote}&rdquo;
              </div>
              <div className="mt-auto flex items-center gap-3">
                <Image
                  src={t.img}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="font-heading text-[13.5px] font-bold">
                    {t.name}
                  </div>
                  <div className="text-muted-foreground text-xs">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 12. FAQ */}
      <section className={cn("bg-blush-50 px-6", sectionPadY)}>
        <div className="mx-auto max-w-[880px]">
          <h2 className="font-heading mb-[clamp(36px,4.5vw,52px)] text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-bold tracking-[-0.03em]">
            Creator questions, answered.
          </h2>
          <div className="flex flex-col gap-3">
            {CREATOR_FAQS.map((f, i) => {
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
                      aria-controls={`creator-faq-${i}`}
                      className="font-heading flex w-full cursor-pointer items-center justify-between gap-[18px] px-[26px] py-[21px] text-left text-base font-bold"
                    >
                      {f.q}
                      <span
                        className={cn(
                          "bg-pink/12 inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full transition-transform duration-200",
                          open && "rotate-180",
                        )}
                      >
                        <ChevronDown
                          className="text-deep-pink h-3 w-3"
                          strokeWidth={3}
                        />
                      </span>
                    </button>
                  </h3>
                  {open ? (
                    <p
                      id={`creator-faq-${i}`}
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
      <section
        id="final"
        className="px-6 pt-[clamp(84px,11vw,152px)] pb-[clamp(84px,10vw,140px)]"
      >
        <div className="border-foreground shadow-hard bg-foreground text-background mx-auto grid max-w-[1180px] items-stretch overflow-hidden rounded-[36px] border-2 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-[clamp(34px,5vw,68px)]">
            <h2 className="font-heading text-background mb-[22px] text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance">
              You keep creating.
              <br />
              We&rsquo;ll make it easier to get discovered.
            </h2>
            <p className="text-background/70 mb-[34px] max-w-[460px] text-[clamp(1rem,1.4vw,1.15rem)] text-pretty">
              Your next collaboration might come from a brand that doesn&rsquo;t
              even know you yet.
            </p>
            <PillButton
              href="/register/creator"
              className="bg-background text-foreground hover:bg-background/90 px-8 py-[18px] text-[15.5px] font-bold"
            >
              Create Your {SITE_NAME} Profile — Free
            </PillButton>
            <div className="text-background/55 mt-5 text-[13px]">
              It costs nothing to be discoverable.
            </div>
          </div>
          <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[280px]">
            <Image
              src="/1.jpg"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-[50%_18%] opacity-90"
            />
          </div>
        </div>
      </section>

      {/* Sticky mobile CTA */}
      <div className="h-[84px] md:hidden" aria-hidden />
      <div className="border-foreground bg-background/90 fixed inset-x-0 bottom-0 z-90 flex gap-2.5 border-t-2 px-3.5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[14px] md:hidden">
        <PillButton
          href="/register/creator"
          className="bg-deep-pink hover:bg-deep-pink text-white border-foreground w-full border-2 py-3.5 text-sm font-bold"
        >
          Create My Profile — Free
        </PillButton>
      </div>
    </div>
  );
}
