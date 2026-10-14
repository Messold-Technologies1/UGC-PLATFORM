"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Rocket, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

import { cn } from "@/lib/utils";

export type GoLiveStepProps = {
  submitted: boolean;
  strengthPct: number;
  strengthHint: string;
  onUploadMore: () => void;
  onGoToDashboard: () => void;
};

const STEPS = [
  {
    icon: <CheckCircle2 size={18} />,
    label: "Profile submitted",
    note: "You're all set — we've got it from here!",
    done: true,
  },
  {
    icon: <Clock size={18} />,
    label: "Admin review",
    note: "Our team checks every profile within 24–48 hrs to keep quality high.",
    done: false,
  },
  {
    icon: <Sparkles size={18} />,
    label: "You go live & start earning",
    note: "Brands discover you, send briefs, and book you directly.",
    done: false,
  },
];

export function GoLiveStep({
  submitted,
  strengthPct,
  strengthHint,
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
        confetti({ particleCount: 7, angle: 60, spread: 60, origin: { x: 0 }, colors });
        confetti({ particleCount: 7, angle: 120, spread: 60, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  }, [submitted]);

  return (
    <motion.div
      className={cn(
        "flex min-h-[calc(100vh-220px)] flex-col items-stretch justify-between gap-0 overflow-hidden rounded-[18px] border border-border bg-card p-0 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]",
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
    >
      {submitted ? (
        <>
          {/* ── Hero ── */}
          <div className="flex flex-col items-center border-b border-border px-8 pb-8 pt-10 text-center">
            <motion.div
              className="mb-4 select-none text-[56px] leading-none"
              initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.08 }}
            >
              🎉
            </motion.div>
            <motion.h3
              className="mb-2.5 text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              You&rsquo;re in the queue!
            </motion.h3>
            <motion.p
              className="m-0 max-w-[400px] text-[15px] leading-relaxed text-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
            >
              Big move. Your profile is submitted and under review.
              <br />
              <span className="font-semibold text-primary">
                Once approved, brands will start finding &amp; booking you.
              </span>
            </motion.p>
          </div>

          {/* ── Steps ── */}
          <motion.ol
            className="m-0 flex flex-1 list-none flex-col gap-0 border-b border-border px-8 py-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
          >
            {STEPS.map((s, i) => (
              <li
                key={i}
                className={cn(
                  "relative flex items-start gap-4 py-4 text-muted-foreground",
                  i < STEPS.length - 1 && "border-b border-border",
                  s.done && "text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground",
                    s.done && "bg-primary/10 text-primary",
                  )}
                >
                  {s.icon}
                </span>
                <div className="flex flex-col gap-[3px] pt-0.5">
                  <span className="text-[15px] font-bold leading-snug text-inherit">
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] leading-normal text-muted-foreground",
                      s.done &&
                        "text-[color-mix(in_oklab,var(--primary)_70%,var(--muted-foreground))]",
                    )}
                  >
                    {s.note}
                  </span>
                </div>
              </li>
            ))}
          </motion.ol>

          {/* ── Strength bar ── */}
          <motion.div
            className="px-8 pb-7 pt-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
          >
            <div className="flex items-center gap-5">
              <div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                  Profile Complete
                </div>
                <div className="shrink-0 text-4xl font-extrabold leading-none tracking-[-0.02em] text-foreground">
                  {strengthPct}%
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full border border-[color-mix(in_oklab,var(--primary)_20%,transparent)] bg-card">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${strengthPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs leading-normal text-muted-foreground">
                  {strengthHint}
                </p>
              </div>
            </div>
          </motion.div>
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
            Review everything, accept the policies,<br />then submit your profile.
          </p>
        </div>
      )}
    </motion.div>
  );
}
