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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { ensureWorkspaceSelection } from "@/features/auth/lib/ensure-workspace-selection";
import { creatorProfileMeQueryKey } from "@/features/creators/api/fetch-creator-profile-me";
import { CreatorProfileImageField } from "@/features/creators/components/creator-profile-image-field";
import {
  CreatorProfileAddOnFields,
  type AddOnDraft,
} from "@/features/creators/components/creator-profile-add-on-fields";
import {
  CreatorProfilePackageFields,
  type PackageDraft,
} from "@/features/creators/components/creator-profile-package-fields";
import { getInitials } from "@/lib/account-user";
import {
  appendUniqueCommaSeparatedItem,
  splitCommaSeparatedList,
  splitMultilineList,
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
const MAX_ADD_ONS_IN_CREATOR_SETUP_FORM = 6;

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
    maxRevisions: overrides?.maxRevisions ?? "2",
  };
}

function isCompletedPackageDraft(row: PackageDraft): boolean {
  const name = row.name.trim();
  const price = row.priceAmount.trim();
  const days = Number.parseInt(row.deliveryDays, 10);
  const revisions = Number.parseInt(row.maxRevisions, 10);
  return !!name && !!price && !Number.isNaN(days) && days >= 0 && !Number.isNaN(revisions) && revisions >= 0;
}

function createAddOnDraft(
  id: string,
  overrides?: Partial<Omit<AddOnDraft, "id">>,
): AddOnDraft {
  return {
    id,
    name: overrides?.name ?? "",
    priceAmount: overrides?.priceAmount ?? "",
    description: overrides?.description ?? "",
    existingName: overrides?.existingName ?? null,
  };
}

function removeCommaSeparatedItem(current: string, item: string): string {
  const target = item.trim().toLowerCase();
  if (!target) return current;

  return splitCommaSeparatedList(current)
    .filter((value) => value.toLowerCase() !== target)
    .join(", ");
}

