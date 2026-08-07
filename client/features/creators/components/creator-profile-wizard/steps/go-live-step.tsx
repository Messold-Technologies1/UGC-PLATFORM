"use client";

import { motion } from "framer-motion";
import { PartyPopper, Rocket } from "lucide-react";

export type GoLiveStepProps = {
  submitted: boolean;
  strengthPct: number;
  strengthHint: string;
  onUploadMore: () => void;
  onGoToDashboard: () => void;
};

export function GoLiveStep({
  submitted,
  strengthPct,
  strengthHint,
  onUploadMore,
  onGoToDashboard,
}: GoLiveStepProps) {
  return (
    <motion.div
      className="cw-card cw-golive"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
    >
      <div className="cw-golive-icon">
        {submitted ? <PartyPopper size={30} /> : <Rocket size={30} />}
      </div>
      <h3 className="cw-golive-title">
        {submitted ? "You're officially live!" : "Ready to go live"}
      </h3>
      <p className="cw-golive-sub">
        {submitted
          ? "Brands can now discover and hire you through GoCollab."
          : "Review everything, accept the policies, then submit your profile."}
      </p>

      {submitted ? (
        <>
          <div className="cw-golive-strength">
            <div className="cw-golive-strength-head">Profile Strength</div>
            <div className="cw-golive-strength-pct">{strengthPct}%</div>
            <div className="cw-strength-track">
              <div className="cw-strength-fill" style={{ width: `${strengthPct}%` }} />
            </div>
            <p className="cw-golive-strength-hint">{strengthHint}</p>
          </div>

          <div className="cw-golive-actions">
            <button type="button" className="cw-btn cw-btn-ghost" onClick={onUploadMore}>
              Upload more videos
            </button>
            <button type="button" className="cw-btn cw-btn-primary" onClick={onGoToDashboard}>
              Go to dashboard
            </button>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
