"use client";

import { Instagram } from "lucide-react";

import type { CreatorFacetDimension } from "@/features/creators/api/get-creator-facet-options";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";
import { CreatorSocialAccounts } from "@/features/creators/components/creator-profile-update/creator-social-accounts";

import {
  IDENTITY_FACET_GROUPS,
  BIO_MIN_CHARS,
  BIO_MAX_CHARS,
  type WizardFacetGroup,
} from "../wizard-config";
import { FacetGroups } from "./wizard-parts";

const BIO_EXAMPLE =
  "I'm a Mumbai-based beauty and skincare creator shooting in Hindi and English. I make honest first-impression reviews, GRWM routines and product demos, mostly at home with natural light. Brands book me when they want a warm, unscripted voice rather than a polished ad read.";

type SelectedFacets = Partial<
  Record<Exclude<CreatorFacetDimension, "LANGUAGE">, string[]>
>;

export type IdentityStepProps = {
  disabled: boolean;
  optionsByDimension: Partial<Record<CreatorFacetDimension, CreatorFacetOption[]>>;
  selectedFacets: SelectedFacets;
  onToggleFacet: (group: WizardFacetGroup, slug: string) => void;
  profileId: string;
  bio: string;
  onBioChange: (value: string) => void;
};

export function IdentityStep({
  disabled,
  optionsByDimension,
  selectedFacets,
  onToggleFacet,
  profileId,
  bio,
  onBioChange,
}: IdentityStepProps) {
  const bioLen = bio.trim().length;
  return (
    <div className="cw-card">
      <FacetGroups
        groups={IDENTITY_FACET_GROUPS}
        optionsByDimension={optionsByDimension}
        selectedFacets={selectedFacets}
        disabled={disabled}
        onToggle={onToggleFacet}
      />

      <div className="cw-hr" />

      {/* Connected accounts */}
      <div className="cw-facet">
        <div className="cw-facet-label">
          <span>
            <Instagram size={14} aria-hidden style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Connected accounts
          </span>
        </div>
        <span className="cw-facet-help">
          Link your Instagram to showcase live audience metrics and
          demographics. YouTube and Reddit are coming soon.
        </span>
        <div style={{ marginTop: 12 }}>
          <CreatorSocialAccounts profileId={profileId} />
        </div>
      </div>

      <div className="cw-hr" />

      {/* Creator story */}
      <div className="cw-field">
        <label htmlFor="cw-bio" className="cw-fieldlabel">
          Tell your creator story <span className="cw-req">*</span>
        </label>
        <span className="cw-facet-help">
          Share what you create, the languages you speak and why brands will
          enjoy working with you.
        </span>
        <textarea
          id="cw-bio"
          className="cw-textarea"
          value={bio}
          disabled={disabled}
          rows={5}
          maxLength={BIO_MAX_CHARS}
          placeholder="Start typing…"
          onChange={(e) => onBioChange(e.target.value)}
        />
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
    </div>
  );
}
