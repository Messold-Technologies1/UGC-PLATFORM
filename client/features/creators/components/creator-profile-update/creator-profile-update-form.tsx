"use client";
import "./profile-edit.css";
import { SectionCard, PeSelectField, CatalogStatus } from "./shared-components";
import { CreatorSocialAccounts } from "./creator-social-accounts";
import { FacetChipSection, RestrictionChipSection } from "./facet-components";
import { LanguageMultiSelect } from "./language-multi-select";
import { PackageEditor, AddOnCatalogEditor } from "./package-and-addon-editors";
import { PackageEarningsBanner } from "./package-earnings-banner";
import { PortfolioGrid, PortfolioEditDrawer } from "./portfolio-components";
import { GoLiveBanner } from "./go-live-banner";
import {
  GoLivePolicyAcceptance,
  areAllGoLivePoliciesAccepted,
  createEmptyGoLivePolicyAcceptance,
  type GoLivePolicyAcceptanceState,
} from "./go-live-policy-acceptance";
import { CreatorSpotlightProgram } from "@/features/creators/components/creator-spotlight/creator-spotlight-program";
import {
  computeGoLiveMissing,
  type GoLiveSnapshot,
} from "@/features/creators/lib/go-live-requirements";
import {
  useCreatorProfileDraft,
  type CreatorProfileDraftFields,
} from "@/features/creators/hooks/use-creator-profile-draft";

import { motion, type Variants } from "framer-motion";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import {
  CalendarIcon,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Film,
  Layers,
  MapPin,
  MessageSquare,
  Share2,
  Sparkles,
  User,
  Instagram,
  Youtube,
  Ghost,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  capitalizeFirstLetter,
  toTitleCaseLabel,
} from "@/lib/string-lists";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { PhoneVerificationField } from "@/features/auth/components/phone-verification-field";
import { CreatorProfileIntroVideoField } from "@/features/creators/components/creator-profile-update/creator-profile-intro-video-field";
import { CreatorProfileImageField } from "@/features/creators/components/creator-profile-update/creator-profile-image-field";

import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { useMyPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-my-portfolio-videos-query";
import { useAdminPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-admin-portfolio-videos-query";
import { useCreatePortfolioVideoFlowMutation } from "@/features/creator-portfolio/hooks/use-create-portfolio-video-flow-mutation";
import { useUpdatePortfolioVideoMutation } from "@/features/creator-portfolio/hooks/use-update-portfolio-video-mutation";
import { useDeletePortfolioVideoMutation } from "@/features/creator-portfolio/hooks/use-delete-portfolio-video-mutation";
import {
  usePortfolioIndustrySuggestionsQuery,
  usePortfolioTagSuggestionsQuery,
  usePortfolioLanguageSuggestionsQuery,
} from "@/features/creator-portfolio/hooks/use-portfolio-suggestion-queries";
import { useCreatorRestrictionSuggestionsQuery } from "@/features/creators/hooks/use-creator-suggestion-queries";

const PROFILE_OTP_VERIFICATION_ENABLED = false;
import { useAuth, type AuthUser } from "@/providers/auth-provider";
import { fetchAuthMe } from "@/features/auth/hooks/use-me-query";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";
import type {
  CreatorContentVolumeBucket,
  CreatorFacetSelectionPayload,
  CreatorGender,
  CreatorProfileLanguagePayload,
} from "@/features/creators/api/create-creator-profile";
import { useSubmitCreatorProfileMutation } from "@/features/creators/hooks/use-creator-profile-form-mutation";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { UpdateCreatorProfilePayload } from "@/features/creators/api/update-creator-profile";

import { useCreatorLocationForm } from "@/features/creators/hooks/use-creator-location-form";
import { useCreatorIntroVideo } from "@/features/creators/hooks/use-creator-intro-video";
import { useCreatorProfileImage } from "@/features/creators/hooks/use-creator-profile-image";
import { useCreatorFacetsForm } from "@/features/creators/hooks/use-creator-facets-form";
import { useCreatorPackagesForm } from "@/features/creators/hooks/use-creator-packages-form";
import { useCreatorAddOnsForm } from "@/features/creators/hooks/use-creator-add-ons-form";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useRosyConfirmDialog } from "@/hooks/use-rosy-confirm-dialog";

import { PROFILE_IMAGE_ACCEPT } from "@/features/creators/hooks/use-creator-profile-image";
import {
  INTRO_VIDEO_ACCEPT,
  facetSections,
  genderOptions,
  contentVolumeOptions,
  normalizeWholeNumberInput,
  normalizeOptionalUrl,
  getInitialCreatorName,
} from "@/features/creators/hooks/creator-profile-form-utils";

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
};

const NAV_ITEMS: NavItem[] = [
  { id: "media", label: "Photo & video", icon: Camera },
  { id: "basics", label: "Basic details", icon: User },
  { id: "about", label: "About you", icon: MapPin },
  { id: "niche", label: "Niche & content", icon: Sparkles },
  { id: "social", label: "Social & activity", icon: Share2 },
  { id: "packages", label: "Packages", icon: Layers },
  { id: "portfolio", label: "Portfolio", icon: Film },
];

const profileFormSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required"),
  instagramUrl: z.string().trim(),
  youtubeUrl: z.string().trim(),
  snapchatUrl: z.string().trim(),
  collaborationCount: z.coerce
    .number({ message: "Collaboration count must be a number." })
    .int("Collaboration count must be a whole number.")
    .nonnegative("Collaboration count must be zero or more."),
  travelRadius: z
    .union([
      z.literal(""),
      z.coerce
        .number({ message: "Travel radius must be a number." })
        .int("Travel radius must be a whole number.")
        .nonnegative("Travel radius must be zero or more."),
    ])
    .optional(),
  packagePriceAmount: z
    .string()
    .trim()
    .refine((val) => {
      const priceNumber = Number(val);
      return (
        Number.isInteger(priceNumber) &&
        priceNumber >= 500 &&
        priceNumber % 500 === 0
      );
    }, "Package price must be at least ₹500 and in steps of ₹500."),
  packageDeliveryDays: z.coerce
    .number({ message: "Must be a number." })
    .int("Must be a whole number.")
    .min(1, "Delivery time must be between 1 and 30 days.")
    .max(30, "Delivery time must be between 1 and 30 days."),
  packageVideoLengthSeconds: z.coerce
    .number({ message: "Must be a number." })
    .int("Must be a whole number.")
    .min(1, "Video length must be between 1 and 60 seconds.")
    .max(60, "Video length must be between 1 and 60 seconds."),
});

type FormErrors = Partial<
  Record<keyof z.infer<typeof profileFormSchema>, string>
>;

