"use client";

import { useState } from "react";
import { AlertTriangle, Check, Sparkles, Loader2, X } from "lucide-react";

import { CatalogStatus } from "@/features/creators/components/creator-profile-update/shared-components";
import {
  PortfolioGrid,
  PortfolioProcessingBanner,
} from "@/features/creators/components/creator-profile-update/portfolio-components";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { InstagramConnectPitch } from "@/features/instagram-import/components/instagram-connect-pitch";

import { BIO_MIN_CHARS, BIO_MAX_CHARS } from "../wizard-config";

const BIO_EXAMPLE =
  "I'm a Mumbai-based beauty and skincare creator shooting in Hindi and English. I make honest first-impression reviews, GRWM routines and product demos, mostly at home with natural light. Brands book me when they want a warm, unscripted voice rather than a polished ad read.";

const PORTFOLIO_CONFIRM_ITEMS = [
  "Do not contain any social media handle, watermark, logo or platform branding.",
  "Are my original work or I have permission to use them.",
  "Are uploaded in 1080p (Full HD) or higher.",
  "Accurately represent the quality I will deliver to brands through GoCollab.",
];

export type PortfolioStepProps = {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  videos: PortfolioVideoApi[];
  onAdd: () => void;
  onReplace: (video: PortfolioVideoApi) => void;
  onDelete: (video: PortfolioVideoApi) => void;
  /** Re-queue every Instagram copy that failed. */
  onRetryFailed?: (videoIds: string[]) => void;
  retryingFailed?: boolean;
  /**
   * Whether the creator has Instagram linked. Unlinked, this is the step where
   * connecting pays off most visibly, so the pitch goes here too.
   */
  instagramConnected?: boolean;
  onConnectInstagram?: () => void;
  connectingInstagram?: boolean;
  disabled: boolean;
  bio: string;
  onBioChange: (value: string) => void;
  onGenerateBio: () => void;
  generatingBio: boolean;
  canGenerateBio: boolean;
  showAiNotice: boolean;
  onDismissAiNotice: () => void;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  errors?: { bio?: string; confirmed?: string };
};

