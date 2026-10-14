"use client";

import { useState } from "react";
import { AlertTriangle, Sparkles, Loader2, X } from "lucide-react";

import { CatalogStatus } from "@/features/creators/components/creator-profile-update/shared-components";
import {
  PortfolioGrid,
  PortfolioProcessingBanner,
} from "@/features/creators/components/creator-profile-update/portfolio-components";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { InstagramConnectPitch } from "@/features/instagram-import/components/instagram-connect-pitch";
import { cn } from "@/lib/utils";

import { BIO_MIN_CHARS, BIO_MAX_CHARS } from "../wizard-config";
import {
  CwCard,
  CwConfirm,
  CwFacetHelp,
  CwField,
  CwFieldLabel,
  CwFieldWarn,
  CwHr,
  CwReq,
  CwTextarea,
} from "../wizard-ui";

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
    <CwCard>
      {/* Creator story */}
      <CwField>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CwFieldLabel htmlFor="cw-bio">
            Tell your creator story <CwReq />
          </CwFieldLabel>
          <button
            type="button"
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-full border px-[13px] py-[7px] text-[12.5px] font-[650] transition-[background,border-color,opacity]",
              "border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--background))] text-primary",
              "hover:enabled:border-[color-mix(in_oklab,var(--primary)_55%,var(--border))] hover:enabled:bg-[color-mix(in_oklab,var(--primary)_15%,var(--background))]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
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
                <Loader2 size={14} className="animate-spin" aria-hidden />
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
        <CwFacetHelp>
          Share what you create, the languages you speak and why brands will
          enjoy working with you.
        </CwFacetHelp>
        <CwTextarea
          id="cw-bio"
          className="min-h-32"
          value={bio}
          disabled={disabled || generatingBio}
          rows={5}
          maxLength={BIO_MAX_CHARS}
          placeholder="Start typing…"
          onChange={(e) => onBioChange(e.target.value)}
        />
        {showAiNotice ? (
          <div
            className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-[11.5px] font-medium leading-snug text-[color-mix(in_oklab,#b45309_82%,var(--foreground))]"
            role="status"
          >
            <Sparkles
              size={15}
              aria-hidden
              className="mt-px shrink-0 text-[color-mix(in_oklab,#b45309_82%,var(--foreground))]"
            />
            <span>
              Fresh from AI, this is a solid first draft, but it doesn&apos;t
              know your vibe yet. Tweak a line or two so it sounds unmistakably{" "}
              <strong>you</strong>.
            </span>
            <button
              type="button"
              className="ml-auto inline-flex shrink-0 rounded-md border-0 bg-transparent p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              onClick={onDismissAiNotice}
              aria-label="Dismiss"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        ) : null}
        {errors.bio ? (
          <CwFieldWarn>
            <AlertTriangle size={13} aria-hidden />
            {errors.bio}
          </CwFieldWarn>
        ) : null}
        <div className="mt-0.5 flex flex-wrap items-center justify-between gap-3">
          <span
            className={cn(
              "text-[11.5px] font-semibold text-muted-foreground",
              bioLen > 0 && bioLen < BIO_MIN_CHARS && "text-destructive",
            )}
            data-short={bioLen > 0 && bioLen < BIO_MIN_CHARS}
          >
            {bioLen} / {BIO_MAX_CHARS} · minimum {BIO_MIN_CHARS} characters
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            No links, phone numbers, emails, social handles or pricing.
          </span>
        </div>
        <button
          type="button"
          className={cn(
            "mt-0.5 inline-flex items-center self-start rounded-full border-[1.4px] border-border bg-background px-3 py-1.5 text-[12.5px] font-[650] text-foreground",
            "hover:border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] hover:text-primary",
            exampleOpen &&
              "border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--background))] text-primary",
          )}
          aria-expanded={exampleOpen}
          onClick={() => setExampleOpen((open) => !open)}
        >
          {exampleOpen ? "Hide example" : "View example"}
        </button>
        {exampleOpen ? (
          <div className="mt-1 rounded-xl bg-muted px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
            <span className="mr-2 inline-block text-[10.5px] font-bold uppercase tracking-[0.05em] text-primary">
              Example
            </span>
            {BIO_EXAMPLE}
          </div>
        ) : null}
      </CwField>

      <CwHr />

      {/* Portfolio gallery */}
      <CwField>
        <CwFieldLabel>
          Your portfolio videos <CwReq />
        </CwFieldLabel>
        <CwFacetHelp>
          Upload your best work (minimum 3 videos). This is what brands browse
          before they book you.
        </CwFacetHelp>
      </CwField>

      {videos.length < 3 ? (
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--primary)_20%,transparent)] bg-[color-mix(in_oklab,var(--primary)_5%,transparent)] px-3.5 py-3 text-[12.5px] leading-normal text-foreground">
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

      <CwConfirm
        checked={confirmed}
        disabled={disabled}
        onToggle={() => onConfirmedChange(!confirmed)}
        title="I confirm these portfolio videos:"
        className="mt-4 items-start"
      >
        <ul className="mt-2.5 flex list-none flex-col gap-2 p-0">
          {PORTFOLIO_CONFIRM_ITEMS.map((item) => (
            <li
              key={item}
              className="relative pl-4 text-[13px] leading-normal text-muted-foreground before:absolute before:left-0 before:top-[0.55em] before:size-1.5 before:rounded-full before:bg-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
        <span className="mt-3 block border-t border-border pt-3 text-[12.5px] leading-normal text-[#b45309]">
          If the quality of your deliveries is significantly lower than your
          portfolio, it may result in order cancellations, disputes, lower
          ratings, reduced visibility, or account review.
        </span>
      </CwConfirm>
      {errors.confirmed ? (
        <CwFieldWarn>
          <AlertTriangle size={13} aria-hidden />
          {errors.confirmed}
        </CwFieldWarn>
      ) : null}
    </CwCard>
  );
}
