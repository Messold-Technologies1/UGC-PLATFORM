"use client";

import { Fragment, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Film,
  Megaphone,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PillButton } from "@/components/landing/marketing/pill-button";
import { Sticker } from "@/components/landing/marketing/sticker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SITE_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

const SPOTLIGHT_EMAIL = "support@gocollab.io";
const SPOTLIGHT_CTA_ENABLED = false;
const SPOTLIGHT_MAILTO = `mailto:${SPOTLIGHT_EMAIL}?subject=${encodeURIComponent("Creator Spotlight Program — I'm interested")}`;

const MARQUEE_ITEMS = [
  `STAR IN ${SITE_NAME.toUpperCase()} ADS`,
  "REELS.WEBSITE.LANDING PAGES",
  "GET FEATURED IN OUR META ADS",
  "BE DISCOVERED BY BRANDS",
  "SELECTED CREATORS ONLY",
  "NOW ACCEPTING SPOTLIGHT VIDEOS",
] as const;

const VIDEO_TOPICS = [
  "How hard it is for creators to find genuine brand collaborations",
  "Why a platform like GoCollab is useful",
  "Your experience using GoCollab",
  "Why brands should discover creators through GoCollab",
] as const;

const VIDEO_GUIDELINES = [
  "Vertical 9:16 · 1080 × 1920",
  "Good lighting & clear audio",
  "No copyrighted music",
  "Natural speaking style — don't over-edit",
] as const;

const USAGE_RIGHTS = [
  "Run paid advertisements",
  "Post on social media",
  "Use on the website",
  "Edit the video for different ad formats",
  "Use the content for future marketing campaigns",
] as const;

const CHANNELS = ["Meta Ads", "Instagram Reels", "Website", "Landing Pages", "Social Media"] as const;

const HOOK_STATS = [
  {
    value: "30–60s",
    label: "One real video",
    sub: "Vertical · shot on your phone",
  },
  {
    value: "→ You",
    label: "Profile gets the traffic",
    sub: "Brands land on your page, not ours",
  },
  {
    value: "Meta+",
    label: "We fund the reach",
    sub: "Ads, Reels, site & landing pages",
  },
  {
    value: "Invite",
    label: "Hand-picked creators",
    sub: "Limited spots · this round only",
  },
] as const;

const HOOK_BENEFITS = [
  {
    hook: "Your face in our paid ads",
    body: "We run your video across Meta Ads, Reels, and landing pages — with your creator profile as the destination.",
  },
  {
    hook: "Brands discover you, not us",
    body: "Every interested viewer is sent straight to your GoCollab profile — ready to browse your portfolio and place an order.",
  },
  {
    hook: "Collabs without the cold DM grind",
    body: "Skip pitching in DMs. Brands who already trust our platform see you first — warm leads, not strangers.",
  },
  {
    hook: "Zero ad spend on your end",
    body: "We invest in promoting your video. You invest 60 seconds of authenticity. That's the trade.",
  },
] as const;

function MarqueeSparkle() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="shrink-0 text-lime"
    >
      <path
        d="M7 0.5L8.1 5.9L13.5 7L8.1 8.1L7 13.5L5.9 8.1L0.5 7L5.9 5.9L7 0.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SpotlightMarquee() {
  return (
    <div className="relative z-1 flex min-w-0 flex-1 overflow-hidden mask-[linear-gradient(to_right,transparent,black_6%,black_68%,transparent)] sm:mask-[linear-gradient(to_right,transparent,black_4%,black_62%,transparent)]">
      <div className="spotlight-marquee-track items-center">
        <SpotlightMarqueeSegment />
        <SpotlightMarqueeSegment ariaHidden />
      </div>
    </div>
  );
}

function SpotlightMarqueeSegment({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-8 pr-8"
      aria-hidden={ariaHidden || undefined}
    >
      {MARQUEE_ITEMS.map((item) => (
        <Fragment key={item}>
          <span className="whitespace-nowrap text-[13px] font-bold uppercase tracking-[0.14em] text-white sm:text-sm">
            {item}
          </span>
          <MarqueeSparkle />
        </Fragment>
      ))}
    </div>
  );
}

