"use client";
import "./profile-edit.css";
import { SectionCard, PeSelectField, CatalogStatus } from "./shared-components";
import { FacetChipSection, LanguageRows } from "./facet-components";
import { PackageEditor, AddOnCatalogEditor } from "./package-and-addon-editors";
import { PackageEarningsBanner } from "./package-earnings-banner";
import { PortfolioGrid, PortfolioEditDrawer } from "./portfolio-components";

import { motion, type Variants } from "framer-motion";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  CalendarIcon,
  Camera,
  Check,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const PROFILE_OTP_VERIFICATION_ENABLED = false;
import { useAuth, type AuthUser } from "@/providers/auth-provider";
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
  { id: "media", label: "Photo & reel", icon: Camera },
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
  tiktokUrl: z.string().trim(),
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
  const addOns = useCreatorAddOnsForm({
    initialProfile,
    enabled: Boolean(user),
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
  const languageSuggestionsQuery = usePortfolioLanguageSuggestionsQuery({
    enabled: Boolean(user),
  });
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
  const markDirty = useCallback(() => setIsDirty(true), []);

  const contactEmailDisplay = adminMode
    ? (initialProfile?.contactEmail?.trim() ?? "")
    : (user?.email ?? "");

  const submitCreatorProfileMutation = useSubmitCreatorProfileMutation({
    mode,
    profileId,
    adminMode,
    onSuccess: async () => {
      setIsDirty(false);
      await onSuccess();
    },
  });

  const pending = submitCreatorProfileMutation.isPending;
  useLayoutEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

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
  const [tiktokUrl, setTiktokUrl] = useState(
    () => initialProfile?.tiktokUrl?.trim() ?? "",
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
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [activeSection, setActiveSection] = useState(NAV_ITEMS[0].id);

  useEffect(() => {
    if (variant !== "settings") return;

    function onScroll() {
      const offset = 120;
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
  }, [variant]);

  function scrollToSection(id: string) {
    const el = document.getElementById(`pe-section-${id}`);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 76,
        behavior: "smooth",
      });
    }
  }

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

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
        tiktokUrl,
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
      const tiktok = parsedData.tiktokUrl || undefined;
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
        facets.languageDrafts
          .filter((row) => row.slug !== "")
          .map((row) => ({
            slug: row.slug,
            fluency: row.fluency,
          }));

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
        tiktokUrl: tiktok,
        snapchatUrl: snapchat,
        contentVolume: contentVolume || undefined,
        collaborationCount: parsedData.collaborationCount,
        travelRadius: radius,
        onLocationAvailable,
        facetSelections,
        profileLanguages,
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
        if (finalPayload.tiktokUrl === (initialProfile.tiktokUrl || undefined)) delete finalPayload.tiktokUrl;
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

      submitCreatorProfileMutation.mutate({ payload: finalPayload });
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
      tiktokUrl,
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
      adminMode,
      contactEmailDisplay,
      initialProfile,
      user?.email,
    ],
  );
  const handleDiscard = useCallback(() => {
    onRequestReset();
    toast.info("Changes discarded");
  }, [onRequestReset]);
  const navCounts = useMemo(() => {
    const nicheCount =
      Object.values(facets.selectedFacets).reduce(
        (acc, arr) => acc + (arr?.length ?? 0),
        0,
      ) + facets.languageDrafts.length;
    return {
      niche: nicheCount > 0 ? nicheCount : null,
      portfolio:
        (portfolioQuery.data?.length ?? 0) > 0
          ? (portfolioQuery.data?.length ?? 0)
          : null,
    };
  }, [
    facets.selectedFacets,
    facets.languageDrafts.length,
    portfolioQuery.data,
  ]);

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
    <div className={cn("pe-scope", !isSettings && "pe-onboarding")}>
      <motion.form
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onSubmit={(event) => void handleSubmit(event)}
      >
        {isSettings ? (
          <div className="pe-shell">
            <nav className="pe-nav">
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
          <div className="pe-savebar" data-visible={isDirty || pending}>
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
                {pending ? "Saving changes..." : "You have unsaved changes"}
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
                  {pending ? (
                    <>
                      <Spinner className="size-4" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save changes
                    </>
                  )}
                </button>
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
            icon={Camera}
            title="Photo & intro reel"
            desc="Your face and a short intro reel build instant trust."
          >
            <div className="pe-media-grid">
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
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

              <div className="pe-media-divider" />

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
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
                <label htmlFor="displayName">Display name</label>
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
                  <label htmlFor="contactEmail">Contact email</label>
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
                <label htmlFor="dateOfBirth">Date of birth</label>
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
                <span className="pe-opt">optional</span>
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

                <LanguageRows
                  allLanguages={facets.facetOptionsByDimension.LANGUAGE ?? []}
                  selected={facets.languageDrafts}
                  disabled={pending || facets.facetOptionsQuery.isLoading}
                  onAddLanguage={(slug) => {
                    facets.addLanguage(slug);
                    markDirty();
                  }}
                  onRemoveLanguage={(index) => {
                    facets.removeLanguage(index);
                    markDirty();
                  }}
                  onUpdateLanguageSlug={(index, slug) => {
                    facets.updateLanguageSlug(index, slug);
                    markDirty();
                  }}
                  onFluencyChange={(index, fluency) => {
                    facets.updateLanguageFluency(index, fluency);
                    markDirty();
                  }}
                />
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
                  Total brand projects you've delivered.
                </span>
              </div>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard
            id="packages"
            icon={Layers}
            title="Packages"
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
            icon={Film}
            title="Portfolio"
            desc="Manage your reels. Edit each video's tags, industry, language and visibility."
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
        industrySuggestions={industrySuggestionsQuery.data ?? []}
        tagSuggestions={tagSuggestionsQuery.data ?? []}
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
