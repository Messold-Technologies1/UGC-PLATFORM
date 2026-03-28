"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
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
  presignCreatorProfileImageUpload,
  putFileToPresignedUrl,
} from "@/features/creators/api/presign-creator-profile-image";

/** Frontend-only; increase or remove to allow more packages without server changes. */
const MAX_PACKAGES_IN_CREATOR_SETUP_FORM = 3;

const MAX_PROFILE_IMAGE_BYTES = 8 * 1024 * 1024;
const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/** Radix Select requires a non-empty value for the default option. */
const GENDER_VALUE_UNSPECIFIED = "__unspecified__";

type PackageDraft = {
  id: string;
  name: string;
  priceAmount: string;
  deliveryDays: string;
  deliverables: string;
};

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

function splitCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type CreatorProfileSetupFormProps = {
  /** Full-screen onboarding vs in-dashboard settings page. */
  variant: "onboarding" | "settings";
  mode: "create" | "update";
  /** Required when `mode="update"`. */
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [travelRadius, setTravelRadius] = useState("");
  const [languages, setLanguages] = useState("");
  /** Comma-separated — maps to `categories` / `personaTags` / `restrictions` on the API. */
  const [categoriesInput, setCategoriesInput] = useState("");
  const [personaTagsInput, setPersonaTagsInput] = useState("");
  const [restrictionsInput, setRestrictionsInput] = useState("");
  const [onLocationAvailable, setOnLocationAvailable] = useState(false);
  const [onLocationFee, setOnLocationFee] = useState("");
  /** Monotonic ids for new rows (initial row is always pkg-0 — stable for SSR hydration). */
  const nextPackageIdRef = useRef(1);
  const [packageDrafts, setPackageDrafts] = useState<PackageDraft[]>(() => [
    createPackageDraft("pkg-0", { name: "Starter", deliveryDays: "3" }),
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  /** Temp S3 key after presign + PUT; sent as `profileImageKey` on create/update. */
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
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase().slice(0, 2);
    }
    return base.slice(0, 2).toUpperCase();
  }, [displayName, user]);

  const handleProfileImageSelected = useCallback(async (file: File | null) => {
    if (!file) return;
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
  }, []);

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

      const langs = splitCommaList(languages);
      const cats = splitCommaList(categoriesInput);
      const personas = splitCommaList(personaTagsInput);
      const rests = splitCommaList(restrictionsInput);

      const builtPackages: NonNullable<
        CreateCreatorProfilePayload["packages"]
      > = [];

      for (const row of packageDrafts) {
        const pkgName = row.name.trim();
        const price = row.priceAmount.trim();
        const dels = splitLines(row.deliverables);
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
            queryKey: ["creator-profile-me"],
          });
          toast.success("Profile updated");
          onSuccess();
          return;
        }

        await createCreatorProfile(createPayload);
        await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
        toast.success("Creator profile created");
        onSuccess();
      } catch (err) {
        if (
          mode === "create" &&
          isAxiosError(err) &&
          err.response?.status === 409
        ) {
          toast.message("Profile already exists", {
            description: "Continuing to your dashboard.",
          });
          await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
          onSuccess();
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
    ],
  );

  const inputClass = "h-9 text-sm";

  /** Settings: parent `<main>` scrolls — no inner overflow (avoids double scrollbars + bottom gap). Onboarding: outer overlay scrolls (`GlobalOnboardingPage`). */
  const shellClass =
    variant === "onboarding"
      ? "flex flex-col bg-transparent p-6 md:p-8"
      : "flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8";

  const heading =
    mode === "update"
      ? "Edit your creator profile"
      : "Set up your creator profile";
  const subheading =
    variant === "settings"
      ? "Changes apply to how brands see you in search and on your public profile."
      : "Brands see this in search. You can edit everything later in settings.";

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={shellClass}>
      <div className="mb-6 space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {heading}
        </h2>
        <p className="text-sm text-muted-foreground">{subheading}</p>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-start">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {imagePreviewUrl ? (
            <Image
              src={imagePreviewUrl}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
              unoptimized
            />
          ) : (
            <div
              className="flex size-full items-center justify-center bg-primary/15 text-lg font-semibold text-primary"
              aria-hidden
            >
              {displayInitials()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Label className="text-base">Profile photo</Label>
          <p className="text-xs text-muted-foreground">
            Upload a square image. Shown in search and on your public profile.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={PROFILE_IMAGE_ACCEPT}
            className="sr-only"
            aria-label="Upload profile photo"
            onChange={(e) =>
              void handleProfileImageSelected(e.target.files?.[0] ?? null)
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploadingImage || pending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingImage ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              {uploadingImage ? "Uploading…" : "Upload photo"}
            </Button>
            {pendingProfileImageKey ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={uploadingImage || pending}
                onClick={clearProfileImage}
              >
                Discard new photo
              </Button>
            ) : null}
          </div>
        </div>
      </div>

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
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label htmlFor="onLocation" className="text-sm font-medium">
              On-location / store shoots
            </Label>
            <p className="text-xs text-muted-foreground">
              Enable if you offer on-location or in-store shoots. Optional fee
              below.
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

        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Packages</p>
              {/* <p className="text-xs text-muted-foreground">
                Optional — up to {MAX_PACKAGES_IN_CREATOR_SETUP_FORM} packages.
                Brands see your pricing; you can edit later in settings.
              </p> */}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={
                packageDrafts.length >= MAX_PACKAGES_IN_CREATOR_SETUP_FORM
              }
              onClick={addPackageDraft}
            >
              Add package
            </Button>
          </div>

          <div className="space-y-4">
            {packageDrafts.map((row, index) => (
              <div
                key={row.id}
                className="space-y-3 rounded-lg border border-border/80 bg-background/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Package {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removePackageDraft(row.id)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor={`pkg-name-${row.id}`}>Name</Label>
                    <Input
                      id={`pkg-name-${row.id}`}
                      className={inputClass}
                      value={row.name}
                      onChange={(e) =>
                        updatePackageDraft(row.id, { name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`pkg-price-${row.id}`}>Price</Label>
                    <Input
                      id={`pkg-price-${row.id}`}
                      className={inputClass}
                      value={row.priceAmount}
                      onChange={(e) =>
                        updatePackageDraft(row.id, {
                          priceAmount: e.target.value,
                        })
                      }
                      placeholder="199.99"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`pkg-days-${row.id}`}>
                      Delivery (days)
                    </Label>
                    <Input
                      id={`pkg-days-${row.id}`}
                      type="number"
                      min={0}
                      className={inputClass}
                      value={row.deliveryDays}
                      onChange={(e) =>
                        updatePackageDraft(row.id, {
                          deliveryDays: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pkg-deliverables-${row.id}`}>
                    Deliverables (one per line)
                  </Label>
                  <textarea
                    id={`pkg-deliverables-${row.id}`}
                    value={row.deliverables}
                    onChange={(e) =>
                      updatePackageDraft(row.id, {
                        deliverables: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder={"1 UGC video (30–60s)\nBasic editing"}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 dark:bg-input/30"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
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
