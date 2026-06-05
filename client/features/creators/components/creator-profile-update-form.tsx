"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { toast } from "sonner";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PhoneVerificationField } from "@/features/auth/components/phone-verification-field";
import { CreatorProfileIntroVideoField } from "@/features/creators/components/creator-profile-intro-video-field";
import { useAuth, type AuthUser } from "@/providers/auth-provider";
import type {
  CreatorContentVolumeBucket,
  CreatorFacetSelectionPayload,
  CreatorGender,
  CreatorLanguageFluency,
  CreatorProfileLanguagePayload,
} from "@/features/creators/api/create-creator-profile";
import { useSubmitCreatorProfileMutation } from "@/features/creators/hooks/use-creator-profile-form-mutation";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { UpdateCreatorProfilePayload } from "@/features/creators/api/update-creator-profile";
import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";
import type { CreatorFacetOption } from "@/features/creators/api/get-creator-facet-options";

// Composable hooks
import { useCreatorLocationForm } from "@/features/creators/hooks/use-creator-location-form";
import { useCreatorIntroVideo } from "@/features/creators/hooks/use-creator-intro-video";
import { useCreatorFacetsForm } from "@/features/creators/hooks/use-creator-facets-form";
import { useCreatorPackagesForm } from "@/features/creators/hooks/use-creator-packages-form";
import { useCreatorAddOnsForm } from "@/features/creators/hooks/use-creator-add-ons-form";

