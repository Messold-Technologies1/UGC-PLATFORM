"use client";

import "../creator-profile-update/profile-edit.css";
import "./creator-profile-wizard.css";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Eye, Flame, Lightbulb } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import type {
  CreatorFacetSelectionPayload,
  CreatorGender,
  CreatorProfileLanguagePayload,
} from "@/features/creators/api/create-creator-profile";
import type { UpdateCreatorProfilePayload } from "@/features/creators/api/update-creator-profile";

import { useCreatorProfileImage } from "@/features/creators/hooks/use-creator-profile-image";
import { useCreatorIntroVideo } from "@/features/creators/hooks/use-creator-intro-video";
import { useCreatorLocationForm } from "@/features/creators/hooks/use-creator-location-form";
import { useCreatorFacetsForm } from "@/features/creators/hooks/use-creator-facets-form";
import { useCreatorPackagesForm } from "@/features/creators/hooks/use-creator-packages-form";
import { useCreatorAddOnsForm } from "@/features/creators/hooks/use-creator-add-ons-form";
import { useSubmitCreatorProfileMutation } from "@/features/creators/hooks/use-creator-profile-form-mutation";
import { useMyPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-my-portfolio-videos-query";
import { useCreatePortfolioVideoFlowMutation } from "@/features/creator-portfolio/hooks/use-create-portfolio-video-flow-mutation";
import { useUpdatePortfolioVideoMutation } from "@/features/creator-portfolio/hooks/use-update-portfolio-video-mutation";
import { useDeletePortfolioVideoMutation } from "@/features/creator-portfolio/hooks/use-delete-portfolio-video-mutation";
import {
  usePortfolioIndustrySuggestionsQuery,
  usePortfolioTagSuggestionsQuery,
} from "@/features/creator-portfolio/hooks/use-portfolio-suggestion-queries";
import { useAuth } from "@/providers/auth-provider";
import {
  facetSections,
  getInitialCreatorName,
  type PackageDraft,
} from "@/features/creators/hooks/creator-profile-form-utils";
import { capitalizeFirstLetter, toTitleCaseLabel } from "@/lib/string-lists";
import {
  computeGoLiveMissing,
  type GoLiveSnapshot,
} from "@/features/creators/lib/go-live-requirements";
import { PortfolioEditDrawer } from "@/features/creators/components/creator-profile-update/portfolio-components";
import {
  areAllGoLivePoliciesAccepted,
  createEmptyGoLivePolicyAcceptance,
  type GoLivePolicyAcceptanceState,
} from "@/features/creators/components/creator-profile-update/go-live-policy-acceptance";

import {
  WIZARD_STEPS,
  computeProfileStrength,
  BIO_MIN_CHARS,
  type WizardStepId,
  type WizardFacetGroup,
} from "./wizard-config";
import { AboutYouStep } from "./steps/about-you-step";
import { IdentityStep } from "./steps/identity-step";
import { CapabilitiesStep } from "./steps/capabilities-step";
import { IntroVideoStep } from "./steps/intro-video-step";
import { PortfolioStep } from "./steps/portfolio-step";
import { PricingStep } from "./steps/pricing-step";
import { ReviewStep, type ReviewRow } from "./steps/review-step";
import { GoLiveStep } from "./steps/go-live-step";

export type CreatorProfileWizardProps = {
  profileId: string;
  initialProfile: CreatorProfileItemApi;
  onExit?: () => void;
};

const NICHE_DIMENSIONS = new Set([
  "CONTENT_FORMAT",
  "CONTENT_CATEGORY",
  "CATEGORY_EXPERIENCE",
]);

const STEP_INDEX: Record<WizardStepId, number> = WIZARD_STEPS.reduce(
  (acc, step, index) => {
    acc[step.id] = index;
    return acc;
  },
  {} as Record<WizardStepId, number>,
);

// Package price rule mirrored from the long form (>= ₹500, steps of ₹500).
function validatePackagePrice(value: string): string | undefined {
  const price = Number(value);
  if (!Number.isInteger(price) || price < 500 || price % 500 !== 0) {
    return "Package price must be at least ₹500 and in steps of ₹500.";
  }
  return undefined;
}

export function CreatorProfileWizard({
  profileId,
  initialProfile,
  onExit,
}: CreatorProfileWizardProps) {
  const { user } = useAuth();

  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<WizardStepId>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  // ---- Field state ----
  const [displayName, setDisplayName] = useState(
    () => initialProfile.displayName ?? getInitialCreatorName(user),
  );
  const [gender, setGender] = useState<CreatorGender | "">(
    () => (initialProfile.gender as CreatorGender | undefined) ?? "",
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    () => initialProfile.dateOfBirth?.trim() ?? "",
  );
  const [bio, setBio] = useState(() => initialProfile.bio?.trim() ?? "");

  const profileImage = useCreatorProfileImage({ mode: "update", profileId, initialProfile });
  const introVideo = useCreatorIntroVideo({ mode: "update", profileId, initialProfile });
  const location = useCreatorLocationForm({ initialProfile });
  const facets = useCreatorFacetsForm({ initialProfile, enabled: Boolean(user) });
  const packages = useCreatorPackagesForm({ initialProfile });
  const packageDeliveryDays = useMemo(() => {
    const raw = Number(packages.packageDraft.deliveryDays);
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }, [packages.packageDraft.deliveryDays]);
  const addOns = useCreatorAddOnsForm({
    initialProfile,
    enabled: Boolean(user),
    packageDeliveryDays,
  });

  const portfolioQuery = useMyPortfolioVideosQuery({
    enabled: Boolean(user),
    staleTime: 2 * 60_000,
  });
  const createPortfolioMutation = useCreatePortfolioVideoFlowMutation({ preventRedirect: true });
  const updatePortfolioMutation = useUpdatePortfolioVideoMutation();
  const deletePortfolioMutation = useDeletePortfolioVideoMutation();
  const industrySuggestionsQuery = usePortfolioIndustrySuggestionsQuery({ enabled: Boolean(user) });
  const tagSuggestionsQuery = usePortfolioTagSuggestionsQuery({ enabled: Boolean(user) });

  const languageDrafts = facets.languageDrafts;
  const [languageConfirmed, setLanguageConfirmed] = useState<boolean>(
    () => (initialProfile.profileLanguages ?? []).length > 0,
  );
  const [introConfirmed, setIntroConfirmed] = useState<boolean>(
    () => Boolean(introVideo.introVideoPreviewUrl),
  );
  const [goLivePolicies, setGoLivePolicies] = useState<GoLivePolicyAcceptanceState>(
    () => createEmptyGoLivePolicyAcceptance(Boolean(initialProfile.completeProfile)),
  );
  const [packageErrors, setPackageErrors] = useState<{
    priceAmount?: string;
    deliveryDays?: string;
    videoLengthSeconds?: string;
  }>({});

  // ---- Portfolio drawer ----
  const [pfDrawerOpen, setPfDrawerOpen] = useState(false);
  const [pfEditingVideo, setPfEditingVideo] = useState<PortfolioVideoApi | null>(null);
  const pfVideoInputRef = useRef<HTMLInputElement | null>(null);
  const pfThumbInputRef = useRef<HTMLInputElement | null>(null);
  const [pfPendingVideoFile, setPfPendingVideoFile] = useState<File | null>(null);
  const [pfPendingThumbFile, setPfPendingThumbFile] = useState<File | null>(null);

  const openPortfolioDrawer = useCallback((video: PortfolioVideoApi | null) => {
    setPfEditingVideo(video);
    setPfPendingVideoFile(null);
    setPfPendingThumbFile(null);
    setPfDrawerOpen(true);
  }, []);

  const portfolioIndustrySuggestions = useMemo(
    () => (industrySuggestionsQuery.data ?? []).map((n) => toTitleCaseLabel(n)),
    [industrySuggestionsQuery.data],
  );
  const portfolioTagSuggestions = useMemo(
    () => (tagSuggestionsQuery.data ?? []).map((n) => capitalizeFirstLetter(n)),
    [tagSuggestionsQuery.data],
  );

  const selectedLanguageCount = useMemo(
    () => languageDrafts.filter((r) => r.slug !== "").length,
    [languageDrafts],
  );

  // ---- Save mutation ----
  const pendingActionRef = useRef<
    { completeId: WizardStepId; nextIndex: number; goLive?: boolean } | null
  >(null);
  const submitMutation = useSubmitCreatorProfileMutation({
    mode: "update",
    profileId,
    onSuccess: () => {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      if (!action) return;
      setCompleted((prev) => new Set(prev).add(action.completeId));
      if (action.goLive) setSubmitted(true);
      setActiveIndex(action.nextIndex);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
  const pending = submitMutation.isPending;
  const activeStep = WIZARD_STEPS[activeIndex];
  const ActiveIcon = activeStep.icon;

  // ---- Derived ----
  const languageLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of facets.facetOptionsByDimension.LANGUAGE ?? []) map.set(opt.slug, opt.label);
    return map;
  }, [facets.facetOptionsByDimension.LANGUAGE]);

  const previewLanguages = useMemo(
    () =>
      languageDrafts
        .filter((r) => r.slug !== "")
        .map((r) => languageLabelBySlug.get(r.slug) ?? r.slug)
        .slice(0, 3),
    [languageDrafts, languageLabelBySlug],
  );

  const publicPortfolioCount = useMemo(
    () => (portfolioQuery.data ?? []).filter((v) => v.visibilityStatus === "public").length,
    [portfolioQuery.data],
  );

  const selectedFacets = facets.selectedFacets;
  const facetCount = useCallback(
    (dimension: string) =>
      (selectedFacets[dimension as keyof typeof selectedFacets] ?? []).length,
    [selectedFacets],
  );

  const strength = useMemo(() => {
    const hasNiche = Object.entries(facets.selectedFacets).some(
      ([dim, vals]) => NICHE_DIMENSIONS.has(dim) && (vals?.length ?? 0) > 0,
    );
    return computeProfileStrength({
      hasPhoto: Boolean(profileImage.profileImagePreviewUrl),
      hasName: displayName.trim().length > 0,
      hasDob: Boolean(dateOfBirth),
      hasGender: Boolean(gender),
      hasCity: location.city.trim().length > 0,
      hasLanguage: selectedLanguageCount > 0,
      hasBio: bio.trim().length >= BIO_MIN_CHARS,
      hasNiche,
      hasPackage: Boolean(validatePackagePrice(packages.packageDraft.priceAmount) === undefined),
      hasIntroVideo: Boolean(introVideo.introVideoPreviewUrl),
      portfolioCount: (portfolioQuery.data ?? []).length,
    });
  }, [
    facets.selectedFacets,
    profileImage.profileImagePreviewUrl,
    displayName,
    dateOfBirth,
    gender,
    location.city,
    selectedLanguageCount,
    bio,
    packages.packageDraft.priceAmount,
    introVideo.introVideoPreviewUrl,
    portfolioQuery.data,
  ]);

  const goLiveSnapshot = useMemo<GoLiveSnapshot>(() => {
    const selectedFacetDimensions = Object.entries(facets.selectedFacets)
      .filter(([, values]) => Array.isArray(values) && values.length > 0)
      .map(([dimension]) => dimension);
    const pkg = packages.packageDraft;
    const hasPackage =
      pkg.priceAmount.trim() !== "" &&
      Number(pkg.videoLengthSeconds) > 0 &&
      Number(pkg.deliveryDays) > 0;
    return {
      hasPhoto: Boolean(profileImage.profileImagePreviewUrl),
      hasIntroVideo: Boolean(introVideo.introVideoPreviewUrl),
      displayName,
      contactEmail: user?.email ?? "",
      bio,
      countryName: location.countryName ?? "",
      stateName: location.stateName ?? "",
      city: location.city ?? "",
      gender,
      dateOfBirth,
      shippingAddress: initialProfile.shippingAddress ?? "",
      selectedFacetDimensions,
      languageCount: selectedLanguageCount,
      hasPackage,
      publicVideoCount: publicPortfolioCount,
      policiesAccepted: areAllGoLivePoliciesAccepted(goLivePolicies),
    };
  }, [
    facets.selectedFacets,
    packages.packageDraft,
    profileImage.profileImagePreviewUrl,
    introVideo.introVideoPreviewUrl,
    displayName,
    user?.email,
    bio,
    location.countryName,
    location.stateName,
    location.city,
    gender,
    dateOfBirth,
    initialProfile.shippingAddress,
    selectedLanguageCount,
    publicPortfolioCount,
    goLivePolicies,
  ]);

  const goLiveMissing = useMemo(() => computeGoLiveMissing(goLiveSnapshot), [goLiveSnapshot]);

  // ---- Payload + persistence ----
  const buildPayload = useCallback(
    (includePackages: boolean): UpdateCreatorProfilePayload | null => {
      const facetSelections: CreatorFacetSelectionPayload[] = [];
      for (const section of facetSections) {
        for (const slug of facets.selectedFacets[section.dimension] ?? []) {
          facetSelections.push({ dimension: section.dimension, slug });
        }
      }
      const profileLanguages: CreatorProfileLanguagePayload[] = languageDrafts
        .filter((r) => r.slug !== "")
        .map((r) => ({ slug: r.slug, fluency: r.fluency }));

      const payload: UpdateCreatorProfilePayload = {
        displayName: displayName.trim(),
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        countryName: location.countryName || undefined,
        stateName: location.stateName || undefined,
        city: location.city.trim() || undefined,
        bio: bio.trim() || undefined,
        contactEmail: user?.email || undefined,
        facetSelections,
        profileLanguages,
        ...(profileImage.profileImageRemoved
          ? { profileImageKey: "" }
          : profileImage.pendingProfileImageKey
            ? { profileImageKey: profileImage.pendingProfileImageKey }
            : {}),
        ...(introVideo.pendingIntroVideoKey
          ? { introVideoKey: introVideo.pendingIntroVideoKey }
          : introVideo.introVideoRemoved
            ? { introVideoKey: "" }
            : {}),
      };

      if (includePackages) {
        const builtPackages = packages.buildPackages();
        const builtAddOns = addOns.buildAddOns();
        if (!builtPackages || !builtAddOns) return null;
        payload.packages = builtPackages;
        payload.addOns = builtAddOns;
      }
      return payload;
    },
    [
      facets.selectedFacets,
      languageDrafts,
      displayName,
      gender,
      dateOfBirth,
      location.countryName,
      location.stateName,
      location.city,
      bio,
      user?.email,
      profileImage.profileImageRemoved,
      profileImage.pendingProfileImageKey,
      introVideo.pendingIntroVideoKey,
      introVideo.introVideoRemoved,
      packages,
      addOns,
    ],
  );

  // ---- Per-step validation ----
  const validateStep = useCallback(
    (id: WizardStepId): string[] => {
      const missing: string[] = [];
      if (id === "about") {
        if (!displayName.trim()) missing.push("your full name");
        if (!dateOfBirth) missing.push("date of birth");
        if (!gender) missing.push("gender");
        if (!location.city.trim()) missing.push("city");
        if (selectedLanguageCount === 0) missing.push("at least one language");
        if (selectedLanguageCount > 0 && !languageConfirmed)
          missing.push("the language confirmation");
      } else if (id === "identity") {
        if (facetCount("CONTENT_CATEGORY") === 0) missing.push("what you create");
        if (facetCount("CATEGORY_EXPERIENCE") === 0)
          missing.push("your category experience");
        if (bio.trim().length < BIO_MIN_CHARS)
          missing.push(`a bio of at least ${BIO_MIN_CHARS} characters`);
      } else if (id === "capabilities") {
        if (facetCount("CONTENT_FORMAT") === 0) missing.push("who can appear in your videos");
      } else if (id === "intro-video") {
        if (!introVideo.introVideoPreviewUrl) missing.push("an intro video");
        else if (!introConfirmed) missing.push("the intro video confirmation");
      } else if (id === "pricing") {
        const priceErr = validatePackagePrice(packages.packageDraft.priceAmount);
        if (priceErr) missing.push("a valid starting price");
      }
      return missing;
    },
    [
      displayName,
      dateOfBirth,
      gender,
      location.city,
      selectedLanguageCount,
      languageConfirmed,
      facetCount,
      bio,
      introVideo.introVideoPreviewUrl,
      introConfirmed,
      packages.packageDraft.priceAmount,
    ],
  );

  const isEighteenPlus = useMemo(() => {
    if (!dateOfBirth) return true;
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return true;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    return dob <= cutoff;
  }, [dateOfBirth]);

  const persist = useCallback(
    (opts: { completeId: WizardStepId; nextIndex: number; includePackages?: boolean; goLive?: boolean }) => {
      if (introVideo.uploadingIntroVideo || profileImage.uploadingProfileImage) {
        toast.error("Hang on — an upload is still finishing.");
        return;
      }
      const payload = buildPayload(Boolean(opts.includePackages) || Boolean(opts.goLive));
      if (!payload) {
        toast.error("Check your pricing details before continuing.");
        return;
      }
      pendingActionRef.current = {
        completeId: opts.completeId,
        nextIndex: opts.nextIndex,
        goLive: opts.goLive,
      };
      submitMutation.mutate({
        payload: opts.goLive
          ? { ...payload, goLive: true, acceptedGoLivePolicies: true }
          : payload,
      });
    },
    [buildPayload, introVideo.uploadingIntroVideo, profileImage.uploadingProfileImage, submitMutation],
  );

  const handleContinue = useCallback(() => {
    const id = activeStep.id;
    if (id === "go-live") {
      onExit?.();
      return;
    }

    const missing = validateStep(id);
    if (missing.length > 0) {
      toast.error(`Almost there — add ${missing.join(", ")}.`);
      return;
    }
    if (id === "about" && !isEighteenPlus) {
      toast.error("Creators must be at least 18 years old.");
      return;
    }

    if (id === "review") {
      if (goLiveMissing.length > 0) {
        toast.error(`Still needed to go live: ${goLiveMissing.join(", ")}.`);
        return;
      }
      persist({
        completeId: "review",
        nextIndex: STEP_INDEX["go-live"],
        includePackages: true,
        goLive: true,
      });
      return;
    }

    persist({
      completeId: id,
      nextIndex: Math.min(activeIndex + 1, WIZARD_STEPS.length - 1),
      includePackages: id === "pricing",
    });
  }, [activeStep.id, validateStep, isEighteenPlus, goLiveMissing, persist, activeIndex, onExit]);

  const goToStep = useCallback(
    (index: number) => {
      const target = WIZARD_STEPS[index];
      if (!target) return;
      if (target.ready || completed.has(target.id) || index <= activeIndex) {
        setActiveIndex(index);
      }
    },
    [activeIndex, completed],
  );

  const initials = useMemo(() => {
    const source = displayName.trim() || user?.name?.trim() || "";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "You";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [displayName, user?.name]);

  // Package editor onChange with live price validation (mirrors the long form).
  const onPackageChange = useCallback((draft: PackageDraft) => {
    packages.setPackageDraft(draft);
    setPackageErrors((prev) => ({ ...prev, priceAmount: validatePackagePrice(draft.priceAmount) }));
  }, [packages]);

  // ---- Review rows ----
  const reviewRows = useMemo<ReviewRow[]>(() => {
    const languageSummary = languageDrafts
      .filter((r) => r.slug !== "")
      .map((r) => {
        const label = languageLabelBySlug.get(r.slug) ?? r.slug;
        const fluency = r.fluency.charAt(0) + r.fluency.slice(1).toLowerCase();
        return `${label} (${fluency})`;
      })
      .join(", ");
    const locationSummary = [location.city, location.stateName, location.countryName]
      .filter(Boolean)
      .join(", ");

    const aboutOk =
      displayName.trim() && dateOfBirth && gender && location.city.trim() && selectedLanguageCount > 0;
    const identityOk = facetCount("CONTENT_CATEGORY") > 0 && bio.trim().length >= BIO_MIN_CHARS;
    const capOk = facetCount("CONTENT_FORMAT") > 0;
    const introOk = Boolean(introVideo.introVideoPreviewUrl);
    const pricingOk = validatePackagePrice(packages.packageDraft.priceAmount) === undefined;
    const addOnCount = addOns.selectedAddOnSlugs.length;

    return [
      {
        stepId: "about",
        title: "About You",
        status: aboutOk ? "complete" : "incomplete",
        details: [
          { label: "Name", value: displayName.trim() || "—" },
          { label: "Location", value: locationSummary || "—" },
          { label: "Languages", value: languageSummary || "—" },
        ],
      },
      {
        stepId: "identity",
        title: "Creator Identity & Discovery",
        status: identityOk ? "complete" : "incomplete",
      },
      {
        stepId: "capabilities",
        title: "Content Capabilities",
        status: capOk ? "complete" : "incomplete",
      },
      {
        stepId: "intro-video",
        title: "Intro Video",
        status: introOk ? "complete" : "incomplete",
      },
      {
        stepId: "portfolio",
        title: "Portfolio",
        status: publicPortfolioCount >= 3 ? "complete" : "improve",
        summary: `${publicPortfolioCount} of 10 videos. ${
          publicPortfolioCount >= 3
            ? "Great range — add more to boost visibility."
            : "Add more to unlock higher Profile Strength."
        }`,
      },
      {
        stepId: "pricing",
        title: "Pricing, Delivery & Add-ons",
        status: pricingOk ? "complete" : "incomplete",
        summary: pricingOk
          ? `₹${Number(packages.packageDraft.priceAmount).toLocaleString("en-IN")} base · ${packages.packageDraft.deliveryDays}-day delivery${addOnCount > 0 ? ` · ${addOnCount} add-on${addOnCount > 1 ? "s" : ""} on` : ""}`
          : "Set your starting price to continue.",
      },
    ];
  }, [
    languageDrafts,
    languageLabelBySlug,
    location.city,
    location.stateName,
    location.countryName,
    displayName,
    dateOfBirth,
    gender,
    selectedLanguageCount,
    facetCount,
    bio,
    introVideo.introVideoPreviewUrl,
    packages.packageDraft,
    addOns.selectedAddOnSlugs.length,
    publicPortfolioCount,
  ]);

  const continueLabel = useMemo(() => {
    if (activeStep.id === "review") return "Submit my profile";
    if (activeStep.id === "go-live") return "Go to dashboard";
    if (activeStep.id === "portfolio") return "Almost there";
    return "Continue Building Profile";
  }, [activeStep.id]);

  return (
    <div className="pe-scope cw-root">
      <div className="cw-topline">
        <span>
          Step {activeIndex + 1} of {WIZARD_STEPS.length}
          {completed.size > 0 ? " · saved just now" : ""}
        </span>
        <span className="cw-topline-avatar" aria-hidden>
          {initials}
        </span>
      </div>

      <div className="cw-layout">
        {/* ---- Left rail ---- */}
        <aside className="cw-rail">
          <div className="cw-rail-intro">
            <h2 className="cw-rail-title">Complete Your Creator Profile</h2>
            <p className="cw-rail-sub">
              Build a profile that helps brands discover and trust you.
            </p>
          </div>

          <div className="cw-strength">
            <div className="cw-strength-head">
              <Flame size={16} aria-hidden />
              <span>Profile Strength</span>
            </div>
            <div className="cw-strength-pct">{strength.pct}%</div>
            <div className="cw-strength-track">
              <motion.div
                className="cw-strength-fill"
                initial={false}
                animate={{ width: `${strength.pct}%` }}
                transition={{ type: "spring", stiffness: 160, damping: 26 }}
              />
            </div>
            <p className="cw-strength-hint">{strength.hint}</p>
          </div>

          <nav className="cw-steps" aria-label="Onboarding steps">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === activeIndex;
              const isDone = completed.has(step.id);
              const isReachable = step.ready || isDone || index <= activeIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  className="cw-step"
                  data-active={isActive}
                  data-done={isDone}
                  disabled={!isReachable}
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => goToStep(index)}
                >
                  <span className="cw-step-dot">
                    {isDone ? <Check size={12} strokeWidth={3} /> : index + 1}
                  </span>
                  <span className="cw-step-label">{step.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="cw-preview">
            <div className="cw-preview-head">
              <Eye size={14} aria-hidden />
              <span>How brands see you</span>
            </div>
            <div className="cw-preview-body">
              <div
                className="cw-preview-avatar"
                data-empty={!profileImage.profileImagePreviewUrl}
              >
                {profileImage.profileImagePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImage.profileImagePreviewUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
              </div>
              <div className="cw-preview-meta">
                {displayName.trim() ? (
                  <span className="cw-preview-name">{displayName.trim()}</span>
                ) : (
                  <span className="cw-preview-skel" />
                )}
                {previewLanguages.length > 0 ? (
                  <div className="cw-preview-langs">
                    {previewLanguages.map((label) => (
                      <span key={label} className="cw-preview-pill">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <p className="cw-preview-note">This card fills in as you complete each step.</p>
          </div>

          <div className="cw-tip">
            <Lightbulb size={14} aria-hidden />
            <p>Creators with 10+ portfolio pieces get 3× more orders.</p>
          </div>
        </aside>

        {/* ---- Content pane ---- */}
        <div className="cw-pane">
          <div className="cw-pane-head">
            <span className="cw-pane-icon">
              <ActiveIcon size={22} />
            </span>
            <div>
              <h1 className="cw-pane-title">{activeStep.title}</h1>
              <p className="cw-pane-tag">{activeStep.tagline}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              {activeStep.id === "about" ? (
                <AboutYouStep
                  disabled={pending}
                  displayName={displayName}
                  onDisplayNameChange={setDisplayName}
                  profileImagePreviewUrl={profileImage.profileImagePreviewUrl}
                  uploadingProfileImage={profileImage.uploadingProfileImage}
                  profileImageInputRef={profileImage.profileImageInputRef}
                  onSelectProfileImage={(file) =>
                    void profileImage.handleProfileImageSelected(file)
                  }
                  dateOfBirth={dateOfBirth}
                  onDateOfBirthChange={setDateOfBirth}
                  gender={gender}
                  onGenderChange={setGender}
                  countryCode={location.countryCode}
                  countries={location.countries}
                  onCountryChange={(value) => {
                    location.setCountryCode(value);
                    location.setStateCode("");
                    location.setCity("");
                  }}
                  stateCode={location.stateCode}
                  states={location.states}
                  onStateChange={(value) => {
                    location.setStateCode(value);
                    location.setCity("");
                  }}
                  city={location.city}
                  cities={location.cities}
                  onCityChange={location.setCity}
                  languageOptions={facets.facetOptionsByDimension.LANGUAGE ?? []}
                  languageDrafts={languageDrafts}
                  languagesLoading={facets.facetOptionsQuery.isLoading}
                  onAddLanguage={(slug) => facets.addLanguage(slug)}
                  onRemoveLanguage={(index) => facets.removeLanguage(index)}
                  onUpdateLanguageSlug={(index, slug) => facets.updateLanguageSlug(index, slug)}
                  onFluencyChange={(index, fluency) => facets.updateLanguageFluency(index, fluency)}
                  languageConfirmed={languageConfirmed}
                  onLanguageConfirmedChange={setLanguageConfirmed}
                />
              ) : activeStep.id === "identity" ? (
                <IdentityStep
                  disabled={pending}
                  optionsByDimension={facets.facetOptionsByDimension}
                  selectedFacets={facets.selectedFacets}
                  onToggleFacet={(group: WizardFacetGroup, slug: string) =>
                    facets.toggleFacet(group.dimension, slug)
                  }
                  profileId={profileId}
                  bio={bio}
                  onBioChange={(v) => setBio(v.slice(0, 500))}
                />
              ) : activeStep.id === "capabilities" ? (
                <CapabilitiesStep
                  disabled={pending}
                  optionsByDimension={facets.facetOptionsByDimension}
                  selectedFacets={facets.selectedFacets}
                  onToggleFacet={(group: WizardFacetGroup, slug: string) =>
                    facets.toggleFacet(group.dimension, slug)
                  }
                />
              ) : activeStep.id === "intro-video" ? (
                <IntroVideoStep
                  disabled={pending}
                  videoPreviewUrl={introVideo.introVideoPreviewUrl}
                  uploading={introVideo.uploadingIntroVideo}
                  fileInputRef={introVideo.introVideoInputRef}
                  onSelectFile={(file) => void introVideo.handleIntroVideoSelected(file)}
                  confirmed={introConfirmed}
                  onConfirmedChange={setIntroConfirmed}
                />
              ) : activeStep.id === "portfolio" ? (
                <PortfolioStep
                  loading={portfolioQuery.isLoading}
                  error={portfolioQuery.isError}
                  onRetry={() => void portfolioQuery.refetch()}
                  videos={portfolioQuery.data ?? []}
                  onAdd={() => openPortfolioDrawer(null)}
                  onEdit={(video) => openPortfolioDrawer(video)}
                  onDelete={(video) => deletePortfolioMutation.mutate({ videoId: video.id })}
                />
              ) : activeStep.id === "pricing" ? (
                <PricingStep
                  disabled={pending}
                  packageDraft={packages.packageDraft}
                  onPackageChange={onPackageChange}
                  packageErrors={packageErrors}
                  addOnOptions={addOns.addOnOptions}
                  selectedAddOnSlugs={addOns.selectedAddOnSlugs}
                  addOnDrafts={addOns.addOnDrafts}
                  unmatchedNames={addOns.hydratedAddOns.unmatchedNames}
                  packageDeliveryDays={packageDeliveryDays}
                  addOnsLoading={addOns.addOnOptionsQuery.isLoading}
                  addOnsError={addOns.addOnOptionsQuery.isError}
                  onAddOnsRetry={() => void addOns.addOnOptionsQuery.refetch()}
                  onToggleAddOn={(option) => addOns.toggleAddOn(option)}
                  onAddOnDraftChange={(slug, patch) => addOns.updateAddOnDraft(slug, patch)}
                />
              ) : activeStep.id === "review" ? (
                <ReviewStep
                  rows={reviewRows}
                  onEditStep={(stepId) => setActiveIndex(STEP_INDEX[stepId])}
                  policies={goLivePolicies}
                  onPoliciesChange={setGoLivePolicies}
                  policiesDisabled={Boolean(initialProfile.completeProfile)}
                  onAddPayout={() => onExit?.()}
                />
              ) : (
                <GoLiveStep
                  submitted={submitted}
                  strengthPct={strength.pct}
                  strengthHint={strength.hint}
                  onUploadMore={() => setActiveIndex(STEP_INDEX.portfolio)}
                  onGoToDashboard={() => onExit?.()}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          {activeStep.id !== "go-live" ? (
            <div className="cw-foot">
              <span className="cw-foot-note">Autosaved. You can come back any time.</span>
              <div className="cw-foot-actions">
                <button
                  type="button"
                  className="cw-btn cw-btn-ghost"
                  disabled={pending}
                  onClick={() => {
                    if (activeIndex === 0) onExit?.();
                    else setActiveIndex((idx) => Math.max(0, idx - 1));
                  }}
                >
                  <ArrowLeft size={16} />
                  {activeIndex === 0 ? "Exit" : "Back"}
                </button>
                <button
                  type="button"
                  className="cw-btn cw-btn-primary"
                  onClick={handleContinue}
                  disabled={
                    pending ||
                    profileImage.uploadingProfileImage ||
                    introVideo.uploadingIntroVideo
                  }
                >
                  {pending ? (
                    <>
                      <Spinner className="size-4" aria-hidden />
                      {activeStep.id === "review" ? "Submitting…" : "Saving…"}
                    </>
                  ) : (
                    <>
                      {continueLabel}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Portfolio editor drawer */}
      <PortfolioEditDrawer
        video={pfEditingVideo}
        open={pfDrawerOpen}
        onClose={() => setPfDrawerOpen(false)}
        videoFile={pfPendingVideoFile}
        thumbFile={pfPendingThumbFile}
        videoInputRef={pfVideoInputRef}
        thumbInputRef={pfThumbInputRef}
        onSelectVideoFile={setPfPendingVideoFile}
        onSelectThumbFile={setPfPendingThumbFile}
        industrySuggestions={portfolioIndustrySuggestions}
        tagSuggestions={portfolioTagSuggestions}
        languageOptions={(facets.facetOptionsByDimension.LANGUAGE ?? []).map((lang) => ({
          value: lang.slug,
          label: lang.label,
        }))}
        onSave={(form) => {
          if (pfEditingVideo) {
            updatePortfolioMutation.mutate(
              { videoId: pfEditingVideo.id, payload: form },
              { onSuccess: () => setPfDrawerOpen(false) },
            );
          } else if (pfPendingVideoFile) {
            createPortfolioMutation.mutate(
              {
                videoFile: pfPendingVideoFile,
                thumbnailFile: pfPendingThumbFile,
                visibility: form.visibilityStatus ?? "public",
                metadataPatch: form,
              },
              { onSuccess: () => setPfDrawerOpen(false) },
            );
          } else {
            toast.error("Please select a video file first.");
          }
        }}
        onDelete={(video) => {
          deletePortfolioMutation.mutate({ videoId: video.id });
          setPfDrawerOpen(false);
        }}
        isSaving={createPortfolioMutation.isPending || updatePortfolioMutation.isPending}
      />
    </div>
  );
}
