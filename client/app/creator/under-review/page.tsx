import {
  Check,
  CheckCircle2,
  Clock,
  Link2,
  Sparkles,
} from "lucide-react";

import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";

const TIMELINE_STEPS = [
  {
    title: "We Review & Publish Your Profile",
    note: "Once approved, your profile goes live and brands can discover you.",
    status: "complete" as const,
  },
  {
    title: "Brands Place Orders Directly",
    note: "No searching, pitching or applying. Brands view your services and book you directly.",
    status: "active" as const,
  },
  {
    title: "You Get Notified",
    note: "When an order comes in, review the brief, accept it, and start creating.",
    status: "upcoming" as const,
  },
] as const;

const LINK_BENEFITS = [
  <>
    Brands can instantly explore your{" "}
    <span className="font-semibold text-slate-800 dark:text-slate-100">
      prices, portfolio and insights
    </span>{" "}
    in one place.
  </>,
  <>Skip repetitive DMs about pricing and collaborations.</>,
  <>
    Every visit through your link helps increase your{" "}
    <span className="font-semibold text-slate-800 dark:text-slate-100">
      profile visibility
    </span>{" "}
    on GoCollab.
  </>,
  <>
    Brands can place orders directly instead of going through lengthy
    conversations.
  </>,
] as const;

export default function UnderReviewPage() {
  const profileFirst = isProfileFirstOnboardingMode();

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center py-1">
      {/* Soft pastel background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -mx-4 -mt-4 -mb-8 sm:-mx-6 lg:-mx-8 xl:-mx-10 2xl:-mx-12 -z-10 overflow-hidden bg-[#faf9f8] dark:bg-slate-950"
      >
        <div className="absolute -left-28 top-[18%] size-[22rem] rounded-full bg-[#f7c4b8]/55 blur-3xl dark:bg-[#ef3e51]/15" />
        <div className="absolute -right-24 top-[8%] size-[20rem] rounded-full bg-[#b8e4e0]/50 blur-3xl dark:bg-teal-500/10" />
        <div className="absolute bottom-[6%] left-[28%] size-[18rem] rounded-full bg-[#fde8c8]/45 blur-3xl dark:bg-amber-500/10" />
        <div className="absolute -right-10 bottom-[12%] size-[16rem] rounded-full bg-[#f5c5d0]/40 blur-3xl dark:bg-rose-500/10" />
      </div>

      <div className="relative w-full max-w-[52rem] px-0">
        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 px-5 py-6 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.28)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 sm:px-8 sm:py-7">
          {/* Hero */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <span
                aria-hidden
                className="absolute -left-3.5 top-1 size-2.5 rotate-12 rounded-[2px] bg-sky-400"
              />
              <span
                aria-hidden
                className="absolute -right-3 top-0 size-2 rotate-45 rounded-[1px] bg-amber-400"
              />
              <span
                aria-hidden
                className="absolute -bottom-1 -left-1 size-1.5 rounded-full bg-emerald-400"
              />
              <span
                aria-hidden
                className="absolute -right-4 bottom-2 size-2 rotate-12 rounded-[1px] bg-violet-400"
              />
              <span
                aria-hidden
                className="absolute left-8 -top-2 size-1.5 rounded-full bg-rose-400"
              />
              <div className="grid size-[3.75rem] place-items-center rounded-full bg-emerald-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.38)]">
                <CheckCircle2 className="size-8" strokeWidth={2.2} aria-hidden />
              </div>
            </div>

            <h1 className="font-heading text-[1.75rem] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[2rem]">
              You&apos;re In! 🥳
            </h1>
            <p className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
              {profileFirst
                ? "Your GoCollab creator profile has been submitted successfully."
                : "Your GoCollab application has been submitted successfully."}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-[#fbf3ea] px-3.5 py-1.5 text-[13px] font-semibold text-[#8a5a2b] dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                <Clock className="size-3.5" aria-hidden />
                Profile Under Review
              </span>
              <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                Up to 7 days
              </span>
            </div>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
              We&apos;re reviewing your profile and will notify you once
              it&apos;s approved.
            </p>
          </div>

          {/* Timeline */}
          <ol className="relative mt-8 m-0 grid list-none gap-6 p-0 sm:grid-cols-3 sm:gap-4">
            {/* Connector line (desktop) */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[16.5%] right-[16.5%] top-4 hidden h-[2px] sm:block"
              style={{
                background:
                  "linear-gradient(90deg, #ef3e51 0%, #f5a524 50%, #d4d4d8 100%)",
              }}
            />

            {TIMELINE_STEPS.map((step) => (
              <li
                key={step.title}
                className="relative flex flex-col items-center text-center sm:px-2"
              >
                <TimelineIcon status={step.status} />
                <p className="mt-3.5 m-0 text-[13.5px] font-bold leading-snug text-slate-900 dark:text-white">
                  {step.title}
                </p>
                <p className="mt-1.5 m-0 max-w-[15rem] text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {step.note}
                </p>
              </li>
            ))}
          </ol>

          {/* Personal link card */}
          <div className="mt-7 rounded-2xl border border-[#f3d5db]/80 bg-[#fff5f6] px-4 py-4 dark:border-red-500/20 dark:bg-red-500/10 sm:px-5 sm:py-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#ef3e51] shadow-sm dark:bg-slate-900 dark:text-red-400">
                <Link2 className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-[14px] font-extrabold text-slate-900 dark:text-white">
                  Your Personal GoCollab Link
                </p>
                <p className="mt-1 m-0 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Available after approval — we&apos;ll unlock your link once
                  your profile is live.
                </p>
              </div>
            </div>

            <p className="mt-4 m-0 text-[14px] font-bold leading-snug text-slate-900 dark:text-white">
              Stop Answering &ldquo;What Are Your Rates?&rdquo; Again &amp;
              Again.
            </p>
            <p className="mt-2 m-0 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
              Once approved, share your GoCollab link with brands or add it to
              your Instagram bio.
            </p>

            <ul className="mt-3.5 m-0 flex list-none flex-col gap-2.5 p-0">
              {LINK_BENEFITS.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-[1.125rem] shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-3.5 m-0 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              Sharing your link is completely optional. Brands can still
              discover and book you through GoCollab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineIcon({
  status,
}: {
  status: "complete" | "active" | "upcoming";
}) {
  if (status === "complete") {
    return (
      <span className="relative z-10 grid size-8 place-items-center rounded-full bg-[#ef3e51] text-white shadow-[0_4px_12px_rgba(239,62,81,0.35)]">
        <Check className="size-4" strokeWidth={2.75} aria-hidden />
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative z-10 grid size-8 place-items-center rounded-full bg-[#f5a524] text-white shadow-[0_4px_12px_rgba(245,165,36,0.4)] ring-4 ring-[#f5a524]/20">
        <Clock className="size-4" strokeWidth={2.25} aria-hidden />
      </span>
    );
  }

  return (
    <span className="relative z-10 grid size-8 place-items-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
      <Sparkles className="size-3.5" strokeWidth={2} aria-hidden />
    </span>
  );
}
