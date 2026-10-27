"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Clock,
  Link2,
  Rocket,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";

import { cn } from "@/lib/utils";

export type GoLiveStepProps = {
  submitted: boolean;
  strengthPct: number;
  strengthHint: string;
  onUploadMore: () => void;
  onGoToDashboard: () => void;
};

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
    <span className="font-semibold text-foreground">
      prices, portfolio and insights
    </span>{" "}
    in one place.
  </>,
  <>Skip repetitive DMs about pricing and collaborations.</>,
  <>
    Every visit through your link helps increase your{" "}
    <span className="font-semibold text-foreground">profile visibility</span> on
    GoCollab.
  </>,
  <>
    Brands can place orders directly instead of going through lengthy
    conversations.
  </>,
] as const;

export function GoLiveStep({
  submitted,
  strengthPct: _strengthPct,
  strengthHint: _strengthHint,
  onUploadMore: _onUploadMore,
  onGoToDashboard: _onGoToDashboard,
}: GoLiveStepProps) {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (submitted && !confettiFired.current) {
      confettiFired.current = true;
      const end = Date.now() + 2600;
      const colors = ["#e91e8c", "#f472b6", "#fbbf24", "#34d399", "#60a5fa"];
      (function frame() {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  }, [submitted]);

  return (
    <motion.div
      className={cn(
        "relative flex min-h-[calc(100vh-220px)] flex-col items-stretch overflow-hidden rounded-[18px] border border-border bg-card p-0 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]",
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
    >
      {submitted ? (
        <>
          {/* Soft pastel background inside card */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0 overflow-hidden bg-[#faf9f8] dark:bg-slate-950"
          >
            <div className="absolute -left-24 top-[12%] size-[18rem] rounded-full bg-[#f7c4b8]/55 blur-3xl dark:bg-[#ef3e51]/15" />
            <div className="absolute -right-20 top-[4%] size-[16rem] rounded-full bg-[#b8e4e0]/50 blur-3xl dark:bg-teal-500/10" />
            <div className="absolute bottom-[4%] left-[22%] size-[14rem] rounded-full bg-[#fde8c8]/45 blur-3xl dark:bg-amber-500/10" />
          </div>

          <div className="relative z-10 flex flex-1 flex-col justify-center px-4 py-4 sm:px-7 sm:py-6">
            {/* Hero */}
            <div className="flex flex-col items-center text-center">
              <motion.div
                className="relative mb-4"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 16,
                  delay: 0.08,
                }}
              >
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
                <div className="grid size-[3.75rem] place-items-center rounded-full bg-emerald-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.38)]">
                  <CheckCircle2 size={32} strokeWidth={2.2} aria-hidden />
                </div>
              </motion.div>

              <motion.h3
                className="m-0 text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-foreground sm:text-[28px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                You&rsquo;re In! 🥳
              </motion.h3>
              <motion.p
                className="mt-2.5 m-0 max-w-lg text-[14px] leading-relaxed text-muted-foreground"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26 }}
              >
                Your GoCollab creator profile has been submitted successfully.
              </motion.p>

              <motion.div
                className="mt-4 flex flex-wrap items-center justify-center gap-2.5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-[#fbf3ea] px-3.5 py-1.5 text-[13px] font-semibold text-[#8a5a2b] dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  <Clock size={14} aria-hidden />
                  Profile Under Review
                </span>
                <span className="text-[13px] font-bold text-foreground">
                  Up to 7 days
                </span>
              </motion.div>
              <motion.p
                className="mt-3 m-0 max-w-md text-[13px] leading-relaxed text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.34 }}
              >
                We&rsquo;re reviewing your profile and will notify you once
                it&rsquo;s approved.
              </motion.p>
            </div>

            {/* Timeline */}
            <motion.ol
              className="relative mt-8 m-0 grid list-none gap-6 p-0 sm:grid-cols-3 sm:gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
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
                  <p className="mt-3.5 m-0 text-[13.5px] font-bold leading-snug text-foreground">
                    {step.title}
                  </p>
                  <p className="mt-1.5 m-0 max-w-[15rem] text-[12.5px] leading-relaxed text-muted-foreground">
                    {step.note}
                  </p>
                </li>
              ))}
            </motion.ol>

            {/* Personal link card */}
            <motion.div
              className="mt-7 rounded-2xl border border-[#f3d5db]/80 bg-[#fff5f6] px-4 py-4 dark:border-red-500/20 dark:bg-red-500/10 sm:px-5 sm:py-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48 }}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white text-primary shadow-sm dark:bg-slate-900">
                  <Link2 size={16} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-[14px] font-extrabold text-foreground">
                    Your Personal GoCollab Link
                  </p>
                  <p className="mt-1 m-0 text-[12.5px] leading-relaxed text-muted-foreground">
                    Available after approval — we&rsquo;ll unlock your link once
                    your profile is live.
                  </p>
                </div>
              </div>

              <p className="mt-4 m-0 text-[14px] font-bold leading-snug text-foreground">
                Stop Answering &ldquo;What Are Your Rates?&rdquo; Again &amp;
                Again.
              </p>
              <p className="mt-2 m-0 text-[13px] leading-relaxed text-muted-foreground">
                Once approved, share your GoCollab link with brands or add it to
                your Instagram bio.
              </p>

              <ul className="mt-3.5 m-0 flex list-none flex-col gap-2.5 p-0">
                {LINK_BENEFITS.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-[1.125rem] shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check size={10} strokeWidth={3} aria-hidden />
                    </span>
                    <span className="text-[13px] leading-relaxed text-muted-foreground">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-3.5 m-0 text-[12.5px] leading-relaxed text-muted-foreground">
                Sharing your link is completely optional. Brands can still
                discover and book you through GoCollab.
              </p>
            </motion.div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center border-b border-border px-8 pb-8 pt-10 text-center">
          <div className="mb-4 select-none text-[40px] leading-none">
            <Rocket size={40} strokeWidth={1.5} className="text-primary" />
          </div>
          <h3 className="mb-2.5 text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
            Ready to go live
          </h3>
          <p className="m-0 max-w-[400px] text-[15px] leading-relaxed text-muted-foreground">
            Review everything, accept the policies,
            <br />
            then submit your profile.
          </p>
        </div>
      )}
    </motion.div>
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
        <Check size={16} strokeWidth={2.75} aria-hidden />
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative z-10 grid size-8 place-items-center rounded-full bg-[#f5a524] text-white shadow-[0_4px_12px_rgba(245,165,36,0.4)] ring-4 ring-[#f5a524]/20">
        <Clock size={16} strokeWidth={2.25} aria-hidden />
      </span>
    );
  }

  return (
    <span className="relative z-10 grid size-8 place-items-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
      <Sparkles size={14} strokeWidth={2} aria-hidden />
    </span>
  );
}
