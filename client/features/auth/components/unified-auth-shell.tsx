"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** Aurora background — brand wine (#6e2545) blended into creator crimson
 * (#B3123F) so the single screen carries both identities without splitting. */
const AURORA_BG: CSSProperties = {
  background:
    "radial-gradient(120% 90% at 12% 8%, #7a2a4d 0%, rgba(122,42,77,0) 55%)," +
    "radial-gradient(130% 100% at 92% 96%, #c2143f 0%, rgba(194,20,63,0) 52%)," +
    "linear-gradient(135deg, #6e2545 0%, #8f1a41 52%, #B3123F 100%)",
};

function LogoMark() {
  return (
    <div className="flex items-center gap-2.5 text-white">
      <span className="flex size-8 items-center justify-center rounded-[10px] border border-white/25 bg-white/15">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7.5C4 6 5 5 6.5 5H17.5C19 5 20 6 20 7.5V15C20 16.5 19 17.5 17.5 17.5H10L5.5 20.5V17.5C4.7 17.2 4 16.4 4 15.3V7.5Z"
            fill="#fff"
          />
        </svg>
      </span>
      <span className="text-[18px] font-extrabold tracking-tight">GoCollab</span>
    </div>
  );
}

interface UnifiedAuthShellProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  /** Top-right helper link (e.g. "Log in" / "Create an account"). */
  altPrompt?: { label: string; cta: string; href: string };
  children: ReactNode;
}

/**
 * Two-pane auth shell used by the unified login and signup screens. The left
 * pane is the Aurora hero; the right pane holds the form card. On small screens
 * the hero collapses to a slim gradient header and the card sits below.
 */
export function UnifiedAuthShell({
  eyebrow,
  title,
  subtitle,
  altPrompt,
  children,
}: UnifiedAuthShellProps) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-white lg:grid-cols-2">
      {/* Hero */}
      <div
        className="relative hidden overflow-hidden px-16 py-14 lg:flex lg:flex-col"
        style={AURORA_BG}
      >
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
        <div className="relative flex items-center justify-between">
          <LogoMark />
          {altPrompt ? (
            <span className="text-[13.5px] font-medium text-white/80">
              {altPrompt.label}{" "}
              <Link
                href={altPrompt.href}
                className="font-bold text-white underline decoration-white/50 underline-offset-2"
              >
                {altPrompt.cta}
              </Link>
            </span>
          ) : null}
        </div>

        <div className="relative mt-auto max-w-[440px] text-white">
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
      </div>

      {/* Form pane */}
      <div className="relative flex flex-col">
        {/* Slim gradient header on mobile */}
        <div
          className="flex items-center justify-between px-6 py-5 lg:hidden"
          style={AURORA_BG}
        >
          <LogoMark />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
