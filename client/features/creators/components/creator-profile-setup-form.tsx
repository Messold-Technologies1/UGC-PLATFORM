"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SuggestionChips } from "@/components/ui/suggestion-chips";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { ensureWorkspaceSelection } from "@/features/auth/lib/ensure-workspace-selection";
import { creatorProfileMeQueryKey } from "@/features/creators/api/fetch-creator-profile-me";
import { CreatorProfileImageField } from "@/features/creators/components/creator-profile-image-field";
import {
  CreatorProfilePackageFields,
  type PackageDraft,
} from "@/features/creators/components/creator-profile-package-fields";
import { getInitials } from "@/lib/account-user";
import {
  splitCommaSeparatedList,
  splitMultilineList,
  toggleCommaSeparatedItem,
} from "@/lib/string-lists";
import { useAuth } from "@/providers/auth-provider";
import {
  createCreatorProfile,
  type CreateCreatorProfilePayload,
} from "@/features/creators/api/create-creator-profile";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import {
  updateCreatorProfile,
  type UpdateCreatorProfilePayload,
} from "@/features/creators/api/update-creator-profile";
import {
  creatorSuggestionListsQueryKeys,
  fetchCreatorPersonaTagSuggestions,
  fetchCreatorRestrictionSuggestions,
} from "@/features/creators/api/creator-suggestion-lists";
import {
  presignCreatorProfileImageUpload,
  putFileToPresignedUrl,
} from "@/features/creators/api/presign-creator-profile-image";

const MAX_PACKAGES_IN_CREATOR_SETUP_FORM = 3;

const MAX_PROFILE_IMAGE_BYTES = 8 * 1024 * 1024;
const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const GENDER_VALUE_UNSPECIFIED = "__unspecified__";

function createPackageDraft(
  id: string,
  overrides?: Partial<Omit<PackageDraft, "id">>,
): PackageDraft {
  return {
    id,
    name: overrides?.name ?? "",
    priceAmount: overrides?.priceAmount ?? "",
    deliveryDays: overrides?.deliveryDays ?? "",
    deliverables: overrides?.deliverables ?? "",
  };
}

function isCompletedPackageDraft(row: PackageDraft): boolean {
  const name = row.name.trim();
  const price = row.priceAmount.trim();
  const days = Number.parseInt(row.deliveryDays, 10);
  return !!name && !!price && !Number.isNaN(days) && days >= 0;
}

export type CreatorProfileSetupFormProps = {
  variant: "onboarding" | "settings";
  mode: "create" | "update";

  profileId?: string;
  initialProfile?: CreatorProfileItemApi | null;
  onSuccess: () => void;
};

