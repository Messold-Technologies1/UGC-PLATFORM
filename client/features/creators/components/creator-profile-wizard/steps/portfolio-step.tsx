"use client";

import { Sparkles, Loader2, X } from "lucide-react";

import { CatalogStatus } from "@/features/creators/components/creator-profile-update/shared-components";
import { PortfolioGrid } from "@/features/creators/components/creator-profile-update/portfolio-components";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";

import { BIO_MIN_CHARS, BIO_MAX_CHARS } from "../wizard-config";

const BIO_EXAMPLE =
  "I'm a Mumbai-based beauty and skincare creator shooting in Hindi and English. I make honest first-impression reviews, GRWM routines and product demos, mostly at home with natural light. Brands book me when they want a warm, unscripted voice rather than a polished ad read.";

const IDEAS = [
  {
    title: "A 30-second honest review",
    body: "Most requested format by brands this month.",
  },
  {
    title: "A hands-on product demo",
    body: "Show the product being used, not just held.",
  },
  {
    title: "One video in each language",
    body: "Proves the languages on your profile.",
  },
];

export type PortfolioStepProps = {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  videos: PortfolioVideoApi[];
  onAdd: () => void;
  onEdit: (video: PortfolioVideoApi) => void;
  onDelete: (video: PortfolioVideoApi) => void;
  disabled: boolean;
  bio: string;
  onBioChange: (value: string) => void;
  onGenerateBio: () => void;
  generatingBio: boolean;
  canGenerateBio: boolean;
  showAiNotice: boolean;
  onDismissAiNotice: () => void;
};

export function PortfolioStep({
  loading,
  error,
  onRetry,
  videos,
  onAdd,
  onEdit,
  onDelete,
  disabled,
  bio,
  onBioChange,
  onGenerateBio,
  generatingBio,
  canGenerateBio,
  showAiNotice,
  onDismissAiNotice,
}: PortfolioStepProps) {
  const publicCount = videos.filter((v) => v.visibilityStatus === "public").length;
  const bioLen = bio.trim().length;
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
              Fresh from AI, this is a solid first draft, but it doesn&apos;t know
              your vibe yet. Tweak a line or two so it sounds unmistakably{" "}
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
        <div className="cw-bio-example">
          <span className="cw-bio-example-tag">Example</span>
          {BIO_EXAMPLE}
        </div>
      </div>

      <div className="cw-hr" />

      {/* Portfolio gallery */}
      <div className="cw-field">
        <label className="cw-fieldlabel">
          Your portfolio videos <span className="cw-req">*</span>
        </label>
        <span className="cw-facet-help">
          Upload your best work (minimum 3 videos). This is what brands browse before they book
          you.
        </span>
      </div>

      {publicCount < 3 ? (
        <div className="cw-portfolio-note">
          Upload at least 3 approved videos to go live. {publicCount} of 10
          uploaded so far — creators with 10+ pieces get 3× more orders.
        </div>
      ) : null}

      {loading ? (
        <CatalogStatus loading error={false} label="portfolio videos" onRetry={onRetry} />
      ) : error ? (
        <CatalogStatus loading={false} error label="portfolio videos" onRetry={onRetry} />
      ) : (
        <PortfolioGrid
          videos={videos}
          onEdit={onEdit}
          onDelete={onDelete}
          onAdd={onAdd}
        />
      )}

      <div className="cw-hr" />

      <div className="cw-facet">
        <div className="cw-facet-label">
          <span>Need ideas for your next upload?</span>
        </div>
        <div className="cw-ideas">
          {IDEAS.map((idea) => (
            <div key={idea.title} className="cw-idea">
              <div className="cw-idea-title">{idea.title}</div>
              <div className="cw-idea-body">{idea.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