import {
  INTRO_VIDEO_ACCEPT,
  SELECT_NONE,
  PACKAGE_DELIVERY_DAYS,
  facetSections,
  genderOptions,
  contentVolumeOptions,
  fluencyOptions,
  normalizeWholeNumberInput,
  normalizeOptionalUrl,
  getInitialCreatorName,
  type LanguageDraft,
  type PackageDraft,
  type AddOnDraft,
} from "@/features/creators/hooks/creator-profile-form-utils";

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
  const formKey = `update:${initialProfile?.id ?? profileId ?? "profile"}`;

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
}: CreatorProfileUpdateFormContentProps) {
  const { refreshUser } = useAuth();

  const location = useCreatorLocationForm({ initialProfile, adminMode });
  const introVideo = useCreatorIntroVideo({ mode, profileId, initialProfile });
  const facets = useCreatorFacetsForm({
    initialProfile,
    enabled: Boolean(user),
  });
  const packages = useCreatorPackagesForm({ initialProfile });
  const addOns = useCreatorAddOnsForm({
    initialProfile,
    enabled: Boolean(user),
  });

  const submitCreatorProfileMutation = useSubmitCreatorProfileMutation({
    mode,
    profileId,
    adminMode,
    onSuccess,
  });

  const pending = submitCreatorProfileMutation.isPending;
  useLayoutEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

  const [phoneVerified, setPhoneVerified] = useState(adminMode ? true : false);
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

  const completionSummary = useMemo(() => {
    const checkpoints = [
      Boolean(
        introVideo.introVideoPreviewUrl || introVideo.pendingIntroVideoKey,
      ),
      phoneVerified,
      Boolean(displayName.trim()),
      Boolean(location.countryName && location.city.trim()),
      Boolean(dateOfBirth),
      Boolean(gender),
      facets.languageDrafts.length > 0,
      facets.selectedFacetCount > 0,
      Boolean(packages.packageDraft.priceAmount.trim()),
    ];
    const completed = checkpoints.filter(Boolean).length;
    const total = checkpoints.length;
    return { completed, total, percent: Math.round((completed / total) * 100) };
  }, [
    location.city,
    location.countryName,
    dateOfBirth,
    displayName,
    gender,
    introVideo.introVideoPreviewUrl,
    facets.languageDrafts.length,
    packages.packageDraft.priceAmount,
    introVideo.pendingIntroVideoKey,
    phoneVerified,
    facets.selectedFacetCount,
  ]);

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
      if (!phoneVerified) {
        toast.error("Verify your mobile number before saving your profile.");
        return;
      }

      const name = displayName.trim();
      if (!name) {
        toast.error("Display name is required");
        return;
      }
      if (mode === "update" && !profileId) {
        toast.error("Missing profile id");
        return;
      }

      const instagram = normalizeOptionalUrl(instagramUrl);
      if (instagramUrl.trim() && !instagram) {
        toast.error("Instagram URL must be a valid http(s) URL.");
        return;
      }

      const youtube = normalizeOptionalUrl(youtubeUrl);
      if (youtubeUrl.trim() && !youtube) {
        toast.error("YouTube URL must be a valid http(s) URL.");
        return;
      }

      const tiktok = normalizeOptionalUrl(tiktokUrl);
      if (tiktokUrl.trim() && !tiktok) {
        toast.error("TikTok URL must be a valid http(s) URL.");
        return;
      }

      const snapchat = normalizeOptionalUrl(snapchatUrl);
      if (snapchatUrl.trim() && !snapchat) {
        toast.error("Snapchat URL must be a valid http(s) URL.");
        return;
      }

      const collaborationCountNumber = Number(collaborationCount || "0");
      if (
        !Number.isInteger(collaborationCountNumber) ||
        collaborationCountNumber < 0
      ) {
        toast.error("Collaboration count must be zero or more.");
        return;
      }

      const radiusRaw = travelRadius.trim();
      const radius =
        radiusRaw === "" ? undefined : Number.parseInt(radiusRaw, 10);
      if (radius !== undefined && (Number.isNaN(radius) || radius < 0)) {
        toast.error("Travel radius must be zero or more.");
        return;
      }

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
        facets.languageDrafts.map((row) => ({
          slug: row.slug,
          fluency: row.fluency,
        }));

      const payload: UpdateCreatorProfilePayload = {
        displayName: name,
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
        collaborationCount: collaborationCountNumber,
        travelRadius: radius,
        onLocationAvailable,
        facetSelections,
        profileLanguages,
        packages: builtPackages,
        addOns: builtAddOns,
      };

      submitCreatorProfileMutation.mutate({ payload });
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
      introVideo,
      location,
      mode,
      onLocationAvailable,
      packages,
      phoneInput,
      phoneVerified,
      profileId,
      shippingAddress,
      submitCreatorProfileMutation,
      travelRadius,
      adminMode,
    ],
  );

  const inputClass = "h-9 text-sm";
  const shellClass =
    variant === "onboarding"
      ? "flex flex-col bg-transparent p-0"
      : "flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8";
  const heading =
    mode === "update"
      ? "Edit your creator profile"
      : "Set up your creator profile";
  const subheading =
    variant === "settings"
      ? "Changes apply to how brands see you in search and on your public profile."
      : "Brands see this in search. You can edit everything later in settings.";

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
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

  return (
    <motion.form
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onSubmit={(event) => void handleSubmit(event)}
      className={shellClass}
    >
      <motion.div variants={itemVariants} className="mb-6 space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {heading}
        </h2>
        <p className="text-sm text-muted-foreground">{subheading}</p>
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Profile completion
              </p>
              <p className="text-xs text-muted-foreground">
                {completionSummary.completed} of {completionSummary.total} core
                sections added
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {completionSummary.percent}%
            </p>
          </div>
          <Progress
            value={completionSummary.percent}
            aria-label="Creator profile completion"
            className="mt-3 h-1"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <CreatorProfileIntroVideoField
          videoPreviewUrl={introVideo.introVideoPreviewUrl}
          accept={INTRO_VIDEO_ACCEPT}
          disabled={introVideo.uploadingIntroVideo || pending}
          uploading={introVideo.uploadingIntroVideo}
          hasPendingVideo={
            Boolean(introVideo.pendingIntroVideoKey) ||
            introVideo.introVideoRemoved
          }
          hasExistingVideo={Boolean(introVideo.introVideoPreviewUrl)}
          pendingActionLabel={
            introVideo.introVideoRemoved ? "Undo remove" : undefined
          }
          fileInputRef={introVideo.introVideoInputRef}
          onSelectFile={(file) =>
            void introVideo.handleIntroVideoSelected(file)
          }
          onDiscard={introVideo.restoreInitialIntroVideo}
          onRemove={introVideo.removeIntroVideo}
        />
      </motion.div>

      <div className="flex flex-col gap-6">
        {adminMode ? (
          <motion.section
            variants={itemVariants}
            className="space-y-4 rounded-xl border border-border bg-muted/20 p-4"
          >
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <div className="flex items-stretch h-[42px] rounded-xl border border-input bg-background overflow-hidden w-full transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20">
                <div className="flex h-full items-center justify-center bg-muted px-4 border-r border-input text-[15px] font-semibold text-muted-foreground">
                  +91
                </div>
                <Input
                  id="phone"
                  className="flex-1 h-full border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-[15px] font-medium"
                  disabled={pending}
                  value={phoneInput}
                  onChange={(event) =>
                    setPhoneInput(event.target.value.replace(/\D/g, ""))
                  }
                  required
                />
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section
            variants={itemVariants}
            className="space-y-4 rounded-xl border border-border bg-muted/20 p-4"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                Account verification
              </p>
              <p className="text-xs text-muted-foreground">
                Required before creator profile changes can be saved.
              </p>
            </div>
            <PhoneVerificationField
              idPrefix="creator-profile"
              disabled={pending}
              onVerifiedChange={setPhoneVerified}
              onVerified={() => void refreshUser()}
            />
          </motion.section>
        )}

        <motion.section variants={itemVariants} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              className={inputClass}
              disabled={pending}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {adminMode ? (
              <div className="space-y-1">
                <Label
                  htmlFor="country"
                  className="mb-[6px] block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Country
                </Label>
                <Input
                  id="country"
                  value="India"
                  readOnly
                  className="h-9 border-input bg-muted opacity-70 cursor-not-allowed text-muted-foreground"
                />
              </div>
            ) : (
              <SelectField
                id="country"
                label="Country"
                value={location.countryCode}
                placeholder="Select country"
                disabled={pending}
                options={location.countries.map((country) => ({
                  value: country.isoCode,
                  label: country.name,
                }))}
                onChange={(value) => {
                  location.setCountryCode(value);
                  location.setStateCode("");
                  location.setCity("");
                }}
              />
            )}
            <SelectField
              id="state"
              label="State"
              value={location.stateCode}
              placeholder={
                location.countryCode ? "Select state" : "Select country first"
              }
              disabled={
                pending || !location.countryCode || location.states.length === 0
              }
              options={location.states.map((state) => ({
                value: state.isoCode,
                label: state.name,
              }))}
              onChange={(value) => {
                location.setStateCode(value);
                location.setCity("");
              }}
            />
            <SelectField
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
              onChange={location.setCity}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="gender"
              label="Gender"
              value={gender}
              placeholder="Select gender"
              disabled={pending}
              options={genderOptions}
              onChange={(value) => setGender(value as CreatorGender)}
              allowClear
            />
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <div className="relative">
                <Input
                  id="dateOfBirth"
                  type="date"
                  className={cn(
                    inputClass,
                    "w-full appearance-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
                  )}
                  disabled={pending}
                  value={dateOfBirth}
                  max={new Date().toISOString().split("T")[0]}
                  onClick={(e) => {
                    try {
                      if ("showPicker" in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker();
                      }
                    } catch (err) {
                      // ignore
                    }
                  }}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                />
                <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              disabled={pending}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
              maxLength={200}
              placeholder="What do you create? Who do you love working with?"
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingAddress">Shipping address</Label>
            <Textarea
              id="shippingAddress"
              disabled={pending}
              value={shippingAddress}
              onChange={(event) => setShippingAddress(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Address for receiving products"
              className="resize-y"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagramUrl">Instagram URL</Label>
              <Input
                id="instagramUrl"
                className={inputClass}
                disabled={pending}
                value={instagramUrl}
                onChange={(event) => setInstagramUrl(event.target.value)}
                placeholder="https://instagram.com/you"
                inputMode="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input
                id="youtubeUrl"
                className={inputClass}
                disabled={pending}
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://youtube.com/@you"
                inputMode="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktokUrl">TikTok URL</Label>
              <Input
                id="tiktokUrl"
                className={inputClass}
                disabled={pending}
                value={tiktokUrl}
                onChange={(event) => setTiktokUrl(event.target.value)}
                placeholder="https://tiktok.com/@you"
                inputMode="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snapchatUrl">Snapchat URL</Label>
              <Input
                id="snapchatUrl"
                className={inputClass}
                disabled={pending}
                value={snapchatUrl}
                onChange={(event) => setSnapchatUrl(event.target.value)}
                placeholder="https://snapchat.com/add/you"
                inputMode="url"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="contentVolume"
              label="Content volume"
              value={contentVolume}
              placeholder="Select volume"
              disabled={pending}
              options={contentVolumeOptions}
              onChange={(value) =>
                setContentVolume(value as CreatorContentVolumeBucket)
              }
              allowClear
            />
            <div className="space-y-2">
              <Label htmlFor="collaborationCount">Collab count</Label>
              <Input
                id="collaborationCount"
                className={inputClass}
                disabled={pending}
                value={collaborationCount}
                inputMode="numeric"
                onChange={(event) =>
                  setCollaborationCount(
                    normalizeWholeNumberInput(event.target.value),
                  )
                }
              />
            </div>
          </div>
        </motion.section>

        <motion.section
          variants={itemVariants}
          className="space-y-4 rounded-xl border border-border bg-muted/20 p-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="onLocation" className="text-sm font-medium">
                On-location / store shoots
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable if you offer on-location or in-store shoots.
              </p>
            </div>
            <Switch
              id="onLocation"
              disabled={pending}
              checked={onLocationAvailable}
              onCheckedChange={setOnLocationAvailable}
            />
          </div>

          {onLocationAvailable ? (
            <div className="max-w-sm space-y-2">
              <Label htmlFor="travelRadius">Travel radius (km)</Label>
              <Input
                id="travelRadius"
                type="number"
                min={0}
                className={inputClass}
                disabled={pending}
                value={travelRadius}
                onChange={(event) => setTravelRadius(event.target.value)}
                placeholder="0 if none"
              />
            </div>
          ) : null}
        </motion.section>

        <motion.div variants={itemVariants}>
          <CatalogStatus
            loading={facets.facetOptionsQuery.isLoading}
            error={facets.facetOptionsQuery.isError}
            label="creator profile options"
            onRetry={() => void facets.facetOptionsQuery.refetch()}
          />
        </motion.div>

        {!facets.facetOptionsQuery.isLoading &&
        !facets.facetOptionsQuery.isError ? (
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex flex-col gap-3">
              {facetSections.map((section) => {
                const options =
                  facets.facetOptionsByDimension[section.dimension] ?? [];
                const selected = facets.selectedFacets[section.dimension] ?? [];
                return (
                  <FacetSectionDropdown
                    key={section.dimension}
                    dimension={section.dimension}
                    label={section.label}
                    options={options}
                    selected={selected}
                    disabled={pending}
                    onToggle={(slug) =>
                      facets.toggleFacet(section.dimension, slug)
                    }
                  />
                );
              })}
            </div>
            <LanguageDropdown
              options={facets.facetOptionsByDimension.LANGUAGE ?? []}
              selected={facets.languageDrafts}
              disabled={pending}
              onToggle={facets.toggleLanguage}
              onFluencyChange={facets.updateLanguageFluency}
            />
          </motion.section>
        ) : null}

        <motion.div variants={itemVariants}>
          <PackageEditor
            draft={packages.packageDraft}
            disabled={pending}
            onChange={packages.setPackageDraft}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <CatalogStatus
            loading={addOns.addOnOptionsQuery.isLoading}
            error={addOns.addOnOptionsQuery.isError}
            label="add-on options"
            onRetry={() => void addOns.addOnOptionsQuery.refetch()}
          />
        </motion.div>

        {!addOns.addOnOptionsQuery.isLoading &&
        !addOns.addOnOptionsQuery.isError ? (
          <motion.div variants={itemVariants}>
            <AddOnCatalogEditor
              options={addOns.addOnOptions}
              selectedSlugs={addOns.selectedAddOnSlugs}
              drafts={addOns.addOnDrafts}
              unmatchedNames={addOns.hydratedAddOns.unmatchedNames}
              disabled={pending}
              onToggle={addOns.toggleAddOn}
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
              }}
            />
          </motion.div>
        ) : null}
      </div>

      <motion.div variants={itemVariants} className="flex justify-end">
        <Button
          type="submit"
          className="mt-8 w-full sm:w-auto"
          disabled={
            pending ||
            introVideo.uploadingIntroVideo ||
            facets.facetOptionsQuery.isLoading ||
            addOns.addOnOptionsQuery.isLoading
          }
        >
          {pending ? (
            variant === "onboarding" ? (
              mode === "update" ? (
                "Saving..."
              ) : (
                "Creating..."
              )
            ) : (
              <>
                <Spinner className="size-4" aria-hidden />
                {mode === "update" ? "Saving..." : "Creating..."}
              </>
            )
          ) : mode === "update" ? (
            "Save changes"
          ) : (
            "Create profile"
          )}
        </Button>
      </motion.div>
    </motion.form>
  );
}

