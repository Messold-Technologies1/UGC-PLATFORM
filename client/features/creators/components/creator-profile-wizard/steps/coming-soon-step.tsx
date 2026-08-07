"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

import type { WizardStep } from "../wizard-config";

/**
 * Placeholder panel for milestones that are on the roadmap but not yet wired
 * up. It keeps the journey visible without pretending the step is interactive.
 */
export function ComingSoonStep({ step }: { step: WizardStep }) {
  const Icon = step.icon;
  return (
    <motion.div
      className="cw-card cw-soon"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
    >
      <div className="cw-soon-icon">
        <Icon size={26} />
        <span className="cw-soon-lock">
          <Lock size={12} />
        </span>
      </div>
      <h4 className="cw-soon-title">{step.title}</h4>
      <p className="cw-soon-tag">{step.tagline}</p>
      <span className="cw-soon-badge">Coming next</span>
      <p className="cw-soon-note">
        We&apos;re rolling out the new onboarding one milestone at a time. Your
        saved details carry straight over — nothing to redo.
      </p>
    </motion.div>
  );
}
