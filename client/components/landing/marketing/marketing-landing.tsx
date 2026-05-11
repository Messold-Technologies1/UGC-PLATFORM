"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Search,
  Sparkles,
  ShieldCheck,
  Wallet,
  Rocket,
  BadgeCheck,
  Star,
  Filter,
  ChevronDown,
  Play,
  ArrowRight,
  FileVideo,
  MessageSquare,
  Heart,
  Box,
  Smile,
  Lightbulb,
  Repeat,
  Mic,
  Hash,
  Plus,
  Minus,
  ShieldHalf,
  FileText,
  CreditCard,
  Send,
} from "lucide-react";
import {
  AudienceCard,
  AgenciesVisual,
  BrandsVisual,
  CreatorsVisual,
} from "@/components/landing/marketing/audience-cards";
import { CreatorCard } from "@/components/landing/marketing/creator-card";
import { CreatorNiche } from "@/components/landing/marketing/creator-niche";
import {
  marketingShell,
  marketingSectionPadY,
} from "@/components/landing/marketing/marketing-layout";
import { MARKETING_CREATOR_IMAGES } from "@/components/landing/marketing/marketing-creator-images";
import { PillButton } from "@/components/landing/marketing/pill-button";
import { Sticker } from "@/components/landing/marketing/sticker";
import { SITE_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

type Accent = "lime" | "pink" | "sky" | "grape";

const ACCENT_BG: Record<Accent, string> = {
  lime: "bg-lime",
  pink: "bg-pink",
  sky: "bg-sky",
  grape: "bg-grape",
};

const creators = [
  {
    image: MARKETING_CREATOR_IMAGES.skincare,
    name: "Aanya Kapoor",
    niches: ["Skincare", "Beauty", "Lifestyle"],
    location: "Mumbai",
    price: "₹4,500",
    rating: 4.9,
    delivery: "Delivers in 5 days",
    badge: { tone: "lime" as const, label: "Verified" },
  },
  {
    image: MARKETING_CREATOR_IMAGES.fashion,
    name: "Kartikay Gupta",
    niches: ["Fashion", "Streetwear", "Men's"],
    location: "Delhi",
    price: "₹7,000",
    rating: 4.8,
    delivery: "Delivers in 6 days",
    badge: { tone: "pink" as const, label: "Hot Creator" },
  },
  {
    image: MARKETING_CREATOR_IMAGES.food,
    name: "Meher Singh",
    niches: ["Food", "Recipes", "D2C"],
    location: "Bangalore",
    price: "₹999",
    rating: 5.0,
    delivery: "Delivers in 4 days",
    badge: { tone: "sky" as const, label: "Ad Ready" },
  },
  {
    image: MARKETING_CREATOR_IMAGES.fitness,
    name: "Rohan Verma",
    niches: ["Fitness", "Wellness", "Nutrition"],
    location: "Pune",
    price: "₹6,200",
    rating: 4.7,
    delivery: "Delivers in 7 days",
    badge: { tone: "lime" as const, label: "Refund Safe" },
  },
  {
    image: MARKETING_CREATOR_IMAGES.tech,
    name: "Ishita Rao",
    niches: ["Tech", "Gadgets", "Unboxing"],
    location: "Hyderabad",
    price: "₹8,500",
    rating: 4.9,
    delivery: "Delivers in 5 days",
    badge: { tone: "grape" as const, label: "Featured" },
  },
  {
    image: MARKETING_CREATOR_IMAGES.beauty,
    name: "Priya Nair",
    niches: ["Beauty", "Makeup", "GRWM"],
    location: "Kochi",
    price: "₹5,000",
    rating: 4.8,
    delivery: "Delivers in 6 days",
    badge: { tone: "pink" as const, label: "Niche Match" },
  },
];

const stats = [
  { v: "★", l: "Trusted by growing brands" },
  { v: "⚡", l: "Fast turnaround" },
  { v: "₹", l: "Clear pricing" },
  { v: "90%", l: "Satisfaction rate" },
];

const problems = [
  {
    title: "Too Expensive",
    body: "Influencers charge premium rates, even when you only need content — not reach.",
    tone: "pink" as const,
  },
  {
    title: "Too Risky",
    body: "You pay upfront and just hope the creator delivers what was promised.",
    tone: "lime" as const,
  },
  {
    title: "Too Random",
    body: "Finding creators who actually fit your niche, tone, and audience takes forever.",
    tone: "sky" as const,
  },
  {
    title: "Too Slow",
    body: "Briefs, follow-ups, revisions, payments — messy without one proper system.",
    tone: "grape" as const,
  },
];

const benefits = [
  {
    icon: Search,
    title: "Fast Creator Discovery",
    body: "Find creators by niche, budget, location, language, and vibe.",
    badge: "No scrolling for hours",
    tone: "sky" as Accent,
  },
  {
    icon: Wallet,
    title: "Secure Payments",
    body: "Your payment stays protected until the agreed content is delivered.",
    badge: "Brand-safe",
    tone: "lime" as Accent,
  },
  {
    icon: ShieldCheck,
    title: "Refund Support",
    body: `If content isn't delivered as agreed, ${SITE_NAME} helps protect your order.`,
    badge: "Less risk",
    tone: "pink" as Accent,
  },
  {
    icon: BadgeCheck,
    title: "Verified Portfolios",
    body: "Watch sample videos, check rates and niches before you book.",
    badge: "Quality check",
    tone: "grape" as Accent,
  },
  {
    icon: Sparkles,
    title: "Affordable UGC",
    body: "Get content without paying influencer-level rates.",
    badge: "Budget friendly",
    tone: "lime" as Accent,
  },
  {
    icon: Rocket,
    title: "Ad-Ready Content",
    body: "Use videos for Meta ads, Reels, Shorts, landing pages, and product pages.",
    badge: "Ready to test",
    tone: "sky" as Accent,
  },
];

const steps = [
  {
    n: "1",
    title: "Browse Creators",
    body: "Search by niche, pricing, language, and content style.",
    tone: "lime" as Accent,
  },
  {
    n: "2",
    title: "Pick Your Match",
    body: "Check portfolios, sample videos, ratings and details.",
    tone: "pink" as Accent,
  },
  {
    n: "3",
    title: "Share Your Brief",
    body: "Tell them what you need: demo, review, unboxing, or ad.",
    tone: "sky" as Accent,
  },
  {
    n: "4",
    title: "Pay Securely",
    body: "Your payment is protected while the creator creates.",
    tone: "grape" as Accent,
  },
  {
    n: "5",
    title: "Get Your UGC",
    body: "Receive brand-ready videos. Refund support if it goes wrong.",
    tone: "lime" as Accent,
  },
];

const contentTypes = [
  { icon: Box, label: "Product Demos", body: "Show your product in action." },
  {
    icon: Smile,
    label: "Unboxing",
    body: "First-impression magic, naturally.",
  },
  {
    icon: MessageSquare,
    label: "Testimonials",
    body: "Creator-led reviews that build trust.",
  },
  {
    icon: Heart,
    label: "Lifestyle Reels",
    body: "Make your product feel relatable.",
  },
  {
    icon: Lightbulb,
    label: "Problem-Solution Ads",
    body: "Built for performance marketing.",
  },
  {
    icon: Repeat,
    label: "Before / After",
    body: "Skincare, fitness, wellness, home.",
  },
  {
    icon: Mic,
    label: "Voiceover Videos",
    body: "Clear storytelling that converts.",
  },
  {
    icon: Hash,
    label: "Trend Reels",
    body: "Native to Instagram, Shorts & TikTok.",
  },
];

const testimonials = [
  {
    quote: `${SITE_NAME} helped us find creators without spending days in Instagram DMs.`,
    who: "Founder, Skincare Brand",
    tone: "lime" as Accent,
  },
  {
    quote: "We got 5 UGC videos for the cost of one influencer post.",
    who: "Marketing Lead, Fashion Brand",
    tone: "pink" as Accent,
  },
  {
    quote:
      "The refund-safe process made us comfortable trying creators for the first time.",
    who: "D2C Brand Owner",
    tone: "sky" as Accent,
  },
];

const MARKETING_FAQS = [
  {
    q: `What is ${SITE_NAME}?`,
    a: `${SITE_NAME} is a UGC creator marketplace where brands discover creators and creators get listed for paid content opportunities — without the DM chaos.`,
  },
  {
    q: "Is this for influencer marketing or UGC content?",
    a: `${SITE_NAME} is focused on UGC. Brands hire creators mainly to create videos and photos — they don't necessarily post on their own profiles.`,
  },
  {
    q: `Can small brands use ${SITE_NAME}?`,
    a: `Yes. ${SITE_NAME} is especially useful for new and growing brands that need affordable, good-quality content for ads, reels, websites and product pages.`,
  },
  {
    q: "What happens if a creator does not deliver?",
    a: `If the creator doesn't deliver per the agreed brief, brands can request support and may be eligible for a refund based on the case.`,
  },
  {
    q: "Can creators from any niche join?",
    a: "Yes. Creators from fashion, beauty, food, fitness, tech, lifestyle, parenting, travel, wellness, home and more can list themselves.",
  },
  {
    q: "Can brands use the videos for ads?",
    a: "Yes — if usage rights are agreed during the collaboration. Just mention it clearly in the brief or order terms.",
  },
];

export function MarketingLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const heroTiny = [
    MARKETING_CREATOR_IMAGES.skincare,
    MARKETING_CREATOR_IMAGES.fashion,
    MARKETING_CREATOR_IMAGES.food,
    MARKETING_CREATOR_IMAGES.beauty,
  ];

  return (
    <div className="text-foreground bg-background overflow-x-clip">
      {/* HERO */}
      <section className="relative">
        <div className="bg-grain pointer-events-none absolute inset-0" />
        {/* blobs */}
        <div className="bg-pink/20 absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl pointer-events-none" />
        <div className="bg-sky/20 pointer-events-none absolute top-40 -right-24 h-[480px] w-[480px] rounded-full blur-3xl" />

        <div
          className={`${marketingShell} relative grid items-center gap-12 pt-12 pb-20 lg:grid-cols-2 lg:gap-8 lg:pt-20 lg:pb-32`}
        >
          {/* Left */}
          <div className="space-y-7">
            <Sticker tone="lime">
              ✦ Find creators. Place an order. Get content. No negotiation. No
              delays.
            </Sticker>
            <h1 className="font-heading text-5xl leading-[1.02] font-bold tracking-tighter text-balance sm:text-6xl lg:text-7xl">
              UGC creators for brands that want content{" "}
              <span className="relative inline-block">
                <span className="relative z-10">without the chaos.</span>
                <span className="bg-lime/80 absolute inset-x-0 bottom-1 -z-0 h-3 -rotate-1 rounded-sm lg:h-5" />
              </span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg text-balance">
              Find affordable, niche-perfect creators, check their work, book
              safely, and get videos made for ads, reels, websites and product
              pages.
            </p>
            <div className="flex flex-wrap gap-3">
              <PillButton variant="primary" arrow href="/brand/creators">
                Find Creators
              </PillButton>
              <PillButton variant="lime" arrow href="/signup">
                Join as Creator
              </PillButton>
            </div>
            <div className="flex items-center gap-5 pt-2">
              <div className="-space-x-2 flex">
                {heroTiny.map((src) => (
                  <Image
                    key={src}
                    src={src}
                    alt=""
                    width={36}
                    height={36}
                    className="border-background h-9 w-9 rounded-full border-2 object-cover"
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-semibold">
                  10,000+ creators
                </span>{" "}
                trusted by new-age brands
              </p>
            </div>
          </div>

          {/* Right collage */}
          <div className="relative h-[520px] lg:h-[600px]">
            <div className="animate-float absolute top-0 left-4 w-[44%] rotate-[-6deg] [--tw-rotate:-6deg]">
              <div className="border-foreground shadow-hard bg-card overflow-hidden rounded-2xl border-2">
                <Image
                  src={MARKETING_CREATOR_IMAGES.skincare}
                  alt="Skincare creator"
                  width={512}
                  height={704}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <div className="absolute -top-3 -left-3">
                <Sticker tone="lime" rotate={-8}>
                  Verified
                </Sticker>
              </div>
            </div>
            <div className="animate-float-delayed absolute top-12 right-0 w-[46%] rotate-[5deg] [--tw-rotate:5deg]">
              <div className="border-foreground shadow-hard bg-card overflow-hidden rounded-2xl border-2">
                <Image
                  src={MARKETING_CREATOR_IMAGES.fashion}
                  alt="Fashion creator"
                  width={512}
                  height={704}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <div className="absolute -top-3 -right-3">
                <Sticker tone="pink" rotate={6}>
                  Hot Creator
                </Sticker>
              </div>
            </div>
            <div className="animate-float-delayed absolute bottom-0 left-0 w-[44%] rotate-[4deg] [--tw-rotate:4deg]">
              <div className="border-foreground shadow-hard bg-card overflow-hidden rounded-2xl border-2">
                <Image
                  src={MARKETING_CREATOR_IMAGES.food}
                  alt="Food creator"
                  width={512}
                  height={704}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 -left-3">
                <Sticker tone="sky" rotate={-6}>
                  From ₹999
                </Sticker>
              </div>
            </div>
            <div className="animate-float absolute right-6 bottom-8 w-[42%] rotate-[-5deg] [--tw-rotate:-5deg]">
              <div className="border-foreground shadow-hard bg-card overflow-hidden rounded-2xl border-2">
                <Image
                  src={MARKETING_CREATOR_IMAGES.tech}
                  alt="Tech creator"
                  width={512}
                  height={704}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <div className="absolute -right-3 -bottom-3">
                <Sticker tone="grape" rotate={8}>
                  Ad Ready
                </Sticker>
              </div>
            </div>
            {/* center play */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="border-background shadow-hard bg-foreground text-background flex h-16 w-16 items-center justify-center rounded-full border-4">
                <Play className="fill-background ml-0.5 h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className={`${marketingShell} pb-16`}>
          <div className="border-foreground bg-foreground text-background grid grid-cols-2 gap-4 rounded-3xl border-2 p-6 sm:grid-cols-4 sm:gap-6 sm:p-8">
            {stats.map((s) => (
              <div key={s.l} className="text-center sm:text-left">
                <div className="font-heading text-lime text-2xl font-bold sm:text-3xl">
                  {s.v}
                </div>
                <div className="mt-1 text-sm font-medium text-background/85 sm:text-base">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="bg-secondary/60">
        <div className={`${marketingShell} ${marketingSectionPadY}`}>
          <div className="max-w-3xl">
            <Sticker tone="pink">The Problem</Sticker>
            <h2 className="font-heading mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Finding good UGC shouldn&apos;t feel like a full-time job.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg text-balance">
              Most brands waste hours scrolling Instagram, DMing creators,
              negotiating rates, waiting for replies — and still end up unsure
              if the final video will be usable.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((p) => (
              <div
                key={p.title}
                className="border-foreground/90 bg-card hover:-translate-y-1 rounded-3xl border-2 p-6 shadow-pop transition-transform"
              >
                <Sticker tone={p.tone}>{p.title}</Sticker>
                <p className="mt-4 leading-relaxed text-foreground/80">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="why" className="bg-background">
        <div className={`${marketingShell} ${marketingSectionPadY}`}>
          <div className="mx-auto max-w-3xl text-center">
            <Sticker tone="lime">Why {SITE_NAME}</Sticker>
            <h2 className="font-heading mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Everything you need to scale UGC. Nothing you don&apos;t.
            </h2>
            <p className="mt-5 text-lg text-foreground/65 text-balance">
              From discovery to delivery, {SITE_NAME} keeps your creator
              collaborations simple, safe, and sorted.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, body, badge, tone }) => (
              <div
                key={title}
                className="group hover:-translate-y-1 relative rounded-[28px] bg-secondary/60 p-7 transition-all lg:p-8"
              >
                <div
                  className={cn(
                    "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                    ACCENT_BG[tone],
                  )}
                >
                  <Icon className="text-foreground h-6 w-6" />
                </div>
                <h3 className="font-heading mt-5 text-xl font-bold tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 leading-relaxed text-foreground/65">
                  {body}
                </p>
                <div className="border-foreground/10 bg-card text-foreground/70 mt-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
                  ✦ {badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED CREATORS */}
      <section id="featured" className="border-border bg-secondary/50 border-y">
        <div className={`${marketingShell} ${marketingSectionPadY}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Sticker tone="sky">Featured Creators</Sticker>
              <h2 className="font-heading mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Creators your brand can actually use.
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                Strong content quality, clear pricing, and niche-specific
                experience.
              </p>
            </div>
            <PillButton variant="primary" arrow href="/brand/creators">
              Browse All Creators
            </PillButton>
          </div>

          {/* Filter bar */}
          <div className="border-foreground shadow-pop bg-card mt-10 flex flex-col items-stretch gap-2 rounded-2xl border-2 p-3 md:flex-row">
            <div className="flex flex-1 items-center gap-2 px-3">
              <Search className="text-muted-foreground h-4 w-4" />
              <input
                type="search"
                name="creator-search-placeholder"
                readOnly
                placeholder="Search creators by name, niche or vibe..."
                className="placeholder:text-muted-foreground w-full bg-transparent py-2 text-sm outline-none"
                aria-label="Search creators (browse to use filters)"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["Niche", "Budget", "Location", "Language", "Content Type"].map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    className="bg-secondary hover:bg-secondary/70 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium"
                  >
                    <Filter className="h-3.5 w-3.5" /> {f}{" "}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                ),
              )}
              <button
                type="button"
                className="bg-foreground inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-background"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c) => (
              <CreatorCard key={c.name} {...c} />
            ))}
          </div>
        </div>
      </section>

      {/* CREATOR NICHE SHOWCASE */}
      <CreatorNiche />

      {/* HOW IT WORKS */}
      <section
        id="how"
        className={`${marketingShell} ${marketingSectionPadY}`}
      >
        <div className="mx-auto max-w-2xl text-center">
          <Sticker tone="lime">How It Works</Sticker>
          <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
            Book UGC in 5 simple steps.
          </h2>
          <p className="text-muted-foreground mt-3 text-base">
            From creator search to final video — all in one flow.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="border-foreground/90 shadow-pop bg-card h-full rounded-3xl border-2 p-6">
                <div
                  className={cn(
                    "border-foreground font-heading inline-flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl font-bold",
                    ACCENT_BG[s.tone],
                  )}
                >
                  {s.n}
                </div>
                <h3 className="font-heading mt-4 text-lg font-bold">
                  {s.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">{s.body}</p>
              </div>
              {i < steps.length - 1 ? (
                <ArrowRight className="text-foreground/40 absolute top-1/2 -right-3 hidden h-6 w-6 -translate-y-1/2 lg:block" />
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <PillButton variant="primary" arrow href="/signup">
            Start Hiring Creators
          </PillButton>
        </div>
      </section>

      {/* AUDIENCE SECTION — Brands / Creators / Agencies */}
      <section id="audiences" className="bg-background">
        <div className={`${marketingShell} ${marketingSectionPadY}`}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
              UGC Built for Every Side of the Collaboration
            </h2>
            <p className="mt-3 text-base text-foreground/65 text-balance">
              For creators, brands, and agencies who want content that feels
              real, moves fast, and keeps collaborations simple.
            </p>
          </div>

          <div className="mt-10 space-y-6 lg:mt-12 lg:space-y-8">
            {/* For Brands */}
            <AudienceCard
              tone="grape"
              cardBg="bg-secondary/70"
              label="For brands"
              category="UGC for growing businesses"
              heading="Affordable UGC for Growing Brands"
              paragraph="Find creators who match your niche, product, budget, and content style. Get brand-ready videos for ads, reels, websites, and product pages without paying influencer-level rates."
              cta="Find creators"
              ctaHref="/brand/creators"
              benefits={[
                {
                  title: "Budget-friendly content",
                  body: "Get quality UGC without burning your marketing budget.",
                },
                {
                  title: "Creators from every niche",
                  body: "Fashion, beauty, food, fitness, tech, wellness, home, parenting, travel, and more.",
                },
                {
                  title: "Safer collaborations",
                  body: "Secure payments and refund support help protect your brand if content is not delivered as agreed.",
                },
                {
                  title: "Ad-ready videos",
                  body: "Use creator content for Meta ads, Reels, websites, product pages, and launches.",
                },
              ]}
              steps={[
                {
                  title: "Browse creators",
                  body: "Search by niche, budget, language, and content style.",
                },
                {
                  title: "Share your brief",
                  body: "Tell the creator what content you need and how it will be used.",
                },
                {
                  title: "Receive UGC",
                  body: "Get videos ready for ads, reels, websites, and product pages.",
                },
              ]}
              visual={<BrandsVisual />}
            />

            {/* For Creators (visual on left for rhythm) */}
            <AudienceCard
              tone="lime"
              cardBg="bg-secondary/70"
              reverse
              label="For creators"
              category="Get discovered, booked, and paid"
              heading="Get Discovered by Brands That Need Your Content"
              paragraph="Create your profile, showcase your best videos, set your starting price, and get found by brands looking for real, relatable UGC creators."
              cta="Join as creator"
              ctaHref="/signup"
              benefits={[
                {
                  title: "No more DM chasing",
                  body: "Let brands discover your profile instead of cold messaging every day.",
                },
                {
                  title: "Showcase your portfolio",
                  body: "Upload your best UGC videos, content categories, niches, languages, and pricing.",
                },
                {
                  title: "Work with better-fit brands",
                  body: "Get collaboration requests from brands that match your vibe, niche, and creative style.",
                },
                {
                  title: "Safer paid projects",
                  body: "Clear deliverables and secure payment support help you work with more confidence.",
                },
              ]}
              steps={[
                {
                  title: "Create profile",
                  body: "Add your niche, portfolio, pricing, languages, and services.",
                },
                {
                  title: "Get discovered",
                  body: "Brands browse your profile and send collaboration requests.",
                },
                {
                  title: "Deliver content",
                  body: "Create the approved UGC, submit it, and get paid safely.",
                },
              ]}
              visual={<CreatorsVisual />}
            />

            {/* For Agencies */}
            <AudienceCard
              tone="sky"
              cardBg="bg-secondary/70"
              label="For agencies"
              category="Scale UGC across clients"
              heading="Scale UGC for Multiple Clients Without Creator Hunting"
              paragraph="Source niche-specific creators for client campaigns, ad creatives, product launches, reels, and monthly content needs without wasting hours on manual outreach."
              cta="Explore agency solutions"
              ctaHref="/contact"
              benefits={[
                {
                  title: "Faster creator sourcing",
                  body: "Find creators for different client niches without endless Instagram searching or DM follow-ups.",
                },
                {
                  title: "More creative variations",
                  body: "Test multiple creators, hooks, scripts, tones, and video formats for each client campaign.",
                },
                {
                  title: "Better content pipeline",
                  body: "Keep clients supplied with fresh UGC for ads, reels, launches, and social calendars.",
                },
                {
                  title: "Protect client budgets",
                  body: "Use affordable creators, clear deliverables, and secure payment support to reduce campaign risk.",
                },
              ]}
              steps={[
                {
                  title: "Search by client need",
                  body: "Find creators based on niche, content style, budget, and campaign goal.",
                },
                {
                  title: "Build creator roster",
                  body: "Shortlist multiple creators for each client campaign or monthly content plan.",
                },
                {
                  title: "Test and scale",
                  body: "Use delivered content in campaigns and reorder from winning creators.",
                },
              ]}
              visual={<AgenciesVisual />}
            />
          </div>
        </div>
      </section>

      {/* TRUST / SAFETY */}
      <section className="border-border bg-secondary/60 border-y">
        <div
          className={`${marketingShell} ${marketingSectionPadY} grid items-center gap-10 lg:grid-cols-2`}
        >
          <div>
            <Sticker tone="lime">Trust & Safety</Sticker>
            <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
              Brand-safe bookings. Creator-safe payments.
            </h2>
            <p className="text-muted-foreground mt-3 text-base text-balance">
              {SITE_NAME} keeps collaborations clear from the start. Brands know
              what they&apos;re getting. Creators know what they&apos;re
              delivering.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: FileText,
                  title: "Clear Briefs",
                  body: "Both sides agree on deliverables before work starts.",
                },
                {
                  icon: ShieldHalf,
                  title: "Secure Payment",
                  body: "Payment is handled safely through the platform.",
                },
                {
                  icon: ShieldCheck,
                  title: "Refund Support",
                  body: `Help if a creator doesn't deliver as agreed.`,
                },
                {
                  icon: BadgeCheck,
                  title: "Creator Transparency",
                  body: "Check portfolios, rates and samples before booking.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="border-foreground/10 bg-card rounded-2xl border p-4"
                >
                  <Icon className="text-foreground h-5 w-5" />
                  <h4 className="mt-3 font-bold">{title}</h4>
                  <p className="text-muted-foreground mt-1 text-sm">{body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mock dashboard */}
          <div className="relative">
            <div className="border-foreground shadow-hard bg-card rounded-3xl border-2 p-6">
              <div className="border-border flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-muted-foreground text-xs">Order #C-1042</p>
                  <h4 className="font-heading text-lg font-bold">
                    Skincare Brand × Aanya K.
                  </h4>
                </div>
                <Sticker tone="lime">In Progress</Sticker>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  {
                    i: FileText,
                    k: "Project Brief",
                    v: "Approved",
                    tone: "bg-lime",
                  },
                  {
                    i: CreditCard,
                    k: "Payment",
                    v: "Protected",
                    tone: "bg-sky",
                  },
                  {
                    i: BadgeCheck,
                    k: "Creator",
                    v: "Verified",
                    tone: "bg-grape text-background",
                  },
                  {
                    i: FileVideo,
                    k: "Delivery",
                    v: "Day 3 of 5",
                    tone: "bg-pink text-background",
                  },
                  {
                    i: ShieldCheck,
                    k: "Refund Support",
                    v: "Available",
                    tone: "bg-secondary",
                  },
                ].map(({ i: Icon, k, v, tone }) => (
                  <div
                    key={k}
                    className="border-border bg-background flex items-center justify-between rounded-2xl border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-lg">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{k}</span>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold border border-foreground/20 ${tone}`}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="bg-foreground mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-background"
              >
                <Send className="h-4 w-4" /> Message Creator
              </button>
            </div>
            <div className="absolute -top-4 -left-4 rotate-[-8deg]">
              <Sticker tone="lime">Pay Safe</Sticker>
            </div>
            <div className="absolute -bottom-4 -right-4 rotate-[6deg]">
              <Sticker tone="pink">Refund Safe</Sticker>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT TYPES */}
      <section className="bg-foreground text-background relative overflow-hidden">
        <div className="bg-grain absolute inset-0 opacity-30" />
        <div className={`${marketingShell} relative ${marketingSectionPadY}`}>
          <div className="max-w-2xl">
            <Sticker tone="lime">Content Library</Sticker>
            <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
              Pick the content type. Find the creator. Get it made.
            </h2>
            <p className="mt-3 text-base text-background/70">
              One platform. Every type of UGC your brand needs.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {contentTypes.map(({ icon: Icon, label, body }) => (
              <div
                key={label}
                className="hover:bg-background/10 rounded-3xl border-2 border-background/15 bg-background/5 p-5 transition-colors"
              >
                <div className="bg-lime text-foreground flex h-11 w-11 items-center justify-center rounded-2xl">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading mt-4 text-lg font-bold">{label}</h3>
                <p className="mt-2 text-sm text-background/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className={`${marketingShell} ${marketingSectionPadY}`}>
        <div className="max-w-3xl">
          <Sticker tone="grape">Loved by Brands</Sticker>
          <h2 className="font-heading mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Built for brands that need content every month.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="border-foreground/90 shadow-pop rounded-3xl border-2 p-7"
            >
              <div className="flex gap-0.5 text-foreground">
                {Array.from({ length: 5 }).map((__, j) => (
                  <Star key={j} className="fill-foreground h-4 w-4" />
                ))}
              </div>
              <p className="font-heading mt-5 text-xl leading-snug text-balance">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="border-border mt-5 flex items-center gap-3 border-t pt-4">
                <div
                  className={`h-9 w-9 rounded-full border-2 border-foreground ${ACCENT_BG[t.tone]}`}
                />
                <p className="text-sm font-semibold">{t.who}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section id="pricing" className={`${marketingShell} ${marketingSectionPadY}`}>
        <div className="shadow-hard grid items-center gap-6 rounded-[2rem] border-2 border-foreground bg-lime p-8 md:grid-cols-[1fr_auto] lg:p-12">
          <div>
            <Sticker tone="dark">Pricing</Sticker>
            <h3 className="font-heading mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              UGC that fits your budget. From ₹999.
            </h3>
            <p className="text-foreground/80 mt-3 max-w-2xl">
              Whether you need one simple reel or a full batch of ad creatives,
              find creators across every price range — without spending
              influencer-level money.
            </p>
          </div>
          <PillButton variant="primary" arrow href="/brand/creators">
            Explore Creator Pricing
          </PillButton>
        </div>
      </section>

      {/* FAQ */}
      <section id="faqs" className={`${marketingShell} ${marketingSectionPadY}`}>
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <Sticker tone="pink">FAQs</Sticker>
            <h2 className="font-heading mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Questions brands and creators usually ask.
            </h2>
            <p className="text-muted-foreground mt-4">
              Can&apos;t find what you&apos;re looking for? Reach out anytime.
            </p>
          </div>
          <div className="space-y-3">
            {MARKETING_FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={f.q}
                  className="border-foreground/90 bg-card overflow-hidden rounded-2xl border-2"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="font-heading text-lg font-bold">
                      {f.q}
                    </span>
                    {open ? (
                      <Minus className="h-5 w-5 shrink-0" />
                    ) : (
                      <Plus className="h-5 w-5 shrink-0" />
                    )}
                  </button>
                  {open ? (
                    <div className="text-muted-foreground px-5 pb-5">{f.a}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={`${marketingShell} ${marketingSectionPadY}`}>
        <div className="border-foreground bg-foreground relative overflow-hidden rounded-[2rem] border-2 p-10 text-background lg:p-16">
          <div className="absolute -top-16 -right-16 h-72 w-72 rounded-full bg-pink/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-sky/20 blur-3xl" />
          <div className="absolute top-8 right-8 hidden rotate-[8deg] md:block">
            <Sticker tone="lime">No DM Drama</Sticker>
          </div>
          <div className="absolute bottom-8 left-8 hidden rotate-[-6deg] md:block">
            <Sticker tone="pink">Ad-Ready UGC</Sticker>
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            <Sticker tone="lime">Ready when you are</Sticker>
            <h2 className="font-heading mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Ready to make your brand look more real online?
            </h2>
            <p className="mt-5 text-lg text-background/75 text-balance">
              Join {SITE_NAME} and connect with creators who can make your brand
              look more trusted, more active, and more scroll-worthy.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <PillButton variant="lime" arrow href="/signup">
                Start for Free
              </PillButton>
              <PillButton
                variant="secondary"
                arrow
                href="/brand/creators"
                className="border-background hover:bg-background text-background bg-transparent hover:text-foreground"
              >
                Browse Creators
              </PillButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