export function PortfolioStep({
  loading,
  error,
  onRetry,
  videos,
  onAdd,
  onReplace,
  onDelete,
  onRetryFailed,
  retryingFailed,
  instagramConnected,
  onConnectInstagram,
  connectingInstagram,
  disabled,
  bio,
  onBioChange,
  onGenerateBio,
  generatingBio,
  canGenerateBio,
  showAiNotice,
  onDismissAiNotice,
  confirmed,
  onConfirmedChange,
  errors = {},
}: PortfolioStepProps) {
  const bioLen = bio.trim().length;
  const [exampleOpen, setExampleOpen] = useState(false);
  return (
    <div className="cw-card">
      {/* Creator story */}
      <div className="cw-field">
        <div className="cw-bio-head">
          <label htmlFor="cw-bio" className="cw-fieldlabel">
            Tell your creator story <span className="cw-req">*</span>
          </label>
          <button
            type="button"
            className="cw-ai-btn"
            onClick={onGenerateBio}
            disabled={disabled || generatingBio || !canGenerateBio}
            title={
              canGenerateBio
                ? "Generate a bio from your niche, languages and location"
                : "Pick your niche first, then generate"
            }
          >
            {generatingBio ? (
              <>
                <Loader2 size={14} className="cw-ai-spin" aria-hidden />
                Writing…
              </>
            ) : (
              <>
                <Sparkles size={14} aria-hidden />
                {bio.trim() ? "Regenerate with AI" : "Generate with AI"}
              </>
            )}
          </button>
        </div>
        <span className="cw-facet-help">
          Share what you create, the languages you speak and why brands will
          enjoy working with you.
        </span>
        <textarea
          id="cw-bio"
          className="cw-textarea"
          value={bio}
          disabled={disabled || generatingBio}
          rows={5}
          maxLength={BIO_MAX_CHARS}
          placeholder="Start typing…"
          onChange={(e) => onBioChange(e.target.value)}
        />
        {showAiNotice ? (
          <div className="cw-ai-notice" role="status">
            <Sparkles size={15} aria-hidden className="cw-ai-notice-icon" />
            <span>
              Fresh from AI, this is a solid first draft, but it doesn&apos;t
              know your vibe yet. Tweak a line or two so it sounds unmistakably{" "}
              <strong>you</strong>.
            </span>
            <button
              type="button"
              className="cw-ai-notice-x"
              onClick={onDismissAiNotice}
              aria-label="Dismiss"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        ) : null}
        {errors.bio ? (
          <p className="cw-field-warn">
            <AlertTriangle size={13} aria-hidden />
            {errors.bio}
          </p>
        ) : null}
        <div className="cw-bio-foot">
          <span
            className="cw-bio-count"
            data-short={bioLen > 0 && bioLen < BIO_MIN_CHARS}
          >
            {bioLen} / {BIO_MAX_CHARS} · minimum {BIO_MIN_CHARS} characters
          </span>
          <span className="cw-bio-rule">
            No links, phone numbers, emails, social handles or pricing.
          </span>
        </div>
        <button
          type="button"
          className="cw-bio-example-btn"
          aria-expanded={exampleOpen}
          onClick={() => setExampleOpen((open) => !open)}
        >
          {exampleOpen ? "Hide example" : "View example"}
        </button>
        {exampleOpen ? (
          <div className="cw-bio-example">
            <span className="cw-bio-example-tag">Example</span>
            {BIO_EXAMPLE}
          </div>
        ) : null}
      </div>

      <div className="cw-hr" />

      {/* Portfolio gallery */}
      <div className="cw-field">
        <label className="cw-fieldlabel">
          Your portfolio videos <span className="cw-req">*</span>
        </label>
        <span className="cw-facet-help">
          Upload your best work (minimum 3 videos). This is what brands browse
          before they book you.
        </span>
      </div>

      {videos.length < 3 ? (
        <div className="cw-portfolio-note">
          Upload at least 3 videos to go live. {videos.length} of 10 uploaded so
          far — creators with 10+ pieces get 3× more orders.
        </div>
      ) : null}

      {/* The one place where "connect Instagram" is not an abstract ask: they
          are about to hunt for files they have already posted. */}
      {instagramConnected === false && onConnectInstagram ? (
        <InstagramConnectPitch
          onConnect={onConnectInstagram}
          connecting={connectingInstagram}
        />
      ) : null}

      {loading ? (
        <CatalogStatus
          loading
          error={false}
          label="portfolio videos"
          onRetry={onRetry}
        />
      ) : error ? (
        <CatalogStatus
          loading={false}
          error
          label="portfolio videos"
          onRetry={onRetry}
        />
      ) : (
        <>
          <PortfolioProcessingBanner
            videos={videos}
            onRetryFailed={onRetryFailed}
            retrying={retryingFailed}
          />
          <PortfolioGrid
            videos={videos}
            onReplace={onReplace}
            onDelete={onDelete}
            onAdd={onAdd}
          />
        </>
      )}

      <label
        className="cw-confirm cw-confirm--standalone cw-confirm--top"
        data-checked={confirmed}
        data-disabled={disabled}
      >
        <input
          type="checkbox"
          className="cw-confirm-box"
          checked={confirmed}
          disabled={disabled}
          onChange={(e) => onConfirmedChange(e.target.checked)}
        />
        <span className="cw-confirm-tick" aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
        <span className="cw-confirm-copy">
          <span className="cw-confirm-title">
            I confirm these portfolio videos:
          </span>
          <ul className="cw-confirm-list">
            {PORTFOLIO_CONFIRM_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <span className="cw-confirm-warn">
            If the quality of your deliveries is significantly lower than your
            portfolio, it may result in order cancellations, disputes, lower
            ratings, reduced visibility, or account review.
          </span>
        </span>
      </label>
      {errors.confirmed ? (
        <p className="cw-field-warn">
          <AlertTriangle size={13} aria-hidden />
          {errors.confirmed}
        </p>
      ) : null}
    </div>
  );
}