function SelectField({
  id,
  label,
  value,
  placeholder,
  disabled = false,
  options,
  allowClear = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
  allowClear?: boolean;
  onChange: (value: string) => void;
}) {
  const selectValue = value || (allowClear ? SELECT_NONE : "");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        disabled={disabled}
        value={selectValue}
        onValueChange={(nextValue) =>
          onChange(nextValue === SELECT_NONE ? "" : nextValue)
        }
      >
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowClear ? (
            <SelectItem value={SELECT_NONE}>Not specified</SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CatalogStatus({
  loading,
  error,
  label,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  label: string;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <Spinner className="size-4" aria-hidden />
        Loading {label}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-destructive">Could not load {label}.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return null;
}

function FacetSectionDropdown({
  dimension,
  label,
  options,
  selected,
  disabled,
  onToggle,
}: {
  dimension: string;
  label: string;
  options: CreatorFacetOption[];
  selected: string[];
  disabled: boolean;
  onToggle: (slug: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
          "border-border/70 bg-muted/15 text-foreground hover:bg-accent/40",
          disabled && "pointer-events-none opacity-50",
          isOpen && "border-primary/50 bg-accent/30",
        )}
      >
        <span className="font-medium">
          {label}
          {selected.length > 0 && (
            <motion.span
              key={selected.length}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-primary"
            >
              {selected.length}
            </motion.span>
          )}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={`panel-${dimension}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-lg border border-border/50 bg-popover p-3 shadow-sm">
              {options.length ? (
                <motion.div
                  className="grid gap-1.5 sm:grid-cols-2"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.025 } },
                  }}
                >
                  {options.map((option) => (
                    <motion.label
                      key={option.slug}
                      variants={{
                        hidden: { opacity: 0, y: 6 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.15 },
                        },
                      }}
                      className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/60"
                    >
                      <Checkbox
                        className="mt-0.5"
                        disabled={disabled}
                        checked={selected.includes(option.slug)}
                        onCheckedChange={() => onToggle(option.slug)}
                      />
                      <span>{option.label}</span>
                    </motion.label>
                  ))}
                </motion.div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No options configured.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LanguageDropdown({
  options,
  selected,
  disabled,
  onToggle,
  onFluencyChange,
}: {
  options: CreatorFacetOption[];
  selected: LanguageDraft[];
  disabled: boolean;
  onToggle: (slug: string) => void;
  onFluencyChange: (slug: string, fluency: CreatorLanguageFluency) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const bySlug = new Map(selected.map((row) => [row.slug, row]));

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between bg-muted/15 border-border/70 text-foreground"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          Languages {selected.length > 0 ? `(${selected.length})` : ""}
        </span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 opacity-50 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full rounded-md border border-border/70 bg-popover text-popover-foreground shadow-md max-h-[300px] overflow-y-auto p-4">
          {options.length ? (
            <div className="flex flex-col gap-3">
              {options.map((option) => {
                const draft = bySlug.get(option.slug);
                const checked = Boolean(draft);

                return (
                  <div
                    key={option.slug}
                    className="flex flex-row flex-wrap items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/40 p-3"
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        disabled={disabled}
                        checked={checked}
                        onCheckedChange={() => onToggle(option.slug)}
                      />
                      <span>{option.label}</span>
                    </label>
                    {checked ? (
                      <RadioGroup
                        disabled={disabled}
                        value={draft?.fluency ?? "FLUENT"}
                        onValueChange={(value) =>
                          onFluencyChange(
                            option.slug,
                            value as CreatorLanguageFluency,
                          )
                        }
                        className="flex flex-row flex-wrap items-center gap-4"
                      >
                        {fluencyOptions.map((item) => (
                          <label
                            key={item.value}
                            className={cn(
                              "flex items-center gap-2 text-sm cursor-pointer",
                              disabled && "opacity-50 cursor-not-allowed",
                            )}
                          >
                            <RadioGroupItem
                              value={item.value}
                              id={`${option.slug}-${item.value}`}
                              disabled={disabled}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No languages configured.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PackageEditor({
  draft,
  disabled,
  onChange,
}: {
  draft: PackageDraft;
  disabled: boolean;
  onChange: (draft: PackageDraft) => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Package</p>
        <p className="text-xs text-muted-foreground">
          One package is supported for creator profiles.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="package-name">Package Name</Label>
          <Input
            id="package-name"
            className="h-9 text-sm"
            disabled={disabled}
            value={draft.packageName}
            onChange={(event) =>
              onChange({ ...draft, packageName: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Deliverables</Label>
          <Input value="1 Video" disabled className="h-9 text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="package-video-length">Video length (sec)</Label>
          <Input
            id="package-video-length"
            className="h-9 text-sm"
            disabled={disabled}
            value={draft.videoLengthSeconds}
            inputMode="numeric"
            placeholder="Up to 60"
            onChange={(event) => {
              const val = normalizeWholeNumberInput(event.target.value);
              if (Number(val) > 60) {
                onChange({ ...draft, videoLengthSeconds: "60" });
              } else {
                onChange({ ...draft, videoLengthSeconds: val });
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="package-price">Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₹
            </span>
            <Input
              id="package-price"
              className="h-9 pl-7 text-sm"
              disabled={disabled}
              value={draft.priceAmount}
              inputMode="numeric"
              placeholder="500"
              onChange={(event) =>
                onChange({
                  ...draft,
                  priceAmount: normalizeWholeNumberInput(event.target.value),
                })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Delivery time (days)</Label>
          <Input
            value={`${PACKAGE_DELIVERY_DAYS} Days`}
            disabled
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="package-revisions">Revisions</Label>
          <Input
            id="package-revisions"
            className="h-9 text-sm"
            disabled={disabled}
            value={draft.maxRevisions}
            inputMode="numeric"
            onChange={(event) =>
              onChange({
                ...draft,
                maxRevisions: normalizeWholeNumberInput(event.target.value),
              })
            }
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Basic editing</p>
          <p className="text-xs text-muted-foreground">
            Adds Basic editing to the package deliverables.
          </p>
        </div>
        <Switch
          checked={draft.basicEditing}
          disabled={disabled}
          onCheckedChange={(basicEditing) =>
            onChange({ ...draft, basicEditing })
          }
        />
      </div>
    </section>
  );
}

function AddOnCatalogEditor({
  options,
  selectedSlugs,
  drafts,
  unmatchedNames,
  disabled,
  onToggle,
  onDraftChange,
}: {
  options: CreatorAddOnOption[];
  selectedSlugs: string[];
  drafts: Record<string, AddOnDraft>;
  unmatchedNames: string[];
  disabled: boolean;
  onToggle: (option: CreatorAddOnOption) => void;
  onDraftChange: (slug: string, patch: Partial<AddOnDraft>) => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Add-ons</p>
        <p className="text-xs text-muted-foreground">
          Optional catalog extras brands can add to your package.
        </p>
      </div>

      {unmatchedNames.length ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          These saved add-ons are no longer in the catalog and will not be
          resubmitted: {unmatchedNames.join(", ")}.
        </div>
      ) : null}

      {options.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {options.map((option) => {
            const selected = selectedSlugs.includes(option.slug);
            const draft = drafts[option.slug] ?? {
              priceAmount: String(option.fixedPrice ?? option.minPrice ?? 0),
              description: "",
            };

            return (
              <div
                key={option.slug}
                className="space-y-3 rounded-lg border border-border/80 bg-background/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      disabled={disabled}
                      checked={selected}
                      onCheckedChange={() => onToggle(option)}
                    />
                    <span className="font-medium text-foreground">
                      {option.name}
                    </span>
                  </label>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {option.fixedPrice != null
                      ? `Fixed ₹${option.fixedPrice}`
                      : `Min ₹${option.minPrice ?? 0}, step ₹${
                          option.stepPrice ?? 1
                        }`}
                  </p>
                </div>
                {selected ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`addon-price-${option.slug}`}>
                        Price
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id={`addon-price-${option.slug}`}
                          className="h-9 pl-7 text-sm"
                          disabled={disabled || option.fixedPrice != null}
                          inputMode="numeric"
                          value={draft.priceAmount}
                          onChange={(event) =>
                            onDraftChange(option.slug, {
                              priceAmount: normalizeWholeNumberInput(
                                event.target.value,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`addon-description-${option.slug}`}>
                        Description
                      </Label>
                      <Input
                        id={`addon-description-${option.slug}`}
                        className="h-9 text-sm"
                        disabled={disabled}
                        value={draft.description}
                        onChange={(event) =>
                          onDraftChange(option.slug, {
                            description: event.target.value,
                          })
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/80 bg-background/40 px-3 py-4 text-sm text-muted-foreground">
          No add-ons configured.
        </p>
      )}
    </section>
  );
}
