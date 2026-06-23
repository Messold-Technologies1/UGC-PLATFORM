import { type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "lime" | "pink" | "sky" | "grape";

export interface AudienceCardProps {
  label: string;
  category: string;
  heading: string;
  paragraph: string;
  cta: string;
  ctaHref?: string;
  benefits: { title: string; body: string }[];
  steps: { title: string; body: string }[];
  visual: ReactNode;
  tone: Tone;
  reverse?: boolean;
  cardBg?: string;
}

const toneCheckBg: Record<Tone, string> = {
  lime: "bg-lime",
  pink: "bg-pink",
  sky: "bg-sky",
  grape: "bg-grape",
};

export function AudienceCard({
  label,
  category,
  heading,
  paragraph,
  cta,
  ctaHref,
  benefits,
  steps,
  visual,
  tone,
  reverse,
  cardBg = "bg-secondary/60",
}: AudienceCardProps) {
  const ctaClassName =
    "group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-xs font-semibold text-background transition-colors hover:bg-foreground/90";

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-col rounded-[24px] p-6 lg:rounded-[28px] lg:p-7",
          cardBg,
          reverse ? "lg:order-2" : "lg:order-1",
        )}
      >
        <p className="text-[10px] font-semibold tracking-[0.18em] text-foreground/60 uppercase">
          {label}
        </p>
        <p className="mt-1 text-xs font-medium text-foreground/70">
          {category}
        </p>
        <h3 className="font-heading mt-2.5 text-xl leading-[1.1] font-bold tracking-tight text-balance sm:text-2xl lg:text-[1.6rem]">
          {heading}
        </h3>
        <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-foreground/70">
          {paragraph}
        </p>

        <div className="mt-4">
          {ctaHref ? (
            <Link href={ctaHref} className={ctaClassName}>
              {cta}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <button
              type="button"
              className={`${ctaClassName} group cursor-default`}
            >
              {cta}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>

        <ul className="mt-6 grid gap-x-5 gap-y-3.5 sm:grid-cols-2">
          {benefits.map((b) => (
            <li key={b.title} className="flex gap-2.5">
              <span
                className={cn(
                  "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  toneCheckBg[tone],
                )}
              >
                <Check className="text-foreground h-3 w-3" strokeWidth={3} />
              </span>
              <div>
                <p className="font-heading text-[13px] font-bold">{b.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground/65">
                  {b.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-foreground/10 pt-5">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-foreground/50 uppercase">
            How it works
          </p>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-1">
                <span
                  className={cn(
                    "font-heading inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                    toneCheckBg[tone],
                  )}
                >
                  {i + 1}
                </span>
                <p className="font-heading text-[13px] font-bold">{s.title}</p>
                <p className="text-[11px] leading-relaxed text-foreground/60">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col",
          reverse ? "lg:order-1" : "lg:order-2",
        )}
      >
        {visual}
      </div>
    </div>
  );
}

/* ---------------- Visual cards ---------------- */

function FloatingChip({
  children,
  className,
  tone = "white",
}: {
  children: ReactNode;
  className?: string;
  tone?: "white" | "dark" | "lime" | "pink" | "sky" | "grape";
}) {
  const toneClass: Record<string, string> = {
    white: "bg-card text-foreground",
    dark: "bg-foreground text-background",
    lime: "bg-lime text-foreground",
    pink: "bg-pink text-foreground",
    sky: "bg-sky text-foreground",
    grape: "bg-grape text-background",
  };
  return (
    <div
      className={cn(
        "border-foreground/10 absolute inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-pop",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BrandsVisual() {
  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden rounded-[28px] bg-grape/25 p-8 lg:h-full lg:rounded-[36px]">
      <div className="shadow-hard bg-foreground absolute left-1/2 top-10 w-[55%] -translate-x-1/2 -rotate-3 rounded-[28px] border-2 border-foreground p-2 aspect-9/16">
        <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-linear-to-br from-pink/70 via-grape/40 to-sky/60">
          <Image src="/5.jpg" alt="Demo" fill className="object-cover" />
          <div className="bg-grain absolute inset-0 opacity-30" />
          <div className="bg-background/90 absolute bottom-3 left-3 right-3 rounded-xl p-2.5 backdrop-blur">
            <p className="text-[10px] font-bold">Glow Serum demo · 0:18</p>
            <div className="bg-foreground/20 mt-1.5 h-1 rounded-full">
              <div className="bg-foreground h-full w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card shadow-pop absolute top-6 left-4 w-44 -rotate-6 rounded-2xl border border-foreground/10 p-3">
        <p className="text-[10px] font-semibold text-foreground/60">
          CTR boost
        </p>
        <p className="font-heading mt-0.5 text-lg font-bold">+62%</p>
        <svg viewBox="0 0 100 30" className="mt-1 h-7 w-full">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points="0,25 15,20 30,22 45,12 60,15 75,6 100,2"
          />
        </svg>
      </div>

      <FloatingChip tone="lime" className="top-8 right-4 rotate-6">
        ✦ Ad-ready UGC
      </FloatingChip>
      <FloatingChip tone="white" className="top-44 right-2 rotate-[-4deg]">
        Niche-fit creator
      </FloatingChip>
      <FloatingChip tone="dark" className="bottom-24 left-4 -rotate-3">
        + More fresh creatives
      </FloatingChip>
      <FloatingChip tone="pink" className="bottom-6 right-6 rotate-[4deg]">
        Protected payment
      </FloatingChip>
      <FloatingChip tone="white" className="bottom-10 left-10 -rotate-6">
        + Lower creator cost
      </FloatingChip>
    </div>
  );
}

export function CreatorsVisual() {
  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden rounded-[28px] bg-lime/30 p-8 lg:h-full lg:rounded-[36px]">
      <div className="bg-card shadow-pop absolute left-6 top-8 w-56 rotate-[-4deg] rounded-2xl border border-foreground/10 p-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-linear-to-br from-pink to-grape" />
          <div>
            <p className="font-heading text-sm font-bold">Aanya K.</p>
            <p className="text-[11px] text-foreground/60">Skincare · Beauty</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <div className="bg-pink/40 aspect-square rounded-md" />
          <div className="bg-sky/40 aspect-square rounded-md" />
          <div className="bg-lime/60 aspect-square rounded-md" />
        </div>
        <div className="bg-lime mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold">
          ● Profile live
        </div>
      </div>

      <div className="shadow-hard bg-foreground absolute right-4 top-12 w-52 rotate-[5deg] rounded-2xl p-3.5 text-background">
        <p className="text-[10px] font-semibold opacity-70">
          New brand request
        </p>
        <p className="font-heading mt-1 text-sm leading-snug font-bold">
          Glow Co. wants 2 reels
        </p>
        <div className="mt-2 flex gap-1.5">
          <span className="bg-lime text-foreground rounded-full px-2 py-0.5 text-[10px] font-bold">
            Accept
          </span>
          <span className="bg-background/15 rounded-full px-2 py-0.5 text-[10px] font-bold">
            View
          </span>
        </div>
      </div>

      <div className="bg-card shadow-pop absolute bottom-20 left-10 w-48 rotate-3 rounded-2xl border border-foreground/10 p-3">
        <p className="text-[10px] font-semibold text-foreground/60">
          Payment secured
        </p>
        <p className="font-heading mt-0.5 text-lg font-bold">₹6,500</p>
        <p className="text-[10px] text-foreground/60">Released on delivery</p>
      </div>

      <FloatingChip tone="pink" className="bottom-8 right-6 rotate-[-4deg]">
        ✓ UGC video approved
      </FloatingChip>
      <FloatingChip tone="white" className="top-2 left-12 rotate-[8deg]">
        Portfolio viewed · 24
      </FloatingChip>
      <FloatingChip tone="sky" className="bottom-32 right-2 rotate-6">
        ✦ New collab request
      </FloatingChip>
    </div>
  );
}

export function AgenciesVisual() {
  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden rounded-[28px] bg-sky/25 p-8 lg:h-full lg:rounded-[36px]">
      <div className="bg-card shadow-pop absolute left-6 right-6 top-8 rounded-2xl border border-foreground/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-foreground/60">
              Client campaign
            </p>
            <p className="font-heading text-sm font-bold">
              Glow Co. · April UGC
            </p>
          </div>
          <span className="bg-lime rounded-full px-2 py-0.5 text-[10px] font-bold">
            Live
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-secondary rounded-lg p-2">
            <p className="font-heading text-base font-bold">12</p>
            <p className="text-[9px] text-foreground/60">Shortlisted</p>
          </div>
          <div className="bg-secondary rounded-lg p-2">
            <p className="font-heading text-base font-bold">5</p>
            <p className="text-[9px] text-foreground/60">Delivered</p>
          </div>
          <div className="bg-secondary rounded-lg p-2">
            <p className="font-heading text-base font-bold">3</p>
            <p className="text-[9px] text-foreground/60">In review</p>
          </div>
        </div>
        <svg viewBox="0 0 100 30" className="mt-3 h-8 w-full text-foreground">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points="0,25 15,18 30,22 45,10 60,14 75,4 100,8"
          />
        </svg>
      </div>

      <div className="shadow-hard bg-foreground absolute bottom-20 left-6 w-56 -rotate-3 rounded-2xl p-3.5 text-background">
        <p className="text-[10px] font-semibold opacity-70">Creator roster</p>
        <div className="mt-2 flex -space-x-2">
          {["bg-pink", "bg-lime", "bg-sky", "bg-grape", "bg-pink"].map(
            (c, i) => (
              <div
                key={i}
                className={cn(
                  "border-foreground h-7 w-7 rounded-full border-2",
                  c,
                )}
              />
            ),
          )}
          <div className="border-foreground flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background/15 text-[10px] font-bold">
            +7
          </div>
        </div>
      </div>

      <FloatingChip tone="lime" className="bottom-10 right-4 rotate-[5deg]">
        ✦ UGC pipeline ready
      </FloatingChip>
      <FloatingChip tone="white" className="top-1 right-8 rotate-[7deg]">
        Ad creative approved
      </FloatingChip>
      <FloatingChip tone="pink" className="bottom-32 right-6 rotate-[-5deg]">
        5 videos delivered
      </FloatingChip>
    </div>
  );
}