function HookStatCard({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-pink/25 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
      <p className="font-heading text-xl font-bold tracking-tight text-primary">{value}</p>
      <p className="mt-1 text-xs font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  );
}

function CreatorSpotlightModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(92vh,860px)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden border border-pink/20 bg-background p-0 shadow-2xl sm:max-w-[min(1180px,calc(100vw-1rem))] sm:rounded-2xl"
        overlayClassName="bg-foreground/40 backdrop-blur-md"
      >
        <DialogTitle className="sr-only">Creator Spotlight Program</DialogTitle>
        <DialogDescription className="sr-only">
          Join the GoCollab Creator Spotlight Program — get featured in our marketing and discovered by brands.
        </DialogDescription>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Hero */}
          <div className="relative overflow-hidden border-b border-pink/15 px-5 py-6 sm:px-8 sm:py-7">
            <div className="bg-grain pointer-events-none absolute inset-0 opacity-50" />
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-pink/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-primary/15 blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Sticker tone="pink">
                  <Sparkles className="size-3" aria-hidden />
                  Creator Spotlight
                </Sticker>
                <Sticker tone="lime" className="normal-case">
                  You&apos;re invited
                </Sticker>
              </div>

              <h2 className="font-heading mt-4 max-w-3xl text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-[1.65rem] lg:text-3xl">
                Your face in our ads.{" "}
                <span className="text-primary">Their clicks on your profile.</span>
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Record one honest 30–60s vertical video about {SITE_NAME}. We put it in front of
                brands on Meta, Reels, and our site — and send every interested viewer straight to{" "}
                <strong className="font-semibold text-foreground">your creator profile</strong>.
              </p>

              <p className="mt-2.5 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
                Limited spots · Selected creators only · Act before this round closes
              </p>
            </div>
          </div>

          {/* Hook stats */}
          <div className="grid grid-cols-2 gap-2.5 border-b border-pink/10 bg-pink/6 px-5 py-4 sm:grid-cols-4 sm:gap-3 sm:px-8">
            {HOOK_STATS.map((stat) => (
              <HookStatCard key={stat.label} {...stat} />
            ))}
          </div>

          {/* Main content */}
          <div className="grid gap-6 px-5 py-6 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:py-8">
            <div className="space-y-6">
              <section>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  The play
                </p>
                <h3 className="font-heading mt-1.5 text-base font-bold text-foreground sm:text-lg">
                  We promote. You get discovered.
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Instead of sending ad traffic to {SITE_NAME} first, we route interested brands
                  to <strong className="text-foreground">your profile</strong>. You become the
                  face of the campaign — and the destination.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CHANNELS.map((channel) => (
                    <span
                      key={channel}
                      className="rounded-full border border-pink/30 bg-pink/10 px-2.5 py-0.5 text-[11px] font-semibold text-foreground"
                    >
                      {channel}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  What&apos;s in it for you
                </p>
                <ul className="mt-3 space-y-3">
                  {HOOK_BENEFITS.map((item) => (
                    <li
                      key={item.hook}
                      className="rounded-xl border border-pink/20 bg-card p-3 shadow-sm"
                    >
                      <p className="flex items-start gap-2 text-[13px] font-semibold text-foreground">
                        <Star className="mt-0.5 size-3.5 shrink-0 fill-primary text-primary" aria-hidden />
                        {item.hook}
                      </p>
                      <p className="mt-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-primary/20 bg-linear-to-br from-pink/10 via-background to-primary/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  Why we&apos;re doing this
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  Brands don&apos;t trust polished ads — they trust real creators. Your story helps
                  other creators get discovered while helping brands find authentic talent.{" "}
                  <strong className="text-foreground">You help us grow. We help brands find you.</strong>
                </p>
              </section>
            </div>

            <div className="space-y-6">
              <section>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  What we need from you
                </p>
                <h3 className="font-heading mt-1.5 text-base font-bold text-foreground sm:text-lg">
                  One video. 60 seconds max. Zero over-editing.
                </h3>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Talk like you would to a friend — not a TV commercial. Hindi, English, or Hinglish
                  all work. Pick any angle below:
                </p>
                <ul className="mt-3 space-y-1.5">
                  {VIDEO_TOPICS.map((topic, i) => (
                    <li
                      key={topic}
                      className="flex gap-2.5 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-[13px] text-foreground"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      {topic}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  Shoot checklist
                </p>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {VIDEO_GUIDELINES.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 rounded-lg border border-pink/15 bg-white px-2.5 py-2 text-xs text-foreground"
                    >
                      <Film className="size-3.5 shrink-0 text-primary" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  Usage rights
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  By sharing your video, you allow {SITE_NAME} to:
                </p>
                <ul className="mt-2 space-y-1.5">
                  {USAGE_RIGHTS.map((item) => (
                    <li key={item} className="flex gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 rounded-lg border border-pink/20 bg-pink/5 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  <Megaphone className="mb-0.5 inline size-3 text-primary" aria-hidden />{" "}
                  <strong className="text-foreground">Your identity stays yours.</strong> We only
                  use the content for marketing — ownership of your personal brand remains with you.
                </p>
              </section>
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-pink/20 bg-linear-to-r from-pink/10 via-background to-pink/5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-4">
          <div className="min-w-0">
            <p className="font-heading text-sm font-bold text-foreground sm:text-base">
              Ready to be the face of {SITE_NAME}?
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reply to claim your spot — we&apos;ll send next steps within 48 hours.
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className="border-pink/30 sm:min-w-[7.5rem]"
              onClick={() => onOpenChange(false)}
            >
              Maybe later
            </Button>
            {SPOTLIGHT_CTA_ENABLED ? (
              <PillButton
                variant="primary"
                arrow
                href={SPOTLIGHT_MAILTO}
                className="justify-center px-5 py-2.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 sm:min-w-[11rem]"
              >
                I&apos;m interested
              </PillButton>
            ) : (
              <Button
                disabled
                className="gap-2 bg-primary/50 text-primary-foreground sm:min-w-[11rem]"
              >
                I&apos;m interested
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreatorSpotlightProgram({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "relative flex h-12 items-center overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0f] sm:h-[52px]",
          className,
        )}
        role="region"
        aria-label="Creator Spotlight Program"
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#0a0a0f] via-[#0a0a0f] to-fuchsia-950/90" />

        <SpotlightMarquee />

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-linear-to-l from-fuchsia-950 via-fuchsia-950/95 to-transparent sm:w-36" />

        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute right-2 z-20 h-8 shrink-0 rounded-full border-0 bg-lime px-4 text-xs font-bold uppercase tracking-wide text-lime-foreground shadow-[0_0_24px_rgba(198,255,61,0.35)] hover:bg-lime/90 sm:right-3 sm:h-9 sm:px-5 sm:text-[13px]"
        >
          Click now
        </Button>
      </div>

      <CreatorSpotlightModal open={open} onOpenChange={setOpen} />
    </>
  );
}
