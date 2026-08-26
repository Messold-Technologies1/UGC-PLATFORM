"use client";

import "../creator-profile-update/profile-edit.css";
import "./creator-profile-wizard.css";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lightbulb,
} from "lucide-react";

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
import { useSocialConnectionsQuery } from "@/features/creators/hooks/use-social-connections";
import {
  useSubmitCreatorProfileMutation,
  useGenerateCreatorBioMutation,
  useResolveFacetOtherMutation,
} from "@/features/creators/hooks/use-creator-profile-form-mutation";
import type { OtherNotices } from "./steps/identity-step";
import type { CreatorFacetDimension } from "@/features/creators/api/get-creator-facet-options";
import type { ResolveFacetOtherResponse } from "@/features/creators/api/resolve-facet-other";
import { useMyPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-my-portfolio-videos-query";
import { useAdminPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-admin-portfolio-videos-query";
import { useCreatePortfolioVideoFlowMutation } from "@/features/creator-portfolio/hooks/use-create-portfolio-video-flow-mutation";
import { useReplacePortfolioVideoFlowMutation } from "@/features/creator-portfolio/hooks/use-replace-portfolio-video-flow-mutation";
import { useDeletePortfolioVideoMutation } from "@/features/creator-portfolio/hooks/use-delete-portfolio-video-mutation";
import { getInstagramConnectUrl } from "@/features/creators/api/social-connections";
import { useAuth } from "@/providers/auth-provider";
import {
  facetSections,
  getInitialCreatorName,
  PACKAGE_MIN_DELIVERY_DAYS,
  PACKAGE_MAX_DELIVERY_DAYS,
  type PackageDraft,
} from "@/features/creators/hooks/creator-profile-form-utils";
import {
  computeGoLiveMissing,
  MIN_PORTFOLIO_VIDEOS,
  REQUIRED_SECONDARY_NICHES,
  type GoLiveSnapshot,
} from "@/features/creators/lib/go-live-requirements";
import { PortfolioFileDrawer } from "@/features/creators/components/creator-profile-update/portfolio-components";
import { AddReelSourceSheet } from "@/features/instagram-import/components/add-reel-source-sheet";
import { InstagramReelGallery } from "@/features/instagram-import/components/instagram-reel-gallery";
import {
  areAllGoLivePoliciesAccepted,
  createEmptyGoLivePolicyAcceptance,
  type GoLivePolicyAcceptanceState,
} from "@/features/creators/components/creator-profile-update/go-live-policy-acceptance";

import {
  WIZARD_STEPS,
  computeProfileStrength,
  BIO_MIN_CHARS,
  BIO_MAX_CHARS,
  OPEN_TO_OPTIONS,
  type WizardStepId,
} from "./wizard-config";
import { AboutYouStep } from "./steps/about-you-step";
import { YourBaseStep } from "./steps/your-base-step";
import { IdentityStep } from "./steps/identity-step";
import { IntroVideoStep } from "./steps/intro-video-step";
import { PortfolioStep } from "./steps/portfolio-step";
import { PricingStep } from "./steps/pricing-step";
import { ReviewStep, type ReviewRow } from "./steps/review-step";
import { GoLiveStep } from "./steps/go-live-step";

export type CreatorProfileWizardProps = {
  profileId: string;
  initialProfile: CreatorProfileItemApi;
  /** Admin editing a creator on their behalf. */
  adminMode?: boolean;
  onExit?: () => void;
};

const NICHE_DIMENSIONS = new Set(["CONTENT_CATEGORY"]);

/** Steps to drop once the profile is already listed (live & approved). */
const LISTED_HIDDEN_STEPS = new Set<WizardStepId>(["review", "go-live"]);

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
  adminMode = false,
  onExit,
}: CreatorProfileWizardProps) {
  const { user } = useAuth();
  const contactEmail = adminMode
    ? (initialProfile.contactEmail?.trim() ?? "")
    : (user?.email ?? "");

  const [activeIndex, setActiveIndex] = useState(0);
  const [triedContinue, setTriedContinue] = useState<
    Partial<Record<WizardStepId, boolean>>
  >({});
  const [completed, setCompleted] = useState<Set<WizardStepId>>(new Set());
  const [submitted, setSubmitted] = useState(() =>
    Boolean(initialProfile.completeProfile),
  );

  // An already-live (or admin-edited) profile behaves like a free editor:
  // every step is reachable from the rail, filled steps show as done, and each
  // step is saved on its own instead of walking the onboarding funnel.
  const canEditFreely = adminMode || Boolean(initialProfile.completeProfile);
  // Tracks unsaved edits on the current step so we can warn before navigating.
  const [dirty, setDirty] = useState(false);
  const markDirty = useCallback(() => setDirty(true), []);
  const confirmLeaveIfDirty = useCallback((): boolean => {
    if (!dirty) return true;
    if (typeof window === "undefined") return true;
    return window.confirm(
      "You have unsaved changes on this step. Leave without saving?",
    );
  }, [dirty]);

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
  const [shippingAddress, setShippingAddress] = useState(
    () => initialProfile.shippingAddress?.trim() ?? "",
  );
  const [phone, setPhone] = useState(
    () => initialProfile.phone?.replace("+91", "") ?? "",
  );

  const enabled = adminMode || Boolean(user);
  const profileImage = useCreatorProfileImage({
    mode: "update",
    profileId,
    initialProfile,
  });
  const introVideo = useCreatorIntroVideo({
    mode: "update",
    profileId,
    initialProfile,
  });
  const location = useCreatorLocationForm({ initialProfile, adminMode });
  const facets = useCreatorFacetsForm({ initialProfile, enabled });
  const packages = useCreatorPackagesForm({ initialProfile });
  const addOns = useCreatorAddOnsForm({
    initialProfile,
    enabled,
  });

  const myPortfolioQuery = useMyPortfolioVideosQuery({
    enabled: !adminMode && Boolean(user),
    staleTime: 2 * 60_000,
  });
  const adminPortfolioQuery = useAdminPortfolioVideosQuery({
    creatorId: profileId,
    enabled: adminMode,
    staleTime: 2 * 60_000,
  });
  const portfolioQuery = adminMode ? adminPortfolioQuery : myPortfolioQuery;
  const createPortfolioMutation = useCreatePortfolioVideoFlowMutation({
    preventRedirect: true,
  });
  const replacePortfolioMutation = useReplacePortfolioVideoFlowMutation();
  const deletePortfolioMutation = useDeletePortfolioVideoMutation();

  // An active Instagram connection is required to go live. The connections
  // endpoint returns the signed-in user's own accounts, so only gate on it for
  // creators editing their own profile — admins can't connect on a creator's
  // behalf, and the server enforces the requirement per-creator regardless.
  const socialConnectionsQuery = useSocialConnectionsQuery({
    enabled: !adminMode && Boolean(user),
  });
  const instagramConnected =
    adminMode ||
    (socialConnectionsQuery.data ?? []).some(
      (connection) =>
        connection.platform === "INSTAGRAM" && connection.status === "ACTIVE",
    );

  /** Drives the Instagram option in the add-reel chooser. */
  const instagramChooserState:
    | "connected"
    | "not_connected"
    | "reconnect_required" = (() => {
    const connection = (socialConnectionsQuery.data ?? []).find(
      (c) => c.platform === "INSTAGRAM",
    );
    if (!connection) return "not_connected";
    return connection.status === "ACTIVE" ? "connected" : "reconnect_required";
  })();

  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const startInstagramConnect = useCallback(async () => {
    setConnectingInstagram(true);
    try {
      // Come back to this page, not settings, so the creator keeps their place.
      const url = await getInstagramConnectUrl(
        `${window.location.pathname}${window.location.search}`,
      );
      window.location.href = url;
    } catch {
      toast.error("Could not start the Instagram connection");
      setConnectingInstagram(false);
    }
  }, []);

  const selectedLanguages = facets.selectedLanguages;
  // "Open to" opt-ins are stored as restrictions. Only surface values that are
  // still part of the current catalog — legacy/stale rows on existing creators
  // would otherwise inflate the count and be re-saved on the next update.
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(
    () =>
      (initialProfile.restrictions ?? [])
        .map((row) => row.restriction)
        .filter((name) =>
          (OPEN_TO_OPTIONS as readonly string[]).includes(name),
        ),
  );
  const toggleRestriction = useCallback((name: string) => {
    setSelectedRestrictions((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }, []);
  const setAllRestrictions = useCallback((selected: boolean) => {
    setSelectedRestrictions(selected ? [...OPEN_TO_OPTIONS] : []);
  }, []);
  const [languageConfirmed, setLanguageConfirmed] = useState<boolean>(
    () => (initialProfile.profileLanguages ?? []).length > 0,
  );
  const [introConfirmed, setIntroConfirmed] = useState<boolean>(() =>
    Boolean(introVideo.introVideoPreviewUrl),
  );
  const [packageDefaultsConfirmed, setPackageDefaultsConfirmed] = useState(
    () => Boolean(initialProfile.completeProfile) || adminMode,
  );
  const [portfolioConfirmed, setPortfolioConfirmed] = useState(
    () => Boolean(initialProfile.completeProfile) || adminMode,
  );
  const [addonsReviewed, setAddonsReviewed] = useState(
    () => Boolean(initialProfile.completeProfile) || adminMode,
  );
  const markAddonsReviewed = useCallback(() => setAddonsReviewed(true), []);
  const [goLivePolicies, setGoLivePolicies] =
    useState<GoLivePolicyAcceptanceState>(() =>
      createEmptyGoLivePolicyAcceptance(
        Boolean(initialProfile.completeProfile) || adminMode,
      ),
    );
  const [packageErrors, setPackageErrors] = useState<{
    priceAmount?: string;
    deliveryDays?: string;
    videoLengthSeconds?: string;
  }>({});

  // ---- Portfolio drawer ----
  const [pfDrawerOpen, setPfDrawerOpen] = useState(false);
  // "Add reel" now asks where the video is coming from before opening either
  // the file drawer or the Instagram gallery.
  const [pfSourceOpen, setPfSourceOpen] = useState(false);
  const [pfGalleryOpen, setPfGalleryOpen] = useState(false);
  const [pfEditingVideo, setPfEditingVideo] =
    useState<PortfolioVideoApi | null>(null);
  const pfVideoInputRef = useRef<HTMLInputElement | null>(null);
  const pfThumbInputRef = useRef<HTMLInputElement | null>(null);
  const [pfPendingVideoFile, setPfPendingVideoFile] = useState<File | null>(
    null,
  );
  const [pfPendingThumbFile, setPfPendingThumbFile] = useState<File | null>(
    null,
  );

  const openPortfolioDrawer = useCallback((video: PortfolioVideoApi | null) => {
    setPfEditingVideo(video);
    setPfPendingVideoFile(null);
    setPfPendingThumbFile(null);
    setPfDrawerOpen(true);
  }, []);

  const selectedLanguageCount = selectedLanguages.length;

  // ---- Save mutation ----
  const pendingActionRef = useRef<{
    completeId: WizardStepId;
    nextIndex: number;
    goLive?: boolean;
  } | null>(null);
  const submitMutation = useSubmitCreatorProfileMutation({
    mode: "update",
    profileId,
    adminMode,
    onSuccess: (result) => {
      // Re-seed facet state from the saved profile so an "Other" value that the
      // server just turned into a real catalog option shows as that option
      // (not "Other") — and drop the now-stale "we'll add on save" notices.
      if (result.status === "updated" && result.profile) {
        facets.resetFromProfile(result.profile);
        setOtherNotices({});
      }
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      if (!action) return;
      setCompleted((prev) => new Set(prev).add(action.completeId));
      setDirty(false);
      if (action.goLive) setSubmitted(true);
      setActiveIndex(action.nextIndex);
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
  const pending = submitMutation.isPending;

  // ---- AI bio generation ----
  const generateBioMutation = useGenerateCreatorBioMutation();
  const [showBioAiNotice, setShowBioAiNotice] = useState(false);

  // ---- AI "Other" facet resolution ----
  type NonLangDim = Exclude<CreatorFacetDimension, "LANGUAGE">;
  const resolveOtherMutation = useResolveFacetOtherMutation();
  const [resolvingOtherDim, setResolvingOtherDim] = useState<NonLangDim | null>(
    null,
  );
  const [otherNotices, setOtherNotices] = useState<OtherNotices>({});

  const applyOtherResult = useCallback(
    async (dimension: NonLangDim, res: ResolveFacetOtherResponse) => {
      const selectCanonical = (slug: string) => {
        if (dimension === "CONTENT_CATEGORY") {
          if (facets.primaryNiche === "other") {
            facets.setPrimaryNiche(slug);
          } else {
            facets.removeFacetSlug("CONTENT_CATEGORY", "other");
            facets.toggleSecondaryNiche(slug);
          }
        } else {
          facets.selectSingleFacet(dimension, slug);
        }
        facets.setCustomFacetLabel(dimension, "");
      };

      if (res.action === "match" && res.option) {
        // Existing option — swap the "Other" selection for the real one now.
        selectCanonical(res.option.slug);
        markDirty();
        setOtherNotices((n) => ({
          ...n,
          [dimension]: { type: "info", message: res.message ?? "" },
        }));
      } else if (res.action === "new") {
        // Valid new value: keep "Other" selected and store the normalized label.
        // The catalog option is created server-side only when the creator saves.
        if (res.label) facets.setCustomFacetLabel(dimension, res.label);
        markDirty();
        setOtherNotices((n) => ({
          ...n,
          [dimension]: { type: "info", message: res.message ?? "" },
        }));
      } else if (res.action === "rejected") {
        facets.removeFacetSlug(dimension, "other");
        facets.setCustomFacetLabel(dimension, "");
        markDirty();
        setOtherNotices((n) => ({
          ...n,
          [dimension]: {
            type: "warning",
            message: res.message ?? "That entry can't be used.",
          },
        }));
      } else {
        // kept — the typed value stays as private custom text.
        setOtherNotices((n) => {
          const next = { ...n };
          delete next[dimension];
          return next;
        });
      }
    },
    [facets, markDirty],
  );

  const handleCommitOther = useCallback(
    async (dimension: NonLangDim) => {
      const text = (facets.customFacetLabels[dimension] ?? "").trim();
      if (text.length < 2 || resolvingOtherDim) return;
      setResolvingOtherDim(dimension);
      try {
        const res = await resolveOtherMutation.mutateAsync({ dimension, text });
        await applyOtherResult(dimension, res);
      } catch {
        // network/500 — leave the custom text as-is (kept behavior)
      } finally {
        setResolvingOtherDim(null);
      }
    },
    [facets, resolvingOtherDim, resolveOtherMutation, applyOtherResult],
  );

  const dismissOtherNotice = useCallback((dimension: NonLangDim) => {
    setOtherNotices((n) => {
      const next = { ...n };
      delete next[dimension];
      return next;
    });
  }, []);

  const facetLabelsFor = useCallback(
    (
      dimension:
        | "CONTENT_CATEGORY"
        | "CREATOR_TYPE"
        | "OCCUPATION"
        | "LANGUAGE",
    ) => {
      const options = facets.facetOptionsByDimension[dimension] ?? [];
      const bySlug = new Map(options.map((o) => [o.slug, o.label]));
      const slugs =
        dimension === "LANGUAGE"
          ? selectedLanguages
          : (facets.selectedFacets[dimension] ?? []);
      return slugs.map((slug) => bySlug.get(slug) ?? slug);
    },
    [facets.facetOptionsByDimension, facets.selectedFacets, selectedLanguages],
  );

  const canGenerateBio =
    (facets.selectedFacets.CONTENT_CATEGORY?.length ?? 0) > 0;

  const handleGenerateBio = useCallback(async () => {
    if (!canGenerateBio || generateBioMutation.isPending) return;
    try {
      const generated = await generateBioMutation.mutateAsync({
        niches: facetLabelsFor("CONTENT_CATEGORY"),
        creatorTypes: facetLabelsFor("CREATOR_TYPE"),
        occupations: facetLabelsFor("OCCUPATION"),
        languages: facetLabelsFor("LANGUAGE"),
        gender: gender || undefined,
        city: location.city.trim() || undefined,
        country: location.countryName || undefined,
        dateOfBirth: dateOfBirth || undefined,
      });
      setBio(generated.slice(0, BIO_MAX_CHARS));
      setShowBioAiNotice(true);
      markDirty();
    } catch {
      // toast handled in the mutation hook
    }
  }, [
    canGenerateBio,
    generateBioMutation,
    facetLabelsFor,
    gender,
    location.city,
    location.countryName,
    dateOfBirth,
    markDirty,
  ]);

  // Once a profile is listed (live & approved) there's nothing to re-submit —
  // the wizard is just an editor, so drop the Review and Go Live steps.
  const steps = useMemo(
    () =>
      initialProfile.isListed
        ? WIZARD_STEPS.filter((step) => !LISTED_HIDDEN_STEPS.has(step.id))
        : WIZARD_STEPS,
    [initialProfile.isListed],
  );
  /**
   * Steps shown in the stepper. Go Live is a destination, not a step the
   * creator works through — completing Review submits the profile and lands
   * them there — so it is kept navigable in `steps` but hidden from the rail,
   * the progress segments and the step counter.
   *
   * Go Live is last in `steps`, so filtering it leaves every remaining index
   * aligned with `steps` and `goToStep` keeps working unchanged.
   */
  const navSteps = useMemo(
    () => steps.filter((step) => step.id !== "go-live"),
    [steps],
  );

  const stepIndex = useMemo(() => {
    const map = {} as Record<WizardStepId, number>;
    steps.forEach((step, index) => {
      map[step.id] = index;
    });
    return map;
  }, [steps]);

  const activeStep = steps[Math.min(activeIndex, steps.length - 1)];
  const ActiveIcon = activeStep.icon;

  // ---- Derived ----
  const languageLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of facets.facetOptionsByDimension.LANGUAGE ?? [])
      map.set(opt.slug, opt.label);
    return map;
  }, [facets.facetOptionsByDimension.LANGUAGE]);

  const publicPortfolioCount = useMemo(
    () =>
      (portfolioQuery.data ?? []).filter((v) => v.visibilityStatus === "public")
        .length,
    [portfolioQuery.data],
  );

  const selectedFacets = facets.selectedFacets;
  const facetCount = useCallback(
    (dimension: string) =>
      (selectedFacets[dimension as keyof typeof selectedFacets] ?? []).length,
    [selectedFacets],
  );

  // An "Other" chip is selected but its custom text is still blank.
  const identityHasBlankOther = useMemo(() => {
    const dims = [
      "CONTENT_CATEGORY",
      "CREATOR_TYPE",
      "OCCUPATION",
      "APPEARANCE",
    ] as const;
    return dims.some((dim) => {
      const slugs = facets.selectedFacets[dim] ?? [];
      return (
        slugs.includes("other") && !(facets.customFacetLabels[dim] ?? "").trim()
      );
    });
  }, [facets.selectedFacets, facets.customFacetLabels]);

  const identityComplete =
    Boolean(facets.primaryNiche) &&
    facets.secondaryNiches.length >= REQUIRED_SECONDARY_NICHES &&
    facetCount("CREATOR_TYPE") > 0 &&
    facetCount("OCCUPATION") > 0 &&
    facetCount("APPEARANCE") > 0 &&
    selectedRestrictions.length > 0 &&
    !identityHasBlankOther;

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
      hasPackage: Boolean(
        validatePackagePrice(packages.packageDraft.priceAmount) === undefined,
      ),
      hasIntroVideo: Boolean(introVideo.introVideoPreviewUrl),
      hasInstagram: instagramConnected,
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
    instagramConnected,
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
      contactEmail,
      bio,
      countryName: location.countryName ?? "",
      stateName: location.stateName ?? "",
      city: location.city ?? "",
      gender,
      dateOfBirth,
      shippingAddress: shippingAddress,
      selectedFacetDimensions,
      nichePrimaryCount: facets.primaryNiche ? 1 : 0,
      nicheSecondaryCount: facets.secondaryNiches.length,
      restrictionCount: selectedRestrictions.length,
      languageCount: selectedLanguageCount,
      hasPackage,
      mandatoryAddOnsPriced: addOns.mandatoryAddOnsPriced,
      packageDefaultsConfirmed,
      publicVideoCount: publicPortfolioCount,
      policiesAccepted: areAllGoLivePoliciesAccepted(goLivePolicies),
      instagramConnected,
    };
  }, [
    facets.selectedFacets,
    facets.primaryNiche,
    facets.secondaryNiches,
    selectedRestrictions,
    packages.packageDraft,
    addOns.mandatoryAddOnsPriced,
    packageDefaultsConfirmed,
    profileImage.profileImagePreviewUrl,
    introVideo.introVideoPreviewUrl,
    displayName,
    contactEmail,
    bio,
    location.countryName,
    location.stateName,
    location.city,
    gender,
    dateOfBirth,
    shippingAddress,
    selectedLanguageCount,
    publicPortfolioCount,
    goLivePolicies,
    instagramConnected,
  ]);

  const goLiveMissing = useMemo(
    () => computeGoLiveMissing(goLiveSnapshot),
    [goLiveSnapshot],
  );

  // Whether a step's requirements are already met by the current data. Drives
  // the rail check-marks so a filled/live profile shows its progress on load,
  // not only after clicking through each step this session.
  const stepFilled = useCallback(
    (id: WizardStepId): boolean => {
      switch (id) {
        case "about":
          return (
            displayName.trim().length > 0 &&
            Boolean(dateOfBirth) &&
            Boolean(gender) &&
            instagramConnected
          );
        case "base":
          return (
            location.city.trim().length > 0 &&
            shippingAddress.trim().length > 0 &&
            selectedLanguageCount > 0 &&
            languageConfirmed
          );
        case "identity":
          return identityComplete;
        case "pricing":
          return (
            validatePackagePrice(packages.packageDraft.priceAmount) ===
              undefined && addOns.mandatoryAddOnsPriced
          );
        case "portfolio":
          return (
            publicPortfolioCount >= MIN_PORTFOLIO_VIDEOS &&
            bio.trim().length >= BIO_MIN_CHARS &&
            portfolioConfirmed
          );
        case "intro-video":
          return Boolean(introVideo.introVideoPreviewUrl);
        case "review":
          return goLiveMissing.length === 0;
        case "go-live":
          return submitted || Boolean(initialProfile.completeProfile);
        default:
          return false;
      }
    },
    [
      displayName,
      dateOfBirth,
      gender,
      location.city,
      shippingAddress,
      selectedLanguageCount,
      instagramConnected,
      languageConfirmed,
      identityComplete,
      packages.packageDraft.priceAmount,
      addOns.mandatoryAddOnsPriced,
      publicPortfolioCount,
      portfolioConfirmed,
      bio,
      introVideo.introVideoPreviewUrl,
      goLiveMissing,
      submitted,
      initialProfile.completeProfile,
    ],
  );

  // ---- Payload + persistence ----
  const buildPayload = useCallback(
    (includePackages: boolean): UpdateCreatorProfilePayload | null => {
      const facetSelections: CreatorFacetSelectionPayload[] = [];
      for (const section of facetSections) {
        const slugs = facets.selectedFacets[section.dimension] ?? [];
        const customLabel = facets.customFacetLabels[section.dimension]?.trim();
        slugs.forEach((slug, index) => {
          facetSelections.push({
            dimension: section.dimension,
            slug,
            // CONTENT_CATEGORY is ordered: index 0 = primary, rest = secondary.
            ...(section.dimension === "CONTENT_CATEGORY"
              ? { rank: index }
              : {}),
            ...(slug === "other" && customLabel ? { customLabel } : {}),
          });
        });
      }
      const profileLanguages: CreatorProfileLanguagePayload[] =
        selectedLanguages.map((slug) => ({ slug }));

      const payload: UpdateCreatorProfilePayload = {
        displayName: displayName.trim(),
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        countryName: location.countryName || undefined,
        stateName: location.stateName || undefined,
        city: location.city.trim() || undefined,
        bio: bio.trim() || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
        contactEmail: contactEmail || undefined,
        facetSelections,
        profileLanguages,
        restrictions: selectedRestrictions,
        ...(adminMode && phone ? { phone: "+91" + phone } : {}),
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
      facets.customFacetLabels,
      selectedLanguages,
      selectedRestrictions,
      displayName,
      gender,
      dateOfBirth,
      location.countryName,
      location.stateName,
      location.city,
      bio,
      shippingAddress,
      contactEmail,
      adminMode,
      phone,
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
        if (!profileImage.profileImagePreviewUrl)
          missing.push("a profile photo");
        if (!displayName.trim()) missing.push("your full name");
        if (!dateOfBirth) missing.push("date of birth");
        if (!gender) missing.push("gender");
        if (!instagramConnected) missing.push("an Instagram connection");
      } else if (id === "base") {
        if (!location.city.trim()) missing.push("city");
        if (!shippingAddress.trim()) missing.push("your shipping address");
        if (selectedLanguageCount === 0) missing.push("at least one language");
        if (selectedLanguageCount > 0 && !languageConfirmed)
          missing.push("the language confirmation");
      } else if (id === "identity") {
        if (!facets.primaryNiche) missing.push("your primary niche");
        if (facets.secondaryNiches.length < REQUIRED_SECONDARY_NICHES)
          missing.push(`${REQUIRED_SECONDARY_NICHES} secondary niches`);
        if (facetCount("CREATOR_TYPE") === 0) missing.push("your creator type");
        if (facetCount("OCCUPATION") === 0) missing.push("your occupation");
        if (facetCount("APPEARANCE") === 0) missing.push("your appearance");
        if (selectedRestrictions.length === 0)
          missing.push('at least one "Comfortable with" option');
        if (identityHasBlankOther)
          missing.push('a value for your "Other" selection');
      } else if (id === "portfolio") {
        if (bio.trim().length < BIO_MIN_CHARS)
          missing.push(`a bio of at least ${BIO_MIN_CHARS} characters`);
        if (!portfolioConfirmed)
          missing.push("the portfolio video confirmation");
      } else if (id === "intro-video") {
        if (!introVideo.introVideoPreviewUrl) missing.push("an intro video");
        else if (!introConfirmed) missing.push("the intro video confirmation");
      } else if (id === "pricing") {
        const priceErr = validatePackagePrice(
          packages.packageDraft.priceAmount,
        );
        if (priceErr) missing.push("a valid starting price");
        if (!packageDefaultsConfirmed)
          missing.push("confirmation of the package defaults");
        if (!addOns.mandatoryAddOnsPriced)
          missing.push("prices for the required add-ons");
      }
      return missing;
    },
    [
      profileImage.profileImagePreviewUrl,
      displayName,
      dateOfBirth,
      gender,
      location.city,
      shippingAddress,
      selectedLanguageCount,
      languageConfirmed,
      instagramConnected,
      facetCount,
      facets.primaryNiche,
      facets.secondaryNiches,
      selectedRestrictions,
      identityHasBlankOther,
      bio,
      portfolioConfirmed,
      introVideo.introVideoPreviewUrl,
      introConfirmed,
      packageDefaultsConfirmed,
      packages.packageDraft.priceAmount,
      addOns.mandatoryAddOnsPriced,
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

  // Structured per-field errors for inline banners — only active after the
  // user first pressed "Continue" on that step.
  const stepErrors = useMemo(() => {
    const tried = triedContinue;
    return {
      about: tried.about
        ? {
            photo: !profileImage.profileImagePreviewUrl
              ? "Upload a profile photo — brands need to see you."
              : undefined,
            displayName: !displayName.trim()
              ? "Please enter your full name."
              : undefined,
            dateOfBirth: !dateOfBirth
              ? "Please add your date of birth."
              : !isEighteenPlus
                ? "Creators must be at least 18 years old."
                : undefined,
            gender: !gender ? "Please select your gender." : undefined,
            instagram: !instagramConnected
              ? "Connect your Instagram account to continue."
              : undefined,
          }
        : {},
      base: tried.base
        ? {
            city: !location.city.trim()
              ? "Please select your city."
              : undefined,
            shippingAddress: !shippingAddress.trim()
              ? "Add your shipping address so brands can send products to you."
              : undefined,
            language:
              selectedLanguageCount === 0
                ? "Add at least one language."
                : undefined,
            languageConfirmed:
              selectedLanguageCount > 0 && !languageConfirmed
                ? "Please confirm your languages."
                : undefined,
          }
        : {},
      identity: tried.identity
        ? {
            primaryNiche: !facets.primaryNiche
              ? "Choose your primary niche."
              : undefined,
            secondaryNiches:
              facets.secondaryNiches.length < REQUIRED_SECONDARY_NICHES
                ? `Pick ${REQUIRED_SECONDARY_NICHES} secondary niches.`
                : undefined,
            creatorType:
              facetCount("CREATOR_TYPE") === 0
                ? "Select your creator type."
                : undefined,
            occupation:
              facetCount("OCCUPATION") === 0
                ? "Select your occupation."
                : undefined,
            appearance:
              facetCount("APPEARANCE") === 0
                ? "Select your appearance."
                : undefined,
            restrictions:
              selectedRestrictions.length === 0
                ? "Choose at least one category you're comfortable with."
                : undefined,
            blankOther: identityHasBlankOther
              ? 'Fill in your "Other" selection.'
              : undefined,
          }
        : {},
      portfolio: tried.portfolio
        ? {
            bio:
              bio.trim().length < BIO_MIN_CHARS
                ? `Your bio needs at least ${BIO_MIN_CHARS} characters (${bio.trim().length} so far).`
                : undefined,
            confirmed: !portfolioConfirmed
              ? "Confirm your portfolio videos meet the requirements."
              : undefined,
          }
        : {},
      "intro-video": tried["intro-video"]
        ? {
            video: !introVideo.introVideoPreviewUrl
              ? "Upload your intro video to continue."
              : undefined,
            confirmed:
              introVideo.introVideoPreviewUrl && !introConfirmed
                ? "Confirm your video meets the requirements."
                : undefined,
          }
        : {},
      pricing: tried.pricing
        ? {
            deliveryDays: (() => {
              const d = Number(packages.packageDraft.deliveryDays);
              if (
                !packages.packageDraft.deliveryDays ||
                !Number.isInteger(d) ||
                d < PACKAGE_MIN_DELIVERY_DAYS ||
                d > PACKAGE_MAX_DELIVERY_DAYS
              )
                return `Delivery must be between ${PACKAGE_MIN_DELIVERY_DAYS} and ${PACKAGE_MAX_DELIVERY_DAYS} days.`;
              return undefined;
            })(),
            defaultsConfirmed: !packageDefaultsConfirmed
              ? "Confirm you can deliver the package defaults."
              : undefined,
            addOnPrices: !addOns.mandatoryAddOnsPriced
              ? "Enter prices for the required add-ons."
              : undefined,
          }
        : {},
    };
  }, [
    triedContinue,
    profileImage.profileImagePreviewUrl,
    displayName,
    dateOfBirth,
    isEighteenPlus,
    gender,
    location.city,
    shippingAddress,
    selectedLanguageCount,
    languageConfirmed,
    instagramConnected,
    facets.primaryNiche,
    facets.secondaryNiches,
    facetCount,
    selectedRestrictions,
    identityHasBlankOther,
    bio,
    portfolioConfirmed,
    introVideo.introVideoPreviewUrl,
    introConfirmed,
    packages.packageDraft.deliveryDays,
    packageDefaultsConfirmed,
    addOns.mandatoryAddOnsPriced,
  ]);

  const persist = useCallback(
    (opts: {
      completeId: WizardStepId;
      nextIndex: number;
      includePackages?: boolean;
      goLive?: boolean;
    }) => {
      if (
        introVideo.uploadingIntroVideo ||
        profileImage.uploadingProfileImage
      ) {
        toast.error("Hang on — an upload is still finishing.");
        return;
      }
      const payload = buildPayload(
        Boolean(opts.includePackages) || Boolean(opts.goLive),
      );
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
    [
      buildPayload,
      introVideo.uploadingIntroVideo,
      profileImage.uploadingProfileImage,
      submitMutation,
    ],
  );

  const handleContinue = useCallback(() => {
    const id = activeStep.id;
    if (id === "go-live") {
      onExit?.();
      return;
    }

    const missing = validateStep(id);
    if (missing.length > 0) {
      setTriedContinue((prev) => ({ ...prev, [id]: true }));
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
        nextIndex: stepIndex["go-live"],
        includePackages: true,
        goLive: true,
      });
      return;
    }

    persist({
      completeId: id,
      nextIndex: Math.min(activeIndex + 1, steps.length - 1),
      includePackages: id === "pricing",
    });
  }, [
    activeStep.id,
    validateStep,
    isEighteenPlus,
    goLiveMissing,
    persist,
    activeIndex,
    onExit,
    steps.length,
    stepIndex,
  ]);

  // Edit mode: save the current step, then advance to the next one (clamped to
  // the last step, so saving the final step just stays put).
  const saveCurrentStep = useCallback(() => {
    const id = activeStep.id;
    const missing = validateStep(id);
    if (missing.length > 0) {
      setTriedContinue((prev) => ({ ...prev, [id]: true }));
      toast.error(`Almost there — add ${missing.join(", ")}.`);
      return;
    }
    if (id === "about" && !isEighteenPlus) {
      toast.error("Creators must be at least 18 years old.");
      return;
    }
    persist({
      completeId: id,
      nextIndex: Math.min(activeIndex + 1, steps.length - 1),
      includePackages: id === "pricing",
    });
  }, [
    activeStep.id,
    validateStep,
    isEighteenPlus,
    persist,
    activeIndex,
    steps.length,
  ]);

  // The primary footer button: in edit mode the editable steps save in place;
  // review/go-live keep their submit/exit behavior, and onboarding keeps its
  // save-and-advance flow.
  const onPrimaryAction = useCallback(() => {
    if (
      canEditFreely &&
      activeStep.id !== "review" &&
      activeStep.id !== "go-live"
    ) {
      saveCurrentStep();
      return;
    }
    handleContinue();
  }, [canEditFreely, activeStep.id, saveCurrentStep, handleContinue]);

  const handleBack = useCallback(() => {
    if (!confirmLeaveIfDirty()) return;
    setDirty(false);
    if (activeIndex === 0) onExit?.();
    else setActiveIndex((idx) => Math.max(0, idx - 1));
  }, [confirmLeaveIfDirty, activeIndex, onExit]);

  const goToStep = useCallback(
    (index: number) => {
      const target = steps[index];
      if (!target || index === activeIndex) return;
      const reachable =
        canEditFreely ||
        target.ready ||
        completed.has(target.id) ||
        stepFilled(target.id) ||
        index <= activeIndex;
      if (!reachable) return;
      if (!confirmLeaveIfDirty()) return;
      setDirty(false);
      setActiveIndex(index);
    },
    [
      steps,
      activeIndex,
      completed,
      canEditFreely,
      stepFilled,
      confirmLeaveIfDirty,
    ],
  );

  const handleMobileNext = useCallback(() => {
    const next = activeIndex + 1;
    if (next >= steps.length) return;
    const target = steps[next];
    const reachable =
      canEditFreely ||
      target.ready ||
      completed.has(target.id) ||
      stepFilled(target.id);
    if (reachable) {
      goToStep(next);
      return;
    }
    onPrimaryAction();
  }, [
    activeIndex,
    steps,
    canEditFreely,
    completed,
    stepFilled,
    goToStep,
    onPrimaryAction,
  ]);

  // Package editor onChange with live price validation (mirrors the long form).
  const onPackageChange = useCallback(
    (draft: PackageDraft) => {
      packages.setPackageDraft(draft);
      setPackageErrors((prev) => ({
        ...prev,
        priceAmount: validatePackagePrice(draft.priceAmount),
      }));
    },
    [packages],
  );

  // ---- Review rows ----
  const reviewRows = useMemo<ReviewRow[]>(() => {
    const languageSummary = selectedLanguages
      .map((slug) => languageLabelBySlug.get(slug) ?? slug)
      .join(", ");
    const locationSummary = [
      location.city,
      location.stateName,
      location.countryName,
    ]
      .filter(Boolean)
      .join(", ");

    const aboutOk = displayName.trim() && dateOfBirth && gender;
    const baseOk =
      location.city.trim() &&
      shippingAddress.trim() &&
      selectedLanguageCount > 0 &&
      languageConfirmed;
    const identityOk = identityComplete;
    const bioOk = bio.trim().length >= BIO_MIN_CHARS;
    const introOk = Boolean(introVideo.introVideoPreviewUrl);
    const pricingOk =
      validatePackagePrice(packages.packageDraft.priceAmount) === undefined &&
      packageDefaultsConfirmed &&
      addOns.mandatoryAddOnsPriced;
    const addOnCount = addOns.selectedAddOnSlugs.length;

    return [
      {
        stepId: "about",
        title: "About You",
        status: aboutOk ? "complete" : "incomplete",
        details: [{ label: "Name", value: displayName.trim() || "—" }],
      },
      {
        stepId: "base",
        title: "Your Base",
        status: baseOk ? "complete" : "incomplete",
        details: [
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
        stepId: "pricing",
        title: "Pricing, Delivery & Add-ons",
        status: pricingOk ? "complete" : "incomplete",
        summary: pricingOk
          ? `₹${Number(packages.packageDraft.priceAmount).toLocaleString("en-IN")} base · ${packages.packageDraft.deliveryDays}-day delivery${addOnCount > 0 ? ` · ${addOnCount} add-on${addOnCount > 1 ? "s" : ""} on` : ""}`
          : "Set your starting price to continue.",
      },
      {
        stepId: "portfolio",
        title: "Portfolio",
        status: !bioOk
          ? "incomplete"
          : publicPortfolioCount >= 3
            ? "complete"
            : "improve",
        summary: !bioOk
          ? "Add your creator story to continue."
          : `${publicPortfolioCount} of 10 videos. ${
              publicPortfolioCount >= 3
                ? "Great range — add more to boost visibility."
                : "Add more to unlock higher Profile Strength."
            }`,
      },
      {
        stepId: "intro-video",
        title: "Intro Video",
        status: introOk ? "complete" : "incomplete",
      },
    ];
  }, [
    selectedLanguages,
    languageLabelBySlug,
    location.city,
    location.stateName,
    location.countryName,
    displayName,
    dateOfBirth,
    gender,
    shippingAddress,
    selectedLanguageCount,
    languageConfirmed,
    identityComplete,
    bio,
    introVideo.introVideoPreviewUrl,
    packages.packageDraft,
    addOns.selectedAddOnSlugs.length,
    addOns.mandatoryAddOnsPriced,
    packageDefaultsConfirmed,
    publicPortfolioCount,
  ]);

  const continueLabel = useMemo(() => {
    if (activeStep.id === "review") return "Submit my profile";
    if (activeStep.id === "go-live") return "Go to dashboard";
    if (canEditFreely) return "Save changes";
    const labelMap: Partial<Record<WizardStepId, string>> = {
      about: "Save & Set Your Base",
      base: "Save & Set Your Identity",
      identity: "Save & Set Your Pricing",
      pricing: "Save & Build Portfolio",
      portfolio: "Save & Add Intro Video",
      "intro-video": "Save & Review Profile",
    };
    return labelMap[activeStep.id] ?? "Continue";
  }, [activeStep.id, canEditFreely]);

  // In editor mode, editable steps get a "save this step" reminder + a Save
  // button in the header (in addition to the footer one).
  const showStepSave =
    canEditFreely && activeStep.id !== "review" && activeStep.id !== "go-live";
  const isLastStep = activeIndex >= steps.length - 1;
  const uploadingMedia =
    profileImage.uploadingProfileImage || introVideo.uploadingIntroVideo;

  return (
    <div className="pe-scope cw-root">
      <div className="cw-mobile-stepper">
        <div className="cw-mobile-stepper-row">
          <button
            type="button"
            className="cw-mobile-nav"
            disabled={pending}
            onClick={handleBack}
            aria-label={activeIndex === 0 ? "Exit" : "Previous step"}
          >
            <ChevronLeft size={20} strokeWidth={2.25} />
          </button>
          <div className="cw-mobile-stepper-copy">
            <p className="cw-mobile-stepper-meta">
              {activeStep.id === "go-live"
                ? `${strength.pct}% complete`
                : `Step ${activeIndex + 1} of ${navSteps.length} · ${strength.pct}% complete`}
            </p>
            <h1 className="cw-mobile-stepper-title">{activeStep.title}</h1>
          </div>
          <button
            type="button"
            className="cw-mobile-nav"
            disabled={
              pending || uploadingMedia || activeIndex >= steps.length - 1
            }
            onClick={handleMobileNext}
            aria-label="Next step"
          >
            <ChevronRight size={20} strokeWidth={2.25} />
          </button>
        </div>
        <div className="cw-mobile-segments" aria-hidden>
          {navSteps.map((step, index) => (
            <span
              key={step.id}
              className="cw-mobile-segment"
              data-filled={index <= activeIndex}
            />
          ))}
        </div>
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
            {navSteps.map((step, index) => {
              const isActive = index === activeIndex;
              const isDone = completed.has(step.id) || stepFilled(step.id);
              const isReachable =
                canEditFreely || step.ready || isDone || index <= activeIndex;
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
              {showStepSave ? (
                <p
                  className="cw-pane-tag"
                  style={{ color: "#b45309", fontWeight: 600 }}
                >
                  Please save your changes at each step before moving on.
                </p>
              ) : (
                <p className="cw-pane-tag">{activeStep.tagline}</p>
              )}
            </div>
            {showStepSave ? (
              <button
                type="button"
                className="cw-btn cw-btn-primary"
                style={{ marginLeft: "auto", alignSelf: "center" }}
                onClick={onPrimaryAction}
                disabled={pending || uploadingMedia}
              >
                {pending ? (
                  <>
                    <Spinner className="size-4" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    {continueLabel}
                    {isLastStep ? null : <ArrowRight size={16} />}
                  </>
                )}
              </button>
            ) : null}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              onChangeCapture={markDirty}
            >
              {activeStep.id === "about" ? (
                <AboutYouStep
                  disabled={pending}
                  profileId={profileId}
                  adminMode={adminMode}
                  phone={phone}
                  onPhoneChange={setPhone}
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
                  errors={stepErrors.about}
                />
              ) : activeStep.id === "base" ? (
                <YourBaseStep
                  disabled={pending}
                  adminMode={adminMode}
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
                  shippingAddress={shippingAddress}
                  onShippingAddressChange={setShippingAddress}
                  languageOptions={
                    facets.facetOptionsByDimension.LANGUAGE ?? []
                  }
                  selectedLanguages={selectedLanguages}
                  languagesLoading={facets.facetOptionsQuery.isLoading}
                  onToggleLanguage={(slug) => {
                    markDirty();
                    facets.toggleLanguage(slug);
                    setLanguageConfirmed(false);
                  }}
                  languageConfirmed={languageConfirmed}
                  onLanguageConfirmedChange={setLanguageConfirmed}
                  errors={stepErrors.base}
                />
              ) : activeStep.id === "identity" ? (
                <IdentityStep
                  disabled={pending}
                  optionsByDimension={facets.facetOptionsByDimension}
                  selectedFacets={facets.selectedFacets}
                  onSelectSingleFacet={(dimension, slug) => {
                    markDirty();
                    facets.selectSingleFacet(dimension, slug);
                  }}
                  primaryNiche={facets.primaryNiche}
                  secondaryNiches={facets.secondaryNiches}
                  onSetPrimaryNiche={(slug) => {
                    markDirty();
                    facets.setPrimaryNiche(slug);
                  }}
                  onToggleSecondaryNiche={(slug) => {
                    markDirty();
                    facets.toggleSecondaryNiche(slug);
                  }}
                  customFacetLabels={facets.customFacetLabels}
                  onCustomFacetLabelChange={(dimension, value) => {
                    markDirty();
                    facets.setCustomFacetLabel(dimension, value);
                    if (otherNotices[dimension]) dismissOtherNotice(dimension);
                  }}
                  onCommitOther={(dimension) =>
                    void handleCommitOther(dimension)
                  }
                  resolvingOtherDim={resolvingOtherDim}
                  otherNotices={otherNotices}
                  onDismissOtherNotice={dismissOtherNotice}
                  selectedRestrictions={selectedRestrictions}
                  onToggleRestriction={(name) => {
                    markDirty();
                    toggleRestriction(name);
                  }}
                  onSetAllRestrictions={(selected) => {
                    markDirty();
                    setAllRestrictions(selected);
                  }}
                  errors={stepErrors.identity}
                />
              ) : activeStep.id === "intro-video" ? (
                <IntroVideoStep
                  disabled={pending}
                  videoPreviewUrl={introVideo.introVideoPreviewUrl}
                  uploading={introVideo.uploadingIntroVideo}
                  fileInputRef={introVideo.introVideoInputRef}
                  onSelectFile={(file) =>
                    void introVideo.handleIntroVideoSelected(file)
                  }
                  confirmed={introConfirmed}
                  onConfirmedChange={setIntroConfirmed}
                  errors={stepErrors["intro-video"]}
                />
              ) : activeStep.id === "portfolio" ? (
                <PortfolioStep
                  loading={portfolioQuery.isLoading}
                  error={portfolioQuery.isError}
                  onRetry={() => void portfolioQuery.refetch()}
                  videos={portfolioQuery.data ?? []}
                  onAdd={() => setPfSourceOpen(true)}
                  onReplace={(video) => openPortfolioDrawer(video)}
                  onDelete={(video) =>
                    deletePortfolioMutation.mutate({ videoId: video.id })
                  }
                  disabled={pending}
                  bio={bio}
                  onBioChange={(v) => {
                    setBio(v.slice(0, BIO_MAX_CHARS));
                    if (showBioAiNotice) setShowBioAiNotice(false);
                  }}
                  onGenerateBio={() => void handleGenerateBio()}
                  generatingBio={generateBioMutation.isPending}
                  canGenerateBio={canGenerateBio}
                  showAiNotice={showBioAiNotice}
                  onDismissAiNotice={() => setShowBioAiNotice(false)}
                  confirmed={portfolioConfirmed}
                  onConfirmedChange={setPortfolioConfirmed}
                  errors={stepErrors.portfolio}
                />
              ) : activeStep.id === "pricing" ? (
                <PricingStep
                  disabled={pending}
                  packageDraft={packages.packageDraft}
                  onPackageChange={onPackageChange}
                  packageErrors={{
                    ...packageErrors,
                    deliveryDays:
                      packageErrors.deliveryDays ??
                      stepErrors.pricing?.deliveryDays,
                  }}
                  addOnOptions={addOns.addOnOptions}
                  selectedAddOnSlugs={addOns.selectedAddOnSlugs}
                  addOnDrafts={addOns.addOnDrafts}
                  unmatchedNames={addOns.hydratedAddOns.unmatchedNames}
                  addOnsLoading={addOns.addOnOptionsQuery.isLoading}
                  addOnsError={addOns.addOnOptionsQuery.isError}
                  onAddOnsRetry={() => void addOns.addOnOptionsQuery.refetch()}
                  onToggleAddOn={(option) => addOns.toggleAddOn(option)}
                  onAddOnDraftChange={(slug, patch) =>
                    addOns.updateAddOnDraft(slug, patch)
                  }
                  defaultsConfirmed={packageDefaultsConfirmed}
                  onDefaultsConfirmedChange={setPackageDefaultsConfirmed}
                  addonsReviewed={addonsReviewed}
                  onAddonsReviewed={markAddonsReviewed}
                  errors={stepErrors.pricing}
                />
              ) : activeStep.id === "review" ? (
                <ReviewStep
                  rows={reviewRows}
                  onEditStep={(stepId) => goToStep(stepIndex[stepId])}
                  policies={goLivePolicies}
                  onPoliciesChange={setGoLivePolicies}
                  policiesDisabled={Boolean(initialProfile.completeProfile)}
                  missingItems={goLiveMissing}
                />
              ) : (
                <GoLiveStep
                  submitted={submitted}
                  strengthPct={strength.pct}
                  strengthHint={strength.hint}
                  onUploadMore={() => setActiveIndex(stepIndex.portfolio)}
                  onGoToDashboard={() => onExit?.()}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          {activeStep.id !== "go-live" ? (
            <div className="cw-foot">
              {canEditFreely ? (
                <span className="cw-foot-note">
                  Save each step after you edit it.
                </span>
              ) : null}
              <div className="cw-foot-actions">
                <button
                  type="button"
                  className="cw-btn cw-btn-ghost"
                  disabled={pending}
                  onClick={handleBack}
                >
                  <ArrowLeft size={16} />
                  {activeIndex === 0 ? "Exit" : "Back"}
                </button>
                <button
                  type="button"
                  className="cw-btn cw-btn-primary"
                  onClick={onPrimaryAction}
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
                      {isLastStep ? null : <ArrowRight size={16} />}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AddReelSourceSheet
        open={pfSourceOpen}
        onOpenChange={setPfSourceOpen}
        instagramState={instagramChooserState}
        onUploadFromDevice={() => {
          setPfSourceOpen(false);
          openPortfolioDrawer(null);
        }}
        onChooseFromInstagram={() => {
          setPfSourceOpen(false);
          setPfGalleryOpen(true);
        }}
        onConnectInstagram={() => {
          setPfSourceOpen(false);
          // Comes back to this step rather than settings, so the creator does
          // not lose their place mid-wizard.
          void startInstagramConnect();
        }}
        connecting={connectingInstagram}
      />

      <InstagramReelGallery
        open={pfGalleryOpen}
        onOpenChange={setPfGalleryOpen}
        adminCreatorId={adminMode ? profileId : undefined}
        onImported={() => void portfolioQuery.refetch()}
      />

      {/* Portfolio file drawer — add a reel, or replace an existing one */}
      <PortfolioFileDrawer
        video={pfEditingVideo}
        open={pfDrawerOpen}
        onClose={() => setPfDrawerOpen(false)}
        videoFile={pfPendingVideoFile}
        thumbFile={pfPendingThumbFile}
        videoInputRef={pfVideoInputRef}
        thumbInputRef={pfThumbInputRef}
        onSelectVideoFile={setPfPendingVideoFile}
        onSelectThumbFile={setPfPendingThumbFile}
        onSave={() => {
          if (!pfPendingVideoFile) {
            toast.error("Please select a video file first.");
            return;
          }
          const admin = adminMode ? { adminCreatorId: profileId } : {};
          if (pfEditingVideo) {
            replacePortfolioMutation.mutate(
              {
                videoId: pfEditingVideo.id,
                videoFile: pfPendingVideoFile,
                thumbnailFile: pfPendingThumbFile,
                ...admin,
              },
              { onSuccess: () => setPfDrawerOpen(false) },
            );
          } else {
            createPortfolioMutation.mutate(
              {
                videoFile: pfPendingVideoFile,
                thumbnailFile: pfPendingThumbFile,
                ...admin,
              },
              { onSuccess: () => setPfDrawerOpen(false) },
            );
          }
        }}
        onDelete={(video) => {
          deletePortfolioMutation.mutate({ videoId: video.id });
          setPfDrawerOpen(false);
        }}
        isSaving={
          createPortfolioMutation.isPending ||
          replacePortfolioMutation.isPending
        }
      />
    </div>
  );
}
