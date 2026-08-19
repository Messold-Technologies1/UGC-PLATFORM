"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Rocket, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

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
  onUploadMore,
  onGoToDashboard,
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
      className="cw-card cw-golive"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
    >
      {submitted ? (
        <>
          {/* ── Hero ── */}
          <div className="cw-golive-hero">
            <motion.div
              className="cw-golive-emoji"
              initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.08 }}
            >
              🎉
            </motion.div>
            <motion.h3
              className="cw-golive-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              You&rsquo;re in the queue!
            </motion.h3>
            <motion.p
              className="cw-golive-tagline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
            >
              Big move. Your profile is submitted and under review.
              <br />
              <span className="cw-golive-tagline-accent">
                Once approved, brands will start finding &amp; booking you.
              </span>
            </motion.p>
          </div>

          {/* ── Steps ── */}
          <motion.ol
            className="cw-golive-steps"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
          >
            {STEPS.map((s, i) => (
              <li key={i} className={`cw-golive-step${s.done ? " cw-golive-step--done" : ""}`}>
                <span className="cw-golive-step-icon">{s.icon}</span>
                <div className="cw-golive-step-body">
                  <span className="cw-golive-step-label">{s.label}</span>
                  <span className="cw-golive-step-note">{s.note}</span>
                </div>
                {i < STEPS.length - 1 && <span className="cw-golive-step-connector" aria-hidden />}
              </li>
            ))}
          </motion.ol>

          {/* ── Strength bar ── */}
          <motion.div
            className="cw-golive-strength"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
          >
            <div className="cw-golive-strength-inner">
              <div>
                <div className="cw-golive-strength-head">Profile Strength</div>
                <div className="cw-golive-strength-pct">{strengthPct}%</div>
              </div>
              <div className="cw-golive-strength-right">
                <div className="cw-strength-track">
                  <div className="cw-strength-fill" style={{ width: `${strengthPct}%` }} />
                </div>
                <p className="cw-golive-strength-hint">{strengthHint}</p>
              </div>
            </div>
          </motion.div>
        </>
      ) : (
        <div className="cw-golive-hero">
          <div className="cw-golive-emoji" style={{ fontSize: 40 }}>
            <Rocket size={40} strokeWidth={1.5} style={{ color: "var(--primary)" }} />
          </div>
          <h3 className="cw-golive-title">Ready to go live</h3>
          <p className="cw-golive-tagline">
            Review everything, accept the policies,<br />then submit your profile.
          </p>
        </div>
      )}
    </motion.div>
  );
}