function buildUniqueOptionList(
  suggestions: { name: string }[] | undefined,
  selected: string[],
): string[] {
  return [
    ...new Set([...(suggestions ?? []).map((item) => item.name), ...selected]),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
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
  const [personaTagDraft, setPersonaTagDraft] = useState("");
  const [restrictionDraft, setRestrictionDraft] = useState("");
  const selectedPersonaTags = useMemo(
    () => splitCommaSeparatedList(personaTagsInput),
    [personaTagsInput],
  );
  const selectedRestrictions = useMemo(
    () => splitCommaSeparatedList(restrictionsInput),
    [restrictionsInput],
  );
  const [onLocationAvailable, setOnLocationAvailable] = useState(false);

  const nextPackageIdRef = useRef(1);
  const [packageDrafts, setPackageDrafts] = useState<PackageDraft[]>(() => [
    createPackageDraft("pkg-0", { name: "Starter", deliveryDays: "3" }),
  ]);
  const nextAddOnIdRef = useRef(1);
  const [addOnDrafts, setAddOnDrafts] = useState<AddOnDraft[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [pendingProfileImageKey, setPendingProfileImageKey] = useState<
    string | null
  >(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const personaTagOptions = useMemo(
    () =>
      buildUniqueOptionList(
        personaTagSuggestionsQuery.data,
        selectedPersonaTags,
      ),
    [personaTagSuggestionsQuery.data, selectedPersonaTags],
  );
  const restrictionOptions = useMemo(
    () =>
      buildUniqueOptionList(
        restrictionSuggestionsQuery.data,
        selectedRestrictions,
      ),
    [restrictionSuggestionsQuery.data, selectedRestrictions],
  );

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

  const updateAddOnDraft = useCallback(
    (id: string, patch: Partial<Omit<AddOnDraft, "id">>) => {
      setAddOnDrafts((rows) =>
        rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const addAddOnDraft = useCallback(() => {
    setAddOnDrafts((rows) => {
      if (rows.length >= MAX_ADD_ONS_IN_CREATOR_SETUP_FORM) return rows;
      const id = `addon-${nextAddOnIdRef.current++}`;
      return [...rows, createAddOnDraft(id)];
    });
  }, []);

  const removeAddOnDraft = useCallback((id: string) => {
    setAddOnDrafts((rows) => rows.filter((row) => row.id !== id));
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
      const initialAddOns = initialProfile.addOns ?? [];
      setPersonaTagDraft("");
      setRestrictionDraft("");
      setOnLocationAvailable(initialProfile.onLocationAvailable ?? false);
      if (initialProfile.packages.length > 0) {
        nextPackageIdRef.current = initialProfile.packages.length;
        setPackageDrafts(
          initialProfile.packages.map((p) => ({
            id: p.id,
            name: p.name,
            priceAmount: p.priceAmount,
            deliveryDays: String(p.deliveryDays),
            deliverables: p.deliverables.join("\n"),
            maxRevisions: String(p.maxRevisions ?? 2),
          })),
        );
      } else {
        setPackageDrafts([
          createPackageDraft("pkg-0", { name: "Starter", deliveryDays: "3" }),
        ]);
        nextPackageIdRef.current = 1;
      }
      if (initialAddOns.length > 0) {
        nextAddOnIdRef.current = initialAddOns.length;
        setAddOnDrafts(
          initialAddOns.map((addOn) =>
            createAddOnDraft(addOn.id, {
              name: addOn.name,
              priceAmount: addOn.priceAmount,
              description: addOn.description?.trim() ?? "",
              existingName: addOn.name,
            }),
          ),
        );
      } else {
        setAddOnDrafts([]);
        nextAddOnIdRef.current = 1;
      }
      return;
    }
    if (!user) return;
    setImagePreviewUrl(null);
    setPendingProfileImageKey(null);
    setCategoriesInput("");
    setPersonaTagsInput("");
    setRestrictionsInput("");
    setPersonaTagDraft("");
    setRestrictionDraft("");
    setOnLocationAvailable(false);
    setAddOnDrafts([]);
    nextAddOnIdRef.current = 1;
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

  const addPersonaTag = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setPersonaTagsInput((prev) =>
      appendUniqueCommaSeparatedItem(prev, trimmed),
    );
  }, []);

  const removePersonaTag = useCallback((value: string) => {
    setPersonaTagsInput((prev) => removeCommaSeparatedItem(prev, value));
  }, []);

  const addRestriction = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRestrictionsInput((prev) =>
      appendUniqueCommaSeparatedItem(prev, trimmed),
    );
  }, []);

  const removeRestriction = useCallback((value: string) => {
    setRestrictionsInput((prev) => removeCommaSeparatedItem(prev, value));
  }, []);

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
        const rowRevisions = Number.parseInt(row.maxRevisions, 10);
        const hasDeliveryInput = row.deliveryDays.trim() !== "";
        const hasRevisionsInput = row.maxRevisions.trim() !== "";
        const touched =
          !!pkgName || !!price || !!row.deliverables.trim() || hasDeliveryInput || hasRevisionsInput;
        const daysOk = !Number.isNaN(rowDays) && rowDays >= 0;
        const revisionsOk = !Number.isNaN(rowRevisions) && rowRevisions >= 0;
        const isComplete = !!pkgName && !!price && daysOk && revisionsOk;

        if (touched && !isComplete) {
          toast.error(
            "Complete each package (name, price, delivery days, revisions) or clear unused rows.",
          );
          return;
        }

        if (isComplete) {
          builtPackages.push({
            name: pkgName,
            deliverables: dels.length ? dels : ["Deliverables to be confirmed"],
            priceAmount: price,
            deliveryDays: rowDays,
            maxRevisions: rowRevisions,
          });
        }
      }

      const packages: CreateCreatorProfilePayload["packages"] =
        builtPackages.length > 0 ? builtPackages : undefined;
      const builtAddOns: NonNullable<CreateCreatorProfilePayload["addOns"]> = [];
      const seenAddOnNames = new Set<string>();

      for (const row of addOnDrafts) {
        const addOnName = row.name.trim();
        const price = row.priceAmount.trim();
        const description = row.description.trim();
        const touched = !!addOnName || !!price || !!description;

        if (touched && (!addOnName || !price)) {
          toast.error(
            "Complete each add-on (name and price) or clear unused rows.",
          );
          return;
        }

        if (!touched) continue;

        const normalizedName = addOnName.toLowerCase();
        if (seenAddOnNames.has(normalizedName)) {
          toast.error("Each add-on name must be unique.");
          return;
        }
        seenAddOnNames.add(normalizedName);

        builtAddOns.push({
          name: addOnName,
          priceAmount: price,
          ...(description ? { description } : {}),
        });
      }

      const addOns: CreateCreatorProfilePayload["addOns"] =
        builtAddOns.length > 0 ? builtAddOns : undefined;

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
        packages,
        addOns,
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
            languages: langs,
            categories: cats,
            personaTags: personas,
            restrictions: rests,
            packages: builtPackages,
            addOns: builtAddOns,
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
      packageDrafts,
      addOnDrafts,
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
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="What do you create? Who do you love working with?"
            className="resize-y"
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
          <MultiValueAddField
            selectId="personaTags"
            inputPlaceholder="Type to search or add a persona tag"
            selectValue={personaTagDraft}
            options={personaTagOptions}
            helperText="Pick from suggestions or add a custom persona tag."
            emptyState="No persona tags added yet."
            selectedValues={selectedPersonaTags}
            onSelectValueChange={setPersonaTagDraft}
            onSelectOption={(value) => {
              addPersonaTag(value);
              setPersonaTagDraft("");
            }}
            onRemoveValue={removePersonaTag}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="restrictions">Content restrictions</Label>
          <MultiValueAddField
            selectId="restrictions"
            inputPlaceholder="Type to search or add a restriction"
            selectValue={restrictionDraft}
            options={restrictionOptions}
            helperText="Pick from suggestions or add a custom content restriction."
            emptyState="No content restrictions added yet."
            selectedValues={selectedRestrictions}
            onSelectValueChange={setRestrictionDraft}
            onSelectOption={(value) => {
              addRestriction(value);
              setRestrictionDraft("");
            }}
            onRemoveValue={removeRestriction}
          />
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
            <div className="space-y-4">
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
            </div>
          ) : null}
        </div>

        <CreatorProfilePackageFields
          rows={packageDrafts}
          inputClassName={inputClass}
          maxPackages={MAX_PACKAGES_IN_CREATOR_SETUP_FORM}
          layout={mode === "update" ? "grid" : "stack"}
          onAdd={addPackageDraft}
          onRemove={removePackageDraft}
          onChange={updatePackageDraft}
        />

        <CreatorProfileAddOnFields
          rows={addOnDrafts}
          inputClassName={inputClass}
          maxAddOns={MAX_ADD_ONS_IN_CREATOR_SETUP_FORM}
          layout={mode === "update" ? "grid" : "stack"}
          onAdd={addAddOnDraft}
          onRemove={removeAddOnDraft}
          onChange={updateAddOnDraft}
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

function MultiValueAddField({
  selectId,
  inputPlaceholder,
  selectValue,
  options,
  helperText,
  emptyState,
  selectedValues,
  onSelectValueChange,
  onSelectOption,
  onRemoveValue,
}: {
  selectId: string;
  inputPlaceholder: string;
  selectValue: string;
  options: string[];
  helperText: string;
  emptyState: string;
  selectedValues: string[];
  onSelectValueChange: (value: string) => void;
  onSelectOption: (value: string) => void;
  onRemoveValue: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const normalizedDraft = selectValue.trim();
  const filteredOptions = useMemo(() => {
    const query = normalizedDraft.toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [normalizedDraft, options]);
  const normalizedSelectedValues = useMemo(
    () => new Set(selectedValues.map((value) => value.trim().toLowerCase())),
    [selectedValues],
  );

  const showAddOption =
    normalizedDraft.length > 0 &&
    !options.some(
      (option) => option.toLowerCase() === normalizedDraft.toLowerCase(),
    );
  const open = isHovered || isFocusedWithin;

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      closeTimeoutRef.current = null;
    }, 140);
  }, [clearCloseTimeout]);

  useEffect(() => {
    return () => clearCloseTimeout();
  }, [clearCloseTimeout]);

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-3">
      <p className="text-xs text-muted-foreground">{helperText}</p>

      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={() => {
          clearCloseTimeout();
          setIsHovered(true);
        }}
        onMouseLeave={scheduleHoverClose}
        onFocusCapture={() => setIsFocusedWithin(true)}
        onBlurCapture={(e) => {
          const nextFocused = e.relatedTarget;
          if (
            nextFocused instanceof Node &&
            containerRef.current?.contains(nextFocused)
          ) {
            return;
          }
          setIsFocusedWithin(false);
        }}
      >
        <Input
          id={selectId}
          value={selectValue}
          onChange={(e) => {
            onSelectValueChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && showAddOption) {
              e.preventDefault();
              onSelectOption(normalizedDraft);
              return;
            }
            if (e.key === "Escape") {
              setIsFocusedWithin(false);
              setIsHovered(false);
              (
                e.currentTarget as HTMLInputElement | HTMLTextAreaElement
              ).blur();
            }
          }}
          placeholder={inputPlaceholder}
          className="h-9 text-sm"
        />
        {open ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border border-border bg-popover p-3 shadow-lg"
            onMouseEnter={() => {
              clearCloseTimeout();
              setIsHovered(true);
            }}
            onMouseLeave={scheduleHoverClose}
          >
            <div className="flex flex-wrap gap-2">
              {showAddOption ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelectOption(normalizedDraft);
                  }}
                  className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/15"
                >
                  Add &quot;{normalizedDraft}&quot;
                </button>
              ) : null}
              {filteredOptions.map((option) => {
                const isSelected = normalizedSelectedValues.has(
                  option.trim().toLowerCase(),
                );

                return (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (isSelected) {
                        onRemoveValue(option);
                        return;
                      }
                      onSelectOption(option);
                    }}
                    aria-pressed={isSelected}
                    className={
                      isSelected
                        ? "inline-flex items-center rounded-full border border-primary/35 bg-primary/12 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/15"
                        : "inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-accent/70"
                    }
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {!showAddOption && filteredOptions.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No matching options.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedValues.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onRemoveValue(value)}
              aria-label={`Remove ${value}`}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/12"
            >
              <span>{value}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyState}</p>
      )}
    </div>
  );
}