export function CreatorProfileSetupForm({
  variant,
  mode,
  profileId,
  initialProfile,
  onSuccess,
}: CreatorProfileSetupFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const personaTagSuggestionsQuery = useQuery({
    queryKey: creatorSuggestionListsQueryKeys.personaTags,
    queryFn: fetchCreatorPersonaTagSuggestions,
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });

  const restrictionSuggestionsQuery = useQuery({
    queryKey: creatorSuggestionListsQueryKeys.restrictions,
    queryFn: fetchCreatorRestrictionSuggestions,
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });
  const [pending, setPending] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [travelRadius, setTravelRadius] = useState("");
  const [languages, setLanguages] = useState("");

  const [categoriesInput, setCategoriesInput] = useState("");
  const [personaTagsInput, setPersonaTagsInput] = useState("");
  const [restrictionsInput, setRestrictionsInput] = useState("");
  const selectedPersonaTags = useMemo(
    () => splitCommaSeparatedList(personaTagsInput),
    [personaTagsInput],
  );
  const selectedRestrictions = useMemo(
    () => splitCommaSeparatedList(restrictionsInput),
    [restrictionsInput],
  );
  const [onLocationAvailable, setOnLocationAvailable] = useState(false);
  const [onLocationFee, setOnLocationFee] = useState("");

  const nextPackageIdRef = useRef(1);
  const [packageDrafts, setPackageDrafts] = useState<PackageDraft[]>(() => [
    createPackageDraft("pkg-0", { name: "Starter", deliveryDays: "3" }),
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [pendingProfileImageKey, setPendingProfileImageKey] = useState<
    string | null
  >(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const updatePackageDraft = useCallback(
    (id: string, patch: Partial<Omit<PackageDraft, "id">>) => {
      setPackageDrafts((rows) =>
        rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const addPackageDraft = useCallback(() => {
    setPackageDrafts((rows) => {
      if (rows.length >= MAX_PACKAGES_IN_CREATOR_SETUP_FORM) return rows;
      const nextNum = rows.length + 1;
      const defaultNames = ["Starter", "Standard", "Pro"] as const;
      const name = defaultNames[nextNum - 1] ?? `Package ${nextNum}`;
      const deliveryDays = nextNum === 1 ? "3" : "5";
      const id = `pkg-${nextPackageIdRef.current++}`;
      return [...rows, createPackageDraft(id, { name, deliveryDays })];
    });
  }, []);

  const removePackageDraft = useCallback((id: string) => {
    setPackageDrafts((rows) => rows.filter((row) => row.id !== id));
  }, []);

  useEffect(() => {
    if (mode === "update" && initialProfile) {
      const url = initialProfile.profileImageUrl?.trim();
      setImagePreviewUrl(
        url && (url.startsWith("http://") || url.startsWith("https://"))
          ? url
          : null,
      );
      setPendingProfileImageKey(null);
      setDisplayName(initialProfile.displayName);
      setCity(initialProfile.city?.trim() ?? "");
      setBio(initialProfile.bio?.trim() ?? "");
      setGender(initialProfile.gender?.trim() ?? "");
      setTravelRadius(
        initialProfile.travelRadius != null
          ? String(initialProfile.travelRadius)
          : "",
      );
      setLanguages(initialProfile.languages.map((l) => l.language).join(", "));
      setCategoriesInput(
        initialProfile.categories.map((c) => c.category).join(", "),
      );
      setPersonaTagsInput(
        (initialProfile.personaTags ?? []).map((t) => t.tag).join(", "),
      );
      setRestrictionsInput(
        (initialProfile.restrictions ?? [])
          .map((r) => r.restriction)
          .join(", "),
      );
      setOnLocationAvailable(initialProfile.onLocationAvailable ?? false);
      setOnLocationFee(
        initialProfile.onLocationFee != null &&
          String(initialProfile.onLocationFee).trim() !== ""
          ? String(initialProfile.onLocationFee)
          : "",
      );
      if (initialProfile.packages.length > 0) {
        nextPackageIdRef.current = initialProfile.packages.length;
        setPackageDrafts(
          initialProfile.packages.map((p) => ({
            id: p.id,
            name: p.name,
            priceAmount: p.priceAmount,
            deliveryDays: String(p.deliveryDays),
            deliverables: p.deliverables.join("\n"),
          })),
        );
      } else {
        setPackageDrafts([
          createPackageDraft("pkg-0", { name: "Starter", deliveryDays: "3" }),
        ]);
        nextPackageIdRef.current = 1;
      }
      return;
    }
    if (!user) return;
    setImagePreviewUrl(null);
    setPendingProfileImageKey(null);
    setCategoriesInput("");
    setPersonaTagsInput("");
    setRestrictionsInput("");
    setOnLocationAvailable(false);
    setOnLocationFee("");
    const name = user.name?.trim() || user.email.split("@")[0] || "";
    setDisplayName(name);
  }, [user, mode, initialProfile]);

  const displayInitials = useCallback(() => {
    const base =
      displayName.trim() ||
      user?.name?.trim() ||
      user?.email?.split("@")[0] ||
      "?";
    return getInitials(base);
  }, [displayName, user]);

  const ensureCreatorWorkspace = useCallback(
    () => ensureWorkspaceSelection(queryClient, user, "CREATOR"),
    [queryClient, user],
  );

  const handleProfileImageSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const ok = await ensureCreatorWorkspace();
      if (!ok) return;
      if (!PROFILE_IMAGE_ACCEPT.split(",").includes(file.type)) {
        toast.error("Use JPEG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_PROFILE_IMAGE_BYTES) {
        toast.error("Image must be 8 MB or smaller.");
        return;
      }
      setUploadingImage(true);
      try {
        const presign = await presignCreatorProfileImageUpload({
          contentType: file.type,
          contentLength: file.size,
        });
        await putFileToPresignedUrl(file, presign);
        setPendingProfileImageKey(presign.key);
        setImagePreviewUrl(presign.cdnUrl);
        toast.success("Photo uploaded — save your profile to apply.");
      } catch {
        toast.error("Could not upload image. Try again.");
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [ensureCreatorWorkspace],
  );

  const clearProfileImage = useCallback(() => {
    setPendingProfileImageKey(null);
    if (mode === "update" && initialProfile?.profileImageUrl?.trim()) {
      const u = initialProfile.profileImageUrl.trim();
      setImagePreviewUrl(
        u.startsWith("http://") || u.startsWith("https://") ? u : null,
      );
    } else {
      setImagePreviewUrl(null);
    }
  }, [mode, initialProfile]);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const name = displayName.trim();
      if (!name) {
        toast.error("Display name is required");
        return;
      }
      if (mode === "update" && !profileId) {
        toast.error("Missing profile id");
        return;
      }

      const radiusRaw = travelRadius.trim();
      const radius =
        radiusRaw === "" ? undefined : Number.parseInt(radiusRaw, 10);

      const langs = splitCommaSeparatedList(languages);
      const cats = splitCommaSeparatedList(categoriesInput);
      const personas = splitCommaSeparatedList(personaTagsInput);
      const rests = splitCommaSeparatedList(restrictionsInput);

      const builtPackages: NonNullable<
        CreateCreatorProfilePayload["packages"]
      > = [];

      for (const row of packageDrafts) {
        const pkgName = row.name.trim();
        const price = row.priceAmount.trim();
        const dels = splitMultilineList(row.deliverables);
        const rowDays = Number.parseInt(row.deliveryDays, 10);
        const hasDeliveryInput = row.deliveryDays.trim() !== "";
        const touched =
          !!pkgName || !!price || !!row.deliverables.trim() || hasDeliveryInput;
        const daysOk = !Number.isNaN(rowDays) && rowDays >= 0;
        const isComplete = !!pkgName && !!price && daysOk;

        if (touched && !isComplete) {
          toast.error(
            "Complete each package (name, price, delivery days) or clear unused rows.",
          );
          return;
        }

        if (isComplete) {
          builtPackages.push({
            name: pkgName,
            deliverables: dels.length ? dels : ["Deliverables to be confirmed"],
            priceAmount: price,
            deliveryDays: rowDays,
          });
        }
      }

      const packages: CreateCreatorProfilePayload["packages"] =
        builtPackages.length > 0 ? builtPackages : undefined;

      const createPayload: CreateCreatorProfilePayload = {
        displayName: name,
        ...(pendingProfileImageKey
          ? { profileImageKey: pendingProfileImageKey }
          : {}),
        city: city.trim() || undefined,
        bio: bio.trim() || undefined,
        gender: gender.trim() || undefined,
        travelRadius:
          radius !== undefined && !Number.isNaN(radius) && radius >= 0
            ? radius
            : undefined,
        languages: langs.length ? langs : undefined,
        categories: cats.length ? cats : undefined,
        personaTags: personas.length ? personas : undefined,
        restrictions: rests.length ? rests : undefined,
        onLocationAvailable,
        ...(onLocationAvailable && onLocationFee.trim()
          ? { onLocationFee: onLocationFee.trim() }
          : {}),
        packages,
      };

      setPending(true);
      try {
        if (mode === "update") {
          if (!profileId) {
            toast.error("Missing profile id");
            return;
          }
          const patchPayload: UpdateCreatorProfilePayload = {
            displayName: name,
            ...(pendingProfileImageKey
              ? { profileImageKey: pendingProfileImageKey }
              : {}),
            city: city.trim() || undefined,
            bio: bio.trim() || undefined,
            gender: gender.trim() || undefined,
            travelRadius:
              radius !== undefined && !Number.isNaN(radius) && radius >= 0
                ? radius
                : undefined,
            onLocationAvailable,
            ...(onLocationAvailable && onLocationFee.trim()
              ? { onLocationFee: onLocationFee.trim() }
              : {}),
            languages: langs,
            categories: cats,
            personaTags: personas,
            restrictions: rests,
            packages: builtPackages,
          };
          await updateCreatorProfile(profileId, patchPayload);
          await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
          await queryClient.invalidateQueries({
            queryKey: creatorProfileMeQueryKey,
          });
          toast.success("Profile updated");
          onSuccess();
          return;
        }

        const ok = await ensureCreatorWorkspace();
        if (!ok) return;
        await createCreatorProfile(createPayload);
        await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
        toast.success("Creator profile created");
        onSuccess();
        router.replace("/creator/account");
      } catch (err) {
        if (
          mode === "create" &&
          isAxiosError(err) &&
          err.response?.status === 409
        ) {
          toast.message("Profile already exists", {
            description: "Continuing to your dashboard.",
          });
          const ok = await ensureCreatorWorkspace();
          if (!ok) return;
          await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
          onSuccess();
          router.replace("/creator/account");
          return;
        }
        toast.error(
          mode === "update"
            ? "Could not update profile"
            : "Could not create profile",
          {
            description: "Check your connection and try again.",
          },
        );
      } finally {
        setPending(false);
      }
    },
    [
      mode,
      profileId,
      displayName,
      city,
      bio,
      gender,
      travelRadius,
      languages,
      categoriesInput,
      personaTagsInput,
      restrictionsInput,
      onLocationAvailable,
      onLocationFee,
      packageDrafts,
      onSuccess,
      queryClient,
      pendingProfileImageKey,
      ensureCreatorWorkspace,
      router,
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

  const completionSummary = useMemo(() => {
    const checkpoints = [
      Boolean(imagePreviewUrl || pendingProfileImageKey),
      Boolean(displayName.trim()),
      Boolean(city.trim()),
      Boolean(bio.trim()),
      splitCommaSeparatedList(languages).length > 0,
      splitCommaSeparatedList(categoriesInput).length > 0,
      packageDrafts.some(isCompletedPackageDraft),
    ];
    const completed = checkpoints.filter(Boolean).length;
    const total = checkpoints.length;
    const percent = Math.round((completed / total) * 100);
    return { completed, total, percent };
  }, [
    imagePreviewUrl,
    pendingProfileImageKey,
    displayName,
    city,
    bio,
    languages,
    categoriesInput,
    packageDrafts,
  ]);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={shellClass}>
      <div className="mb-6 space-y-2">
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
      </div>

      <CreatorProfileImageField
        imagePreviewUrl={imagePreviewUrl}
        initials={displayInitials()}
        accept={PROFILE_IMAGE_ACCEPT}
        disabled={uploadingImage || pending}
        uploading={uploadingImage}
        hasPendingImage={Boolean(pendingProfileImageKey)}
        fileInputRef={fileInputRef}
        onSelectFile={(file) => void handleProfileImageSelected(file)}
        onDiscard={clearProfileImage}
      />

      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Bengaluru"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={gender === "" ? GENDER_VALUE_UNSPECIFIED : gender}
              onValueChange={(v) =>
                setGender(v === GENDER_VALUE_UNSPECIFIED ? "" : v)
              }
            >
              <SelectTrigger id="gender" aria-label="Gender">
                <SelectValue placeholder="Prefer not to say" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GENDER_VALUE_UNSPECIFIED}>
                  Prefer not to say
                </SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Non-binary">Non-binary</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="What do you create? Who do you love working with?"
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 dark:bg-input/30"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="travelRadius">Travel radius (km)</Label>
            <Input
              id="travelRadius"
              type="number"
              min={0}
              className={inputClass}
              value={travelRadius}
              onChange={(e) => setTravelRadius(e.target.value)}
              placeholder="0 if none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="languages">Languages</Label>
            <Input
              id="languages"
              className={inputClass}
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="Comma-separated, e.g. English, Hindi"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="categories">Categories (niches)</Label>
          <Input
            id="categories"
            className={inputClass}
            value={categoriesInput}
            onChange={(e) => setCategoriesInput(e.target.value)}
            placeholder="Comma-separated, e.g. UGC Video, Voice Over"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="personaTags">Persona tags</Label>
          <Input
            id="personaTags"
            className={inputClass}
            value={personaTagsInput}
            onChange={(e) => setPersonaTagsInput(e.target.value)}
            placeholder="Comma-separated, e.g. Friendly, Clean aesthetic"
          />
          {personaTagSuggestionsQuery.isSuccess &&
          personaTagSuggestionsQuery.data.length > 0 ? (
            <SuggestionChips
              items={personaTagSuggestionsQuery.data.map((suggestion) => ({
                key: suggestion.id,
                label: suggestion.name,
                ariaLabel: `Add ${suggestion.name} to persona tags`,
              }))}
              selectedLabels={selectedPersonaTags}
              onSelect={(name) =>
                setPersonaTagsInput((prev) =>
                  toggleCommaSeparatedItem(prev, name),
                )
              }
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="restrictions">Content restrictions</Label>
          <Input
            id="restrictions"
            className={inputClass}
            value={restrictionsInput}
            onChange={(e) => setRestrictionsInput(e.target.value)}
            placeholder="Comma-separated, e.g. does not accept alcohol"
          />
          {restrictionSuggestionsQuery.isSuccess &&
          restrictionSuggestionsQuery.data.length > 0 ? (
            <SuggestionChips
              items={restrictionSuggestionsQuery.data.map((suggestion) => ({
                key: suggestion.id,
                label: suggestion.name,
                ariaLabel: `Add ${suggestion.name} to content restrictions`,
              }))}
              selectedLabels={selectedRestrictions}
              onSelect={(name) =>
                setRestrictionsInput((prev) =>
                  toggleCommaSeparatedItem(prev, name),
                )
              }
            />
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
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
              checked={onLocationAvailable}
              onCheckedChange={setOnLocationAvailable}
            />
          </div>

          {onLocationAvailable ? (
            <div className="space-y-2">
              <Label htmlFor="onLocationFee">On-location fee</Label>
              <Input
                id="onLocationFee"
                className={inputClass}
                value={onLocationFee}
                onChange={(e) => setOnLocationFee(e.target.value)}
                placeholder="499.00"
                inputMode="decimal"
              />
            </div>
          ) : null}
        </div>

        <CreatorProfilePackageFields
          rows={packageDrafts}
          inputClassName={inputClass}
          maxPackages={MAX_PACKAGES_IN_CREATOR_SETUP_FORM}
          onAdd={addPackageDraft}
          onRemove={removePackageDraft}
          onChange={updatePackageDraft}
        />
      </div>

      <Button
        type="submit"
        className="mt-8 w-full sm:w-auto"
        disabled={pending}
      >
        {pending
          ? mode === "update"
            ? "Saving…"
            : "Creating…"
          : mode === "update"
            ? "Save changes"
            : "Create profile"}
      </Button>
    </form>
  );
}