export type CreatorProfileUpdateFormProps = {
  variant: "onboarding" | "settings";
  mode: "update";
  profileId?: string;
  adminMode?: boolean;
  initialProfile?: CreatorProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

type CreatorProfileUpdateFormContentProps = CreatorProfileUpdateFormProps & {
  user: AuthUser | null;
  onRequestReset: () => void;
};

const PROFILE_MOBILE_NAV_STICKY_CLASS =
  "sticky top-0 z-40 shrink-0 border-b border-gray-200/80 bg-white/90 backdrop-blur-md backdrop-saturate-[1.6] -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 2xl:-mx-12";

export function CreatorProfileUpdateForm({
  variant,
  mode,
  profileId,
  adminMode,
  initialProfile,
  onSuccess,
  onPendingChange,
}: CreatorProfileUpdateFormProps) {
  const { user } = useAuth();
  const [resetCounter, setResetCounter] = useState(0);
  const formKey = `update:${initialProfile?.id ?? profileId ?? "profile"}:${resetCounter}`;

  return (
    <CreatorProfileUpdateFormContent
      key={formKey}
      variant={variant}
      mode={mode}
      profileId={profileId}
      adminMode={adminMode}
      initialProfile={initialProfile}
      onSuccess={onSuccess}
      onPendingChange={onPendingChange}
      user={user}
      onRequestReset={() => setResetCounter((c) => c + 1)}
    />
  );
}

function CreatorProfileUpdateFormContent({
  variant,
  mode,
  profileId,
  adminMode,
  initialProfile,
  onSuccess,
  onPendingChange,
  user,
  onRequestReset,
}: CreatorProfileUpdateFormContentProps) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const location = useCreatorLocationForm({ initialProfile, adminMode });
  const introVideo = useCreatorIntroVideo({ mode, profileId, initialProfile });
  const profileImage = useCreatorProfileImage({
    mode,
    profileId,
    initialProfile,
  });
  const facets = useCreatorFacetsForm({
    initialProfile,
    enabled: Boolean(user),
  });
  const packages = useCreatorPackagesForm({ initialProfile });
  const packageDeliveryDays = (() => {
    const raw = Number(packages.packageDraft.deliveryDays);
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  })();
  const addOns = useCreatorAddOnsForm({
    initialProfile,
    enabled: Boolean(user),
    packageDeliveryDays,
  });
  const myPortfolioQuery = useMyPortfolioVideosQuery({
    enabled: !adminMode,
    staleTime: 2 * 60_000,
  });
  const adminPortfolioQuery = useAdminPortfolioVideosQuery({
    creatorId: profileId,
    enabled: !!adminMode,
    staleTime: 2 * 60_000,
  });
  const portfolioQuery = adminMode ? adminPortfolioQuery : myPortfolioQuery;
  const createPortfolioMutation = useCreatePortfolioVideoFlowMutation({ preventRedirect: true });
  const updatePortfolioMutation = useUpdatePortfolioVideoMutation();
  const deletePortfolioMutation = useDeletePortfolioVideoMutation();
  const industrySuggestionsQuery = usePortfolioIndustrySuggestionsQuery({
    enabled: Boolean(user),
  });
  const tagSuggestionsQuery = usePortfolioTagSuggestionsQuery({
    enabled: Boolean(user),
  });
  const portfolioIndustrySuggestions = useMemo(
    () =>
      (industrySuggestionsQuery.data ?? []).map((name) =>
        toTitleCaseLabel(name),
      ),
    [industrySuggestionsQuery.data],
  );
  const portfolioTagSuggestions = useMemo(
    () =>
      (tagSuggestionsQuery.data ?? []).map((name) => capitalizeFirstLetter(name)),
    [tagSuggestionsQuery.data],
  );
  const languageSuggestionsQuery = usePortfolioLanguageSuggestionsQuery({
    enabled: Boolean(user),
  });
  const restrictionSuggestionsQuery = useCreatorRestrictionSuggestionsQuery({
    enabled: Boolean(user),
  });
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(
    () =>
      (initialProfile?.restrictions ?? []).map((row) => row.restriction),
  );
  const [pfDrawerOpen, setPfDrawerOpen] = useState(false);
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

  function openPortfolioDrawer(video: PortfolioVideoApi | null) {
    setPfEditingVideo(video);
    setPfPendingVideoFile(null);
    setPfPendingThumbFile(null);
    setPfDrawerOpen(true);
  }

  function closePortfolioDrawer() {
    setPfDrawerOpen(false);
  }
  const [isDirty, setIsDirty] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<
    "save-draft" | "go-live" | "save-changes" | null
  >(null);
  const markDirty = useCallback(() => setIsDirty(true), []);

  const contactEmailDisplay = adminMode
    ? (initialProfile?.contactEmail?.trim() ?? "")
    : (user?.email ?? "");

  // Set after the draft hook runs (declared below); lets the save handler clear
  // the local draft without a declaration-order cycle.
  const clearDraftRef = useRef<() => void>(() => {});

  const submitCreatorProfileMutation = useSubmitCreatorProfileMutation({
    mode,
    profileId,
    adminMode,
    onSuccess: async (result) => {
      setIsDirty(false);
      clearDraftRef.current();

      if (
        !adminMode &&
        result.status === "updated" &&
        result.goLive &&
        isProfileFirstOnboardingMode()
      ) {
        await refreshUser();
        const me = await fetchAuthMe();
        if (
          me?.creatorApprovalStatus === "PENDING" &&
          me.creatorProfileComplete
        ) {
          router.push("/creator/under-review");
        }
      }

      await onSuccess();
    },
  });

  const pending = submitCreatorProfileMutation.isPending;
  const isSavingDraft = pending && submitIntent === "save-draft";
  const isPrimarySubmitting =
    pending &&
    (submitIntent === "go-live" || submitIntent === "save-changes");

  useLayoutEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

  useEffect(() => {
    if (!pending) {
      setSubmitIntent(null);
    }
  }, [pending]);

  const [phoneVerified, setPhoneVerified] = useState<boolean>(
    adminMode || !PROFILE_OTP_VERIFICATION_ENABLED,
  );
  const [phoneInput, setPhoneInput] = useState(
    () => initialProfile?.phone?.replace("+91", "") ?? "",
  );
  const [displayName, setDisplayName] = useState(
    () => initialProfile?.displayName ?? getInitialCreatorName(user),
  );
  const [bio, setBio] = useState(() => initialProfile?.bio?.trim() ?? "");
  const [gender, setGender] = useState<CreatorGender | "">(
    () => (initialProfile?.gender as CreatorGender | undefined) ?? "",
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    () => initialProfile?.dateOfBirth?.trim() ?? "",
  );
  const [shippingAddress, setShippingAddress] = useState(
    () => initialProfile?.shippingAddress?.trim() ?? "",
  );
  const [instagramUrl, setInstagramUrl] = useState(
    () => initialProfile?.instagramUrl?.trim() ?? "",
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    () => initialProfile?.youtubeUrl?.trim() ?? "",
  );
  const [snapchatUrl, setSnapchatUrl] = useState(
    () => initialProfile?.snapchatUrl?.trim() ?? "",
  );
  const [contentVolume, setContentVolume] = useState<
    CreatorContentVolumeBucket | ""
  >(
    () =>
      (initialProfile?.contentVolume as
        | CreatorContentVolumeBucket
        | undefined) ?? "",
  );
  const [collaborationCount, setCollaborationCount] = useState(() =>
    initialProfile?.collaborationCount != null
      ? String(initialProfile.collaborationCount)
      : "0",
  );
  const [travelRadius, setTravelRadius] = useState(() =>
    initialProfile?.travelRadius != null
      ? String(initialProfile.travelRadius)
      : "",
  );
  const [onLocationAvailable, setOnLocationAvailable] = useState(
    () => initialProfile?.onLocationAvailable ?? false,
  );
  // Client consent gate for go-live policies. Acceptance is not persisted;
  // a live profile (completeProfile) or an admin editing on the creator's
  // behalf is treated as already accepted so the gate never blocks them.
  const [goLivePolicies, setGoLivePolicies] =
    useState<GoLivePolicyAcceptanceState>(() =>
      createEmptyGoLivePolicyAcceptance(
        Boolean(initialProfile?.completeProfile) || Boolean(adminMode),
      ),
    );
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [activeSection, setActiveSection] = useState(NAV_ITEMS[0].id);

  const mobileNavRef = useRef<HTMLElement | null>(null);
  const mobileNavWrapRef = useRef<HTMLDivElement | null>(null);
  const [navArrows, setNavArrows] = useState({ left: false, right: false });

  const getMobileNavOffset = useCallback(() => {
    const navHeight = mobileNavWrapRef.current?.offsetHeight ?? 56;
    return navHeight + 12;
  }, []);

  const updateNavArrows = useCallback(() => {
    const el = mobileNavRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setNavArrows({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    });
  }, []);

  const scrollMobileNav = useCallback((dir: -1 | 1) => {
    const el = mobileNavRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(180, el.clientWidth * 0.7),
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const el = mobileNavRef.current;
    if (!el) return;
    updateNavArrows();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateNavArrows)
        : null;
    ro?.observe(el);
    el.addEventListener("scroll", updateNavArrows, { passive: true });
    window.addEventListener("resize", updateNavArrows);
    return () => {
      ro?.disconnect();
      el.removeEventListener("scroll", updateNavArrows);
      window.removeEventListener("resize", updateNavArrows);
    };
  }, [updateNavArrows]);

  // One-way Go-Live latch from the server. Once true the profile is live and the
  // button reverts to a normal "Save changes" (edits no longer gated).
  const completeProfile = Boolean(initialProfile?.completeProfile);

  const goLiveSnapshot = useMemo<GoLiveSnapshot>(() => {
    const selectedFacetDimensions = Object.entries(facets.selectedFacets)
      .filter(([, values]) => Array.isArray(values) && values.length > 0)
      .map(([dimension]) => dimension);
    const pkg = packages.packageDraft;
    const hasPackage =
      pkg.priceAmount.trim() !== "" &&
      Number(pkg.videoLengthSeconds) > 0 &&
      Number(pkg.deliveryDays) > 0;
    const publicVideoCount = (portfolioQuery.data ?? []).filter(
      (video) => video.visibilityStatus === "public",
    ).length;
    return {
      hasPhoto: Boolean(profileImage.profileImagePreviewUrl),
      hasIntroVideo: Boolean(introVideo.introVideoPreviewUrl),
      displayName,
      contactEmail: contactEmailDisplay,
      bio,
      countryName: location.countryName ?? "",
      stateName: location.stateName ?? "",
      city: location.city ?? "",
      gender,
      dateOfBirth,
      shippingAddress,
      selectedFacetDimensions,
      // Count only rows with a language actually selected — empty rows are
      // dropped from the payload, so they don't count toward completeness. This
      // must match the server (which counts persisted languages); otherwise the
      // client lets a creator "Go Live" with blank language rows while the
      // server keeps the profile incomplete and it never reaches review.
      languageCount: facets.selectedLanguages.length,
      hasPackage,
      publicVideoCount,
      policiesAccepted: areAllGoLivePoliciesAccepted(goLivePolicies),
    };
  }, [
    facets.selectedFacets,
    facets.selectedLanguages,
    packages.packageDraft,
    portfolioQuery.data,
    profileImage.profileImagePreviewUrl,
    introVideo.introVideoPreviewUrl,
    displayName,
    contactEmailDisplay,
    bio,
    location.countryName,
    location.stateName,
    location.city,
    gender,
    dateOfBirth,
    shippingAddress,
    goLivePolicies,
  ]);

  const goLiveMissing = useMemo(
    () => computeGoLiveMissing(goLiveSnapshot),
    [goLiveSnapshot],
  );

  const restrictionSuggestionNames = useMemo(
    () =>
      (restrictionSuggestionsQuery.data ?? []).map((item) => item.name),
    [restrictionSuggestionsQuery.data],
  );

  function toggleRestriction(name: string) {
    setSelectedRestrictions((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
    markDirty();
  }

  // Keep unsaved free-text progress in localStorage until the creator goes live.
  const draftValues = useMemo<CreatorProfileDraftFields>(
    () => ({
      displayName,
      bio,
      gender,
      dateOfBirth,
      shippingAddress,
      instagramUrl,
      youtubeUrl,
      snapchatUrl,
      contentVolume,
      collaborationCount,
      travelRadius,
      onLocationAvailable,
    }),
    [
      displayName,
      bio,
      gender,
      dateOfBirth,
      shippingAddress,
      instagramUrl,
      youtubeUrl,
      snapchatUrl,
      contentVolume,
      collaborationCount,
      travelRadius,
      onLocationAvailable,
    ],
  );

  const applyDraft = useCallback((draft: CreatorProfileDraftFields) => {
    setDisplayName(draft.displayName);
    setBio(draft.bio);
    setGender(draft.gender as CreatorGender | "");
    setDateOfBirth(draft.dateOfBirth);
    setShippingAddress(draft.shippingAddress);
    setInstagramUrl(draft.instagramUrl);
    setYoutubeUrl(draft.youtubeUrl);
    setSnapchatUrl(draft.snapchatUrl);
    setContentVolume(draft.contentVolume as CreatorContentVolumeBucket | "");
    setCollaborationCount(draft.collaborationCount);
    setTravelRadius(draft.travelRadius);
    setOnLocationAvailable(draft.onLocationAvailable);
    setIsDirty(true);
  }, []);

  const { clearDraft } = useCreatorProfileDraft({
    enabled: variant === "settings" && !adminMode && !completeProfile,
    userId: user?.id,
    profileId,
    values: draftValues,
    apply: applyDraft,
  });
  useEffect(() => {
    clearDraftRef.current = clearDraft;
  }, [clearDraft]);

  useEffect(() => {
    if (variant !== "settings") return;

    function onScroll() {
      const isMobileNav = window.matchMedia("(max-width: 900px)").matches;
      const offset = isMobileNav ? getMobileNavOffset() : 120;
      let current = NAV_ITEMS[0].id;
      for (const item of NAV_ITEMS) {
        const el = document.getElementById(`pe-section-${item.id}`);
        if (el && el.getBoundingClientRect().top <= offset) {
          current = item.id;
        }
      }
      if (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 4
      ) {
        current = NAV_ITEMS[NAV_ITEMS.length - 1].id;
      }
      setActiveSection(current);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant, getMobileNavOffset]);

  function scrollToSection(id: string) {
    const el = document.getElementById(`pe-section-${id}`);
    if (el) {
      const isMobileNav =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 900px)").matches;
      const offset = isMobileNav ? getMobileNavOffset() : 76;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - offset,
        behavior: "smooth",
      });
    }
  }

  const runSubmit = useCallback(
    async (goLive: boolean) => {
      // Go-Live gate applies ONLY when explicitly going live. A draft save
      // (goLive === false) persists partial progress without publishing.
      if (goLive && !completeProfile && goLiveMissing.length > 0) {
        toast.error(
          `Complete your profile to go live. Still needed: ${goLiveMissing.join(", ")}.`,
        );
        return;
      }

      if (introVideo.uploadingIntroVideo) {
        toast.error("Wait for uploads to finish before saving your profile.");
        return;
      }
      if (
        facets.facetOptionsQuery.isLoading ||
        addOns.addOnOptionsQuery.isLoading
      ) {
        toast.error("Profile options are still loading.");
        return;
      }
      if (
        facets.facetOptionsQuery.isError ||
        addOns.addOnOptionsQuery.isError
      ) {
        toast.error("Could not load profile options. Try again.");
        return;
      }

      if (mode === "update" && !profileId) {
        toast.error("Missing profile id");
        return;
      }

      const parseResult = profileFormSchema.safeParse({
        displayName,
        instagramUrl,
        youtubeUrl,
        snapchatUrl,
        collaborationCount,
        travelRadius,
        packagePriceAmount: packages.packageDraft.priceAmount,
        packageDeliveryDays: packages.packageDraft.deliveryDays,
        packageVideoLengthSeconds: packages.packageDraft.videoLengthSeconds,
      });

      if (!parseResult.success) {
        const fieldErrors = parseResult.error.flatten().fieldErrors;
        const newErrors: FormErrors = {};
        for (const [key, messages] of Object.entries(fieldErrors)) {
          if (messages && messages.length > 0) {
            newErrors[key as keyof FormErrors] = messages[0];
          }
        }
        setFormErrors(newErrors);

        toast.error("Please fix the validation errors in the form.");

        const firstErrorKey = Object.keys(newErrors)[0];
        if (firstErrorKey) {
          const el = document.getElementById(firstErrorKey);
          if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: "smooth" });
            el.focus();
          }
        }
        return;
      }

      setFormErrors({});
      const parsedData = parseResult.data;

      const instagram = parsedData.instagramUrl || undefined;
      const youtube = parsedData.youtubeUrl || undefined;
      const snapchat = parsedData.snapchatUrl || undefined;
      const radius =
        parsedData.travelRadius === "" ? undefined : parsedData.travelRadius;

      const builtPackages = packages.buildPackages();
      if (!builtPackages) return;

      const builtAddOns = addOns.buildAddOns();
      if (!builtAddOns) return;

      const facetSelections: CreatorFacetSelectionPayload[] = [];
      for (const section of facetSections) {
        for (const slug of facets.selectedFacets[section.dimension] ?? []) {
          facetSelections.push({ dimension: section.dimension, slug });
        }
      }

      const profileLanguages: CreatorProfileLanguagePayload[] =
        facets.selectedLanguages.map((slug) => ({ slug }));

      const payload: UpdateCreatorProfilePayload = {
        contactEmail: contactEmailDisplay,
        profileImageKey: profileImage.profileImageRemoved
          ? ""
          : (profileImage.pendingProfileImageKey ?? undefined),
        displayName: parsedData.displayName,
        ...(introVideo.pendingIntroVideoKey
          ? { introVideoKey: introVideo.pendingIntroVideoKey }
          : introVideo.introVideoRemoved
            ? { introVideoKey: "" }
            : {}),
        ...(adminMode && phoneInput ? { phone: "+91" + phoneInput } : {}),
        countryName: location.countryName || undefined,
        stateName: location.stateName || undefined,
        city: location.city.trim() || undefined,
        bio: bio.trim() || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
        instagramUrl: instagram,
        youtubeUrl: youtube,
        snapchatUrl: snapchat,
        contentVolume: contentVolume || undefined,
        collaborationCount: parsedData.collaborationCount,
        travelRadius: radius,
        onLocationAvailable,
        facetSelections,
        profileLanguages,
        restrictions: selectedRestrictions,
        packages: builtPackages,
        addOns: builtAddOns,
      };

      let finalPayload = { ...payload };

      if (initialProfile && mode === "update") {
        if (finalPayload.displayName === initialProfile.displayName) delete finalPayload.displayName;
        if (finalPayload.bio === (initialProfile.bio || undefined)) delete finalPayload.bio;
        if (finalPayload.gender === (initialProfile.gender || undefined)) delete finalPayload.gender;
        if (finalPayload.dateOfBirth === (initialProfile.dateOfBirth || undefined)) delete finalPayload.dateOfBirth;
        if (finalPayload.shippingAddress === (initialProfile.shippingAddress || undefined)) delete finalPayload.shippingAddress;
        if (finalPayload.instagramUrl === (initialProfile.instagramUrl || undefined)) delete finalPayload.instagramUrl;
        if (finalPayload.youtubeUrl === (initialProfile.youtubeUrl || undefined)) delete finalPayload.youtubeUrl;
        if (finalPayload.snapchatUrl === (initialProfile.snapchatUrl || undefined)) delete finalPayload.snapchatUrl;
        if (finalPayload.contentVolume === (initialProfile.contentVolume || undefined)) delete finalPayload.contentVolume;
        if (finalPayload.collaborationCount === initialProfile.collaborationCount) delete finalPayload.collaborationCount;
        if (finalPayload.travelRadius === (initialProfile.travelRadius || undefined)) delete finalPayload.travelRadius;
        if (finalPayload.onLocationAvailable === initialProfile.onLocationAvailable) delete finalPayload.onLocationAvailable;
        if (finalPayload.contactEmail === (initialProfile.contactEmail || undefined)) delete finalPayload.contactEmail;
        if (finalPayload.countryName === (initialProfile.countryName || undefined)) delete finalPayload.countryName;
        if (finalPayload.stateName === (initialProfile.stateName || undefined)) delete finalPayload.stateName;
        if (finalPayload.city === (initialProfile.city || undefined)) delete finalPayload.city;
      }

      setSubmitIntent(
        goLive ? "go-live" : completeProfile ? "save-changes" : "save-draft",
      );
      submitCreatorProfileMutation.mutate({
        payload: goLive
          ? {
              ...finalPayload,
              goLive: true,
              acceptedGoLivePolicies: true,
            }
          : finalPayload,
      });
    },
    [
      addOns,
      bio,
      collaborationCount,
      contentVolume,
      dateOfBirth,
      displayName,
      facets,
      gender,
      instagramUrl,
      youtubeUrl,
      snapchatUrl,
      profileImage,
      introVideo,
      location,
      mode,
      onLocationAvailable,
      packages,
      phoneInput,
      profileId,
      shippingAddress,
      submitCreatorProfileMutation,
      travelRadius,
      selectedRestrictions,
      adminMode,
      contactEmailDisplay,
      initialProfile,
      user?.email,
      completeProfile,
      goLiveMissing,
    ],
  );

  // Form submit (Enter key / primary button): an already-live profile saves
  // changes (no re-publish needed); a not-yet-live profile treats the primary
  // action as "Go Live".
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void runSubmit(!completeProfile);
    },
    [runSubmit, completeProfile],
  );

  // Explicit "Save draft" — persist partial progress without publishing.
  const handleSaveDraft = useCallback(() => {
    void runSubmit(false);
  }, [runSubmit]);

  const handleDiscard = useCallback(() => {
    onRequestReset();
    toast.info("Changes discarded");
  }, [onRequestReset]);

  const { confirm, dialog: confirmDialog } = useRosyConfirmDialog();

  useUnsavedChangesGuard(isDirty && !pending, { confirm });

  const navCounts = useMemo(() => {
    const nicheCount =
      Object.values(facets.selectedFacets).reduce(
        (acc, arr) => acc + (arr?.length ?? 0),
        0,
      ) + facets.selectedLanguages.length;
    return {
      niche: nicheCount > 0 ? nicheCount : null,
      portfolio:
        (portfolioQuery.data?.length ?? 0) > 0
          ? (portfolioQuery.data?.length ?? 0)
          : null,
    };
  }, [
    facets.selectedFacets,
    facets.selectedLanguages.length,
    portfolioQuery.data,
  ]);

  useEffect(() => {
    updateNavArrows();
  }, [navCounts, updateNavArrows]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const isSettings = variant === "settings";

  return (
    <div
      className={cn(
        "pe-scope flex flex-1 w-full min-w-0 flex-col",
        !isSettings && "pe-onboarding",
      )}
    >
      {confirmDialog}
      {isSettings ? (
        <>
          <div
            ref={mobileNavWrapRef}
            className={cn(
              "pe-nav-mobile-wrap",
              PROFILE_MOBILE_NAV_STICKY_CLASS,
              "max-[900px]:block min-[901px]:hidden",
            )}
            data-left={navArrows.left}
            data-right={navArrows.right}
            aria-label="Profile sections"
          >
            <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3">
              <button
                type="button"
                className="pe-nav-mobile-arrow"
                data-dir="left"
                data-show={navArrows.left}
                aria-label="Scroll sections left"
                tabIndex={navArrows.left ? 0 : -1}
                onClick={() => scrollMobileNav(-1)}
              >
                <ChevronLeft size={18} />
              </button>

              <nav className="pe-nav-mobile" ref={mobileNavRef}>
                {NAV_ITEMS.map((item) => {
                  const count =
                    item.id === "niche"
                      ? navCounts.niche
                      : item.id === "portfolio"
                        ? navCounts.portfolio
                        : null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="pe-nav-mobile-link"
                      data-active={activeSection === item.id}
                      onClick={() => scrollToSection(item.id)}
                    >
                      {item.label}
                      {count != null ? (
                        <span className="pe-nav-mobile-count">{count}</span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>

              <button
                type="button"
                className="pe-nav-mobile-arrow"
                data-dir="right"
                data-show={navArrows.right}
                aria-label="Scroll sections right"
                tabIndex={navArrows.right ? 0 : -1}
                onClick={() => scrollMobileNav(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="mb-4 space-y-4">
            <CreatorSpotlightProgram />
            {!completeProfile ? <GoLiveBanner missing={goLiveMissing} /> : null}
          </div>
        </>
      ) : null}
      <motion.form
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex min-w-0 flex-1 flex-col"
        onSubmit={(event) => void handleSubmit(event)}
      >
        {isSettings ? (
          <div className="pe-shell">
            <nav className="pe-nav" data-tour="creator-profile-edit-nav">
              {NAV_ITEMS.map((item) => {
                const IconCmp = item.icon;
                const count =
                  item.id === "niche"
                    ? navCounts.niche
                    : item.id === "portfolio"
                      ? navCounts.portfolio
                      : null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="pe-nav-link"
                    data-active={activeSection === item.id}
                    onClick={() => scrollToSection(item.id)}
                  >
                    <IconCmp size={16} />
                    {item.label}
                    {count != null ? (
                      <span className="pe-nav-count">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="pe-form">{renderFormSections()}</div>
          </div>
        ) : (
          <div className="pe-form">{renderFormSections()}</div>
        )}

        {isSettings ? (
          <div
            className="pe-savebar"
            data-visible={isDirty || pending || !completeProfile}
          >
            <div className="pe-savebar-inner">
              {pending ? (
                <Spinner
                  className="size-4"
                  aria-hidden
                  style={{ color: "var(--primary)" }}
                />
              ) : (
                <span className="pe-savebar-dot" />
              )}
              <span className="pe-savebar-msg">
                {isSavingDraft
                  ? "Saving draft..."
                  : submitIntent === "go-live"
                    ? "Going live..."
                    : submitIntent === "save-changes"
                      ? "Saving changes..."
                      : completeProfile
                        ? "You have unsaved changes"
                        : "Finish your profile to go live"}
              </span>
              <div className="pe-savebar-actions">
                <button
                  type="button"
                  className="pe-btn pe-btn-ghost"
                  onClick={handleDiscard}
                  disabled={pending}
                >
                  Discard
                </button>
                {/* Not-yet-live profiles can save partial progress without
                    publishing. Live profiles only need the single save button. */}
                {!completeProfile ? (
                  <button
                    type="button"
                    className="pe-btn pe-btn-ghost"
                    onClick={handleSaveDraft}
                    disabled={
                      pending ||
                      introVideo.uploadingIntroVideo ||
                      profileImage.uploadingProfileImage ||
                      facets.facetOptionsQuery.isLoading ||
                      addOns.addOnOptionsQuery.isLoading
                    }
                  >
                    {isSavingDraft ? "Saving…" : "Save draft"}
                  </button>
                ) : null}
                {/* Hide "Go Live" until the profile is actually complete — a
                    not-yet-live creator can only Save draft until every
                    requirement is met. Live profiles always show "Save changes". */}
                {completeProfile || goLiveMissing.length === 0 ? (
                  <button
                    type="submit"
                    className="pe-btn pe-btn-primary"
                    disabled={
                      pending ||
                      introVideo.uploadingIntroVideo ||
                      profileImage.uploadingProfileImage ||
                      facets.facetOptionsQuery.isLoading ||
                      addOns.addOnOptionsQuery.isLoading
                    }
                  >
                    {isPrimarySubmitting ? (
                      <>
                        <Spinner className="size-4" aria-hidden />
                        {completeProfile ? "Saving…" : "Going live…"}
                      </>
                    ) : completeProfile ? (
                      <>
                        <Check size={16} />
                        Save changes
                      </>
                    ) : (
                      <>
                        <Rocket size={16} />
                        Go Live
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {!isSettings ? (
          <motion.div variants={itemVariants} className="flex justify-end">
            <Button
              type="submit"
              className="mt-8 w-full sm:w-auto"
              disabled={
                pending ||
                introVideo.uploadingIntroVideo ||
                profileImage.uploadingProfileImage ||
                facets.facetOptionsQuery.isLoading ||
                addOns.addOnOptionsQuery.isLoading
              }
            >
              {pending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  {mode === "update" ? "Saving..." : "Creating..."}
                </>
              ) : mode === "update" ? (
                "Save changes"
              ) : (
                "Create profile"
              )}
            </Button>
          </motion.div>
        ) : null}
      </motion.form>
      {renderPortfolioDrawer()}
    </div>
  );

  function renderFormSections() {
    return (
      <>
        <motion.div variants={itemVariants}>
          <SectionCard
            id="media"
            tourId="creator-profile-edit-media"
            icon={Camera}
            title="Photo & featured video"
            required
            desc="Add your profile photo and a video showcasing your best work — brand collabs, UGC, or anything that shows what you can do."
          >
            <div className="pe-media-split">
              <div className="pe-media-split-col">
                <CreatorProfileImageField
                  imagePreviewUrl={profileImage.profileImagePreviewUrl}
                  accept={PROFILE_IMAGE_ACCEPT}
                  disabled={profileImage.uploadingProfileImage || pending}
                  uploading={profileImage.uploadingProfileImage}
                  fileInputRef={profileImage.profileImageInputRef}
                  onSelectFile={(file) => {
                    void profileImage.handleProfileImageSelected(file);
                    markDirty();
                  }}
                />
              </div>

              <div className="pe-media-split-divider" aria-hidden="true" />

              <div className="pe-media-split-col">
                <CreatorProfileIntroVideoField
                  videoPreviewUrl={introVideo.introVideoPreviewUrl}
                  accept={INTRO_VIDEO_ACCEPT}
                  disabled={introVideo.uploadingIntroVideo || pending}
                  uploading={introVideo.uploadingIntroVideo}
                  fileInputRef={introVideo.introVideoInputRef}
                  onSelectFile={(file) => {
                    void introVideo.handleIntroVideoSelected(file);
                    markDirty();
                  }}
                />
              </div>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard
            id="basics"
            tourId="creator-profile-edit-basics"
            icon={User}
            title="Basic details"
            desc="Name, contact and the bio brands read first."
          >
            {adminMode ? (
              <div className="pe-field">
                <label htmlFor="phone">Phone number</label>
                <div className="pe-input-wrap">
                  <span className="pe-lead" style={{ fontWeight: 600 }}>
                    +91
                  </span>
                  <input
                    id="phone"
                    className="pe-input"
                    disabled={pending}
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value.replace(/\D/g, ""));
                      markDirty();
                    }}
                    required
                  />
                </div>
              </div>
            ) : PROFILE_OTP_VERIFICATION_ENABLED ? (
              <div className="pe-field">
                <label>Account verification</label>
                <span className="pe-help">
                  Required before creator profile changes can be saved.
                </span>
                <PhoneVerificationField
                  idPrefix="creator-profile"
                  disabled={pending}
                  onVerifiedChange={setPhoneVerified}
                  onVerified={() => void refreshUser()}
                />
              </div>
            ) : null}

            <div className="pe-grid pe-grid-2">
              <div className="pe-field">
                <label htmlFor="displayName">
                  Display name
                  <span className="pe-required" aria-label="required" title="Required to go live">
                    {" "}*
                  </span>
                </label>
                <input
                  id="displayName"
                  className="pe-input"
                  disabled={pending}
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (formErrors.displayName)
                      setFormErrors((prev) => ({
                        ...prev,
                        displayName: undefined,
                      }));
                    markDirty();
                  }}
                  required
                  autoComplete="name"
                  aria-invalid={!!formErrors.displayName}
                />
                {formErrors.displayName && (
                  <p
                    className="pe-help text-destructive"
                    style={{ color: "var(--destructive)" }}
                  >
                    {formErrors.displayName}
                  </p>
                )}
              </div>
              {contactEmailDisplay || adminMode ? (
                <div className="pe-field">
                  <label htmlFor="contactEmail">
                    Contact email
                    <span className="pe-required" aria-label="required" title="Required to go live">
                      {" "}*
                    </span>
                  </label>
                  <div className="pe-input-wrap">
                    <span className="pe-lead">
                      <MessageSquare size={15} />
                    </span>
                    <input
                      id="contactEmail"
                      className="pe-input"
                      type="email"
                      value={contactEmailDisplay}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pe-field">
              <label htmlFor="bio">
                Bio
                <span className="pe-required" aria-label="required" title="Required to go live">
                  {" "}*
                </span>
                <span className="pe-field-count">{bio.length}/200</span>
              </label>
              <textarea
                id="bio"
                className="pe-textarea"
                disabled={pending}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value.slice(0, 200));
                  markDirty();
                }}
                rows={4}
                maxLength={200}
                placeholder="2–3 punchy lines. Mention your niche, style and standout results."
              />
              <span className="pe-help">
                What do you create? Who do you love working with?
              </span>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard
            id="about"
            icon={MapPin}
            title="About you"
            desc="Location and logistics brands use to match and ship."
          >
            <div className="pe-grid pe-grid-3">
              {adminMode ? (
                <div className="pe-field">
                  <label htmlFor="country">Country</label>
                  <input
                    id="country"
                    className="pe-input"
                    value="India"
                    readOnly
                    disabled
                  />
                </div>
              ) : (
                <PeSelectField
                  id="country"
                  label="Country"
                  required
                  value={location.countryCode}
                  placeholder="Select country"
                  disabled={pending}
                  options={location.countries.map((c) => ({
                    value: c.isoCode,
                    label: c.name,
                  }))}
                  onChange={(value) => {
                    location.setCountryCode(value);
                    location.setStateCode("");
                    location.setCity("");
                    markDirty();
                  }}
                />
              )}
              <PeSelectField
                id="state"
                label="State"
                required
                value={location.stateCode}
                placeholder={
                  location.countryCode ? "Select state" : "Select country first"
                }
                disabled={
                  pending ||
                  !location.countryCode ||
                  location.states.length === 0
                }
                options={location.states.map((s) => ({
                  value: s.isoCode,
                  label: s.name,
                }))}
                onChange={(value) => {
                  location.setStateCode(value);
                  location.setCity("");
                  markDirty();
                }}
              />
              <PeSelectField
                id="city"
                label="City"
                required
                value={location.city}
                placeholder={
                  location.stateCode ? "Select city" : "Select state first"
                }
                disabled={
                  pending || !location.stateCode || location.cities.length === 0
                }
                options={location.cities.map((row) => ({
                  value: row.name,
                  label: row.name,
                }))}
                onChange={(value) => {
                  location.setCity(value);
                  markDirty();
                }}
              />
            </div>

            <div className="pe-grid pe-grid-2">
              <PeSelectField
                id="gender"
                label="Gender"
                required
                value={gender}
                placeholder="Select gender"
                disabled={pending}
                options={genderOptions}
                allowClear
                onChange={(value) => {
                  setGender(value as CreatorGender);
                  markDirty();
                }}
              />
              <div className="pe-field">
                <label htmlFor="dateOfBirth">
                  Date of birth
                  <span className="pe-required" aria-label="required" title="Required to go live">
                    {" "}*
                  </span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="dateOfBirth"
                    type="date"
                    className="pe-input"
                    style={{ width: "100%" }}
                    disabled={pending}
                    value={dateOfBirth}
                    max={new Date().toISOString().split("T")[0]}
                    onClick={(e) => {
                      try {
                        if ("showPicker" in HTMLInputElement.prototype) {
                          e.currentTarget.showPicker();
                        }
                      } catch {
                        // ignore
                      }
                    }}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      markDirty();
                    }}
                  />
                  <CalendarIcon
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                </div>
              </div>
            </div>

            <div className="pe-field">
              <label htmlFor="shippingAddress">
                Shipping address
                <span className="pe-required" aria-label="required" title="Required to go live">
                  {" "}*
                </span>
              </label>
              <textarea
                id="shippingAddress"
                className="pe-textarea"
                disabled={pending}
                value={shippingAddress}
                onChange={(e) => {
                  setShippingAddress(e.target.value);
                  markDirty();
                }}
                rows={2}
                maxLength={2000}
                placeholder="Where brands send product samples (kept private)."
              />
            </div>

            <div className="pe-grid pe-grid-2" style={{ alignItems: "center" }}>
              <div className="pe-switchrow">
                <div>
                  <div className="pe-switchrow-title">
                    Available for on-location shoots
                  </div>
                  <div className="pe-switchrow-desc">
                    Brands can book you to film at their store or venue.
                  </div>
                </div>
                <Switch
                  id="onLocation"
                  disabled={pending}
                  checked={onLocationAvailable}
                  onCheckedChange={(checked) => {
                    setOnLocationAvailable(checked);
                    markDirty();
                  }}
                />
              </div>

              <div className="pe-field">
                <label htmlFor="travelRadius">Travel radius (km)</label>
                <input
                  id="travelRadius"
                  type="number"
                  min={0}
                  className="pe-input"
                  disabled={pending || !onLocationAvailable}
                  value={travelRadius}
                  onChange={(e) => {
                    setTravelRadius(e.target.value);
                    if (formErrors.travelRadius)
                      setFormErrors((prev) => ({
                        ...prev,
                        travelRadius: undefined,
                      }));
                    markDirty();
                  }}
                  placeholder="How far you'll travel for on-location shoots."
                  aria-invalid={!!formErrors.travelRadius}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
                {formErrors.travelRadius && (
                  <p
                    className="pe-help text-destructive"
                    style={{ color: "var(--destructive)" }}
                  >
                    {formErrors.travelRadius}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard
            id="niche"
            tourId="creator-profile-edit-niche"
            icon={Sparkles}
            title="Niche & content"
            desc="The facets that decide which briefs you show up for."
          >
            <CatalogStatus
              loading={facets.facetOptionsQuery.isLoading}
              error={facets.facetOptionsQuery.isError}
              label="creator profile options"
              onRetry={() => void facets.facetOptionsQuery.refetch()}
            />

            {!facets.facetOptionsQuery.isLoading &&
            !facets.facetOptionsQuery.isError ? (
              <>
                <p className="pe-section-required-note">
                  <span className="pe-required">*</span>
                  Content format, content category, category experience and at
                  least one language are required to go live.
                </p>

                {facetSections.map((section) => {
                  const options =
                    facets.facetOptionsByDimension[section.dimension] ?? [];
                  const selected =
                    facets.selectedFacets[section.dimension] ?? [];
                  if (options.length === 0) return null;
                  return (
                    <FacetChipSection
                      key={section.dimension}
                      label={section.label}
                      required={section.required}
                      options={options}
                      selected={selected}
                      disabled={pending}
                      onToggle={(slug) => {
                        facets.toggleFacet(section.dimension, slug);
                        markDirty();
                      }}
                    />
                  );
                })}

                {restrictionSuggestionNames.length > 0 ? (
                  <RestrictionChipSection
                    label="Open to"
                    help="Optional — categories you're comfortable creating for. Only shown to brands when you opt in."
                    items={restrictionSuggestionNames}
                    selected={selectedRestrictions}
                    disabled={
                      pending || restrictionSuggestionsQuery.isLoading
                    }
                    onToggle={toggleRestriction}
                  />
                ) : null}

                <div className="border-t border-border/50 pt-5">
                  <div className="pe-field">
                    <label>
                      Languages
                      <span className="pe-required" aria-label="required" title="Required to go live">
                        {" "}*
                      </span>
                      {facets.selectedLanguages.length > 0 ? (
                        <span className="pe-field-count">
                          {facets.selectedLanguages.length}
                        </span>
                      ) : null}
                    </label>
                    <span className="pe-help">
                      Pick every language you can create in.
                    </span>
                    <LanguageMultiSelect
                      options={facets.facetOptionsByDimension.LANGUAGE ?? []}
                      selected={facets.selectedLanguages}
                      disabled={pending || facets.facetOptionsQuery.isLoading}
                      onToggle={(slug) => {
                        facets.toggleLanguage(slug);
                        markDirty();
                      }}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard
            id="social"
            icon={Share2}
            title="Social & activity"
            desc="Optional links and how much you create."
          >
            <div className="mb-6">
              <CreatorSocialAccounts
                adminMode={adminMode}
                profileId={profileId}
              />
            </div>
            <div className="pe-grid pe-grid-3">
              <div className="pe-field">
                <label htmlFor="instagramUrl">
                  Instagram
                  <span className="pe-opt">optional</span>
                </label>
                <div className="pe-input-wrap">
                  <span className="pe-lead">
                    <Instagram size={15} />
                  </span>
                  <input
                    id="instagramUrl"
                    className="pe-input"
                    disabled={pending}
                    value={instagramUrl}
                    onChange={(e) => {
                      setInstagramUrl(e.target.value);
                      if (formErrors.instagramUrl)
                        setFormErrors((prev) => ({
                          ...prev,
                          instagramUrl: undefined,
                        }));
                      markDirty();
                    }}
                    placeholder="https://instagram.com/…"
                    aria-invalid={!!formErrors.instagramUrl}
                  />
                </div>
                {formErrors.instagramUrl && (
                  <p
                    className="pe-help text-destructive"
                    style={{ color: "var(--destructive)" }}
                  >
                    {formErrors.instagramUrl}
                  </p>
                )}
              </div>
              <div className="pe-field">
                <label htmlFor="youtubeUrl">
                  YouTube
                  <span className="pe-opt">optional</span>
                </label>
                <div className="pe-input-wrap">
                  <span className="pe-lead">
                    <Youtube size={14} />
                  </span>
                  <input
                    id="youtubeUrl"
                    className="pe-input"
                    disabled={pending}
                    value={youtubeUrl}
                    onChange={(e) => {
                      setYoutubeUrl(e.target.value);
                      if (formErrors.youtubeUrl)
                        setFormErrors((prev) => ({
                          ...prev,
                          youtubeUrl: undefined,
                        }));
                      markDirty();
                    }}
                    placeholder="https://youtube.com/@…"
                    inputMode="url"
                    aria-invalid={!!formErrors.youtubeUrl}
                  />
                </div>
                {formErrors.youtubeUrl && (
                  <p
                    className="pe-help text-destructive"
                    style={{ color: "var(--destructive)" }}
                  >
                    {formErrors.youtubeUrl}
                  </p>
                )}
              </div>
              <div className="pe-field">
                <label htmlFor="snapchatUrl">
                  Snapchat
                  <span className="pe-opt">optional</span>
                </label>
                <div className="pe-input-wrap">
                  <span className="pe-lead">
                    <Ghost size={15} />
                  </span>
                  <input
                    id="snapchatUrl"
                    className="pe-input"
                    disabled={pending}
                    value={snapchatUrl}
                    onChange={(e) => {
                      setSnapchatUrl(e.target.value);
                      if (formErrors.snapchatUrl)
                        setFormErrors((prev) => ({
                          ...prev,
                          snapchatUrl: undefined,
                        }));
                      markDirty();
                    }}
                    placeholder="https://snapchat.com/add/…"
                    inputMode="url"
                    aria-invalid={!!formErrors.snapchatUrl}
                  />
                </div>
                {formErrors.snapchatUrl && (
                  <p
                    className="pe-help text-destructive"
                    style={{ color: "var(--destructive)" }}
                  >
                    {formErrors.snapchatUrl}
                  </p>
                )}
              </div>
            </div>

            <div className="pe-grid pe-grid-2">
              <PeSelectField
                id="contentVolume"
                label="Content volume"
                value={contentVolume}
                placeholder="Select volume"
                disabled={pending}
                options={contentVolumeOptions}
                allowClear
                onChange={(value) => {
                  setContentVolume(value as CreatorContentVolumeBucket);
                  markDirty();
                }}
                help="Roughly how many videos you can produce."
              />
              <div className="pe-field">
                <label htmlFor="collaborationCount">Past collaborations</label>
                <input
                  id="collaborationCount"
                  className="pe-input"
                  disabled={pending}
                  value={collaborationCount}
                  inputMode="numeric"
                  onChange={(e) => {
                    setCollaborationCount(
                      normalizeWholeNumberInput(e.target.value),
                    );
                    if (formErrors.collaborationCount)
                      setFormErrors((prev) => ({
                        ...prev,
                        collaborationCount: undefined,
                      }));
                    markDirty();
                  }}
                  aria-invalid={!!formErrors.collaborationCount}
                />
                {formErrors.collaborationCount && (
                  <p
                    className="pe-help text-destructive"
                    style={{ color: "var(--destructive)" }}
                  >
                    {formErrors.collaborationCount}
                  </p>
                )}
                <span className="pe-help">
                  Total brand projects you&apos;ve delivered.
                </span>
              </div>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard
            id="packages"
            tourId="creator-profile-edit-packages"
            icon={Layers}
            title="Packages"
            required
            desc="What brands can book. Set price, delivery and what's included."
            headerNote="GoCollab takes 20% of the complete order value (base package + add-ons)."
          >
            <PackageEarningsBanner
              packagePriceAmount={packages.packageDraft.priceAmount}
              selectedAddOnSlugs={addOns.selectedAddOnSlugs}
              addOnDrafts={addOns.addOnDrafts}
            />
            <div className="pe-grid pe-grid-1" style={{ gap: 24, marginTop: 16 }}>
              <PackageEditor
                draft={packages.packageDraft}
                disabled={pending}
                onChange={(draft) => {
                  packages.setPackageDraft(draft);

                  // Live validation for package price
                  const priceSchema =
                    profileFormSchema.shape.packagePriceAmount;
                  const result = priceSchema.safeParse(draft.priceAmount);
                  if (!result.success) {
                    setFormErrors((prev) => ({
                      ...prev,
                      packagePriceAmount: result.error.issues[0].message,
                    }));
                  } else {
                    setFormErrors((prev) => ({
                      ...prev,
                      packagePriceAmount: undefined,
                    }));
                  }

                  if (formErrors.packageDeliveryDays)
                    setFormErrors((prev) => ({
                      ...prev,
                      packageDeliveryDays: undefined,
                    }));
                  if (formErrors.packageVideoLengthSeconds)
                    setFormErrors((prev) => ({
                      ...prev,
                      packageVideoLengthSeconds: undefined,
                    }));
                  markDirty();
                }}
                errors={{
                  priceAmount: formErrors.packagePriceAmount,
                  deliveryDays: formErrors.packageDeliveryDays,
                  videoLengthSeconds: formErrors.packageVideoLengthSeconds,
                }}
              />
            </div>
            <CatalogStatus
              loading={addOns.addOnOptionsQuery.isLoading}
              error={addOns.addOnOptionsQuery.isError}
              label="add-on options"
              onRetry={() => void addOns.addOnOptionsQuery.refetch()}
            />

            {!addOns.addOnOptionsQuery.isLoading &&
            !addOns.addOnOptionsQuery.isError ? (
              <AddOnCatalogEditor
                options={addOns.addOnOptions}
                selectedSlugs={addOns.selectedAddOnSlugs}
                drafts={addOns.addOnDrafts}
                unmatchedNames={addOns.hydratedAddOns.unmatchedNames}
                disabled={pending}
                packageDeliveryDays={packageDeliveryDays}
                onToggle={(option) => {
                  addOns.toggleAddOn(option);
                  markDirty();
                }}
                onDraftChange={(slug, patch) => {
                  addOns.setAddOnsTouched(true);
                  addOns.setAddOnDrafts((current) => ({
                    ...(addOns.addOnsTouched
                      ? current
                      : addOns.effectiveAddOnDrafts),
                    [slug]: {
                      ...((addOns.addOnsTouched
                        ? current
                        : addOns.effectiveAddOnDrafts)[slug] ?? {
                        priceAmount: "",
                        description: "",
                      }),
                      ...patch,
                    },
                  }));
                  markDirty();
                }}
              />
            ) : null}
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard
            id="portfolio"
            tourId="creator-profile-edit-portfolio"
            icon={Film}
            title="Portfolio"
            required
            desc="Manage your reels. Edit each video's tags, industry, language and visibility. At least 3 videos are required to go live."
          >
            {portfolioQuery.isLoading ? (
              <CatalogStatus
                loading
                error={false}
                label="portfolio videos"
                onRetry={() => {}}
              />
            ) : portfolioQuery.isError ? (
              <CatalogStatus
                loading={false}
                error
                label="portfolio videos"
                onRetry={() => void portfolioQuery.refetch()}
              />
            ) : (
              <PortfolioGrid
                videos={portfolioQuery.data ?? []}
                onEdit={(video) => openPortfolioDrawer(video)}
                onDelete={(video) => {
                  deletePortfolioMutation.mutate({ videoId: video.id });
                }}
                onAdd={() => openPortfolioDrawer(null)}
              />
            )}

            <GoLivePolicyAcceptance
              value={goLivePolicies}
              onChange={setGoLivePolicies}
              showRequiredHint={!completeProfile}
              disabled={completeProfile || Boolean(adminMode)}
            />
          </SectionCard>
        </motion.div>
      </>
    );
  }

  function renderPortfolioDrawer() {
    return (
      <PortfolioEditDrawer
        video={pfEditingVideo}
        open={pfDrawerOpen}
        onClose={closePortfolioDrawer}
        videoFile={pfPendingVideoFile}
        thumbFile={pfPendingThumbFile}
        videoInputRef={pfVideoInputRef}
        thumbInputRef={pfThumbInputRef}
        onSelectVideoFile={setPfPendingVideoFile}
        onSelectThumbFile={setPfPendingThumbFile}
        industrySuggestions={portfolioIndustrySuggestions}
        tagSuggestions={portfolioTagSuggestions}
        languageOptions={(facets.facetOptionsByDimension.LANGUAGE ?? []).map(
          (lang) => ({ value: lang.slug, label: lang.label }),
        )}
        onSave={(form) => {
          if (pfEditingVideo) {
            updatePortfolioMutation.mutate(
              {
                videoId: pfEditingVideo.id,
                payload: form,
                ...(adminMode && profileId ? { adminCreatorId: profileId } : {}),
              },
              { onSuccess: closePortfolioDrawer }
            );
          } else if (pfPendingVideoFile) {
            createPortfolioMutation.mutate(
              {
                videoFile: pfPendingVideoFile,
                thumbnailFile: pfPendingThumbFile,
                visibility: form.visibilityStatus ?? "public",
                metadataPatch: form,
                ...(adminMode && profileId ? { adminCreatorId: profileId } : {}),
              },
              { onSuccess: closePortfolioDrawer }
            );
          } else {
            toast.error("Please select a video file first.");
          }
        }}
        onDelete={(video) => {
          deletePortfolioMutation.mutate({ videoId: video.id });
          closePortfolioDrawer();
        }}
        isSaving={
          createPortfolioMutation.isPending || updatePortfolioMutation.isPending
        }
      />
    );
  }
}
