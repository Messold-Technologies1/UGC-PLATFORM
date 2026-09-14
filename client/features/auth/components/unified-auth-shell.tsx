"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SITE_NAME } from "@/config/site";

/** Aurora background — brand wine (#6e2545) blended into creator crimson
 * (#B3123F) so the single screen carries both identities. Covers the whole
 * page; the form sits on a floating white card over it. */
const AURORA_BG: CSSProperties = {
  background:
    "radial-gradient(120% 90% at 12% 8%, #7a2a4d 0%, rgba(122,42,77,0) 55%)," +
    "radial-gradient(130% 100% at 92% 96%, #c2143f 0%, rgba(194,20,63,0) 52%)," +
    "linear-gradient(135deg, #6e2545 0%, #8f1a41 52%, #B3123F 100%)",
};

interface UnifiedAuthShellProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
}

/**
 * Full-bleed Aurora auth shell for the unified login and signup screens.
 * The gradient covers the entire page; a slim logo bar sits on top and a
 * floating white card holds the form. On large screens the marketing headline
 * sits to the left of the card; on small screens only the card shows.
 */
export function UnifiedAuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: UnifiedAuthShellProps) {
  return (
    <div
      className="relative min-h-dvh overflow-hidden"
      style={AURORA_BG}
    >
      {/* soft light blooms */}
      <div
        className="pointer-events-none absolute -left-28 -top-36 size-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,.16), rgba(255,255,255,0) 68%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-28 -right-24 size-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,214,224,.22), rgba(255,214,224,0) 66%)",
        }}
      />

      {/* Slim logo navbar */}
      <header className="relative z-10 flex items-center px-5 py-4 sm:px-8">
        <Link
          href="/"
          prefetch
          className="inline-flex items-center rounded-full bg-white/95 px-4 py-2 shadow-sm ring-1 ring-black/5"
          aria-label={`${SITE_NAME} home`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
          <img
            src="/brand-logo.png"
            alt={`${SITE_NAME}`}
            className="h-7 w-auto object-contain"
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </Link>
      </header>

      {/* Content: headline (lg only) + floating card */}
      <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-72px)] w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-14 sm:px-8 lg:grid-cols-2 lg:gap-8">
        <div className="hidden max-w-[460px] text-white lg:block">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold">
            <span className="size-[7px] rounded-full bg-[#ffd0dc]" />
            {eyebrow}
          </span>
          <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance">
            {title}
          </h1>
          <p className="mt-5 max-w-[380px] text-[15.5px] leading-relaxed text-white/80">
            {subtitle}
          </p>
        </div>

        <div className="flex w-full justify-center lg:justify-end">
          <div className="w-full max-w-[440px] rounded-[22px] bg-white p-8 shadow-[0_40px_90px_-30px_rgba(20,4,12,0.6)] sm:p-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
