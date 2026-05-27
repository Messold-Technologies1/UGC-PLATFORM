"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  City,
  Country,
  State,
  type ICity,
  type ICountry,
  type IState,
} from "country-state-city";
import { toast } from "sonner";

import { useAuth, type AuthUser } from "@/providers/auth-provider";
import type {
  CreateCreatorProfilePayload,
  CreatorAddOnCreatePayload,
  CreatorContentVolumeBucket,
  CreatorFacetSelectionPayload,
  CreatorGender,
  CreatorLanguageFluency,
  CreatorPackageCreatePayload,
  CreatorProfileLanguagePayload,
} from "@/features/creators/api/create-creator-profile";
import {
  useSubmitCreatorProfileMutation,
  useUploadCreatorIntroVideoMutation,
} from "@/features/creators/hooks/use-creator-profile-form-mutation";
import {
  useCreatorAddOnOptionsQuery,
  useCreatorFacetOptionsQuery,
} from "@/features/creators/hooks/use-creator-suggestion-queries";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { UpdateCreatorProfilePayload } from "@/features/creators/api/update-creator-profile";
import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";
import type { CreatorFacetDimension } from "@/features/creators/api/get-creator-facet-options";

export const MAX_INTRO_VIDEO_BYTES = 200 * 1024 * 1024;
export const INTRO_VIDEO_ACCEPT =
  "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
const INTRO_VIDEO_CONTENT_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const SELECT_NONE = "__none__";
const PACKAGE_NAME = "";
const PACKAGE_DELIVERY_DAYS = 5;
const PACKAGE_VIDEO_LENGTH_SECONDS = 60;
const PACKAGE_PRICE_STEP = 500;

export { SELECT_NONE, PACKAGE_DELIVERY_DAYS, PACKAGE_PRICE_STEP };

export const facetSections: Array<{
  dimension: Exclude<CreatorFacetDimension, "LANGUAGE">;
  label: string;
}> = [
  { dimension: "CONTENT_FORMAT", label: "Content format" },
  { dimension: "APPEARANCE", label: "Appearance" },
  { dimension: "CONTENT_STYLE", label: "Content style" },
  { dimension: "CAPABILITY", label: "Capabilities" },
  { dimension: "LIFE_STYLE", label: "Lifestyle" },
  { dimension: "CONTENT_CATEGORY", label: "Content category" },
  { dimension: "CATEGORY_EXPERIENCE", label: "Category experience" },
  { dimension: "OCCUPATION", label: "Occupation" },
  { dimension: "CAN_CREATE_WITH", label: "Can create with" },
  { dimension: "AI_CONTENT_PERMISSION", label: "AI content permission" },
];

export const genderOptions: Array<{ value: CreatorGender; label: string }> = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
  { value: "OTHER", label: "Other" },
];

export const contentVolumeOptions: Array<{
  value: CreatorContentVolumeBucket;
  label: string;
}> = [
  { value: "NONE", label: "0" },
  { value: "RANGE_1_5", label: "1-5" },
  { value: "RANGE_5_15", label: "5-15" },
  { value: "RANGE_15_25", label: "15-25" },
  { value: "RANGE_25_50", label: "25-50" },
  { value: "RANGE_50_PLUS", label: "50+" },
];

export const fluencyOptions: Array<{
  value: CreatorLanguageFluency;
  label: string;
}> = [
  { value: "NATIVE", label: "Native" },
  { value: "FLUENT", label: "Fluent" },
  { value: "CONVERSATIONAL", label: "Conversational" },
];

export type SelectedFacets = Partial<
  Record<Exclude<CreatorFacetDimension, "LANGUAGE">, string[]>
>;

export type LanguageDraft = {
  slug: string;
  fluency: CreatorLanguageFluency;
};

export type PackageDraft = {
  packageName: string;
  videoLengthSeconds: string;
  priceAmount: string;
  maxRevisions: string;
  basicEditing: boolean;
};

export type AddOnDraft = {
  priceAmount: string;
  description: string;
};

function getInitialCreatorName(user: AuthUser | null): string {
  return user?.name?.trim() || user?.email?.split("@")[0] || "";
}

function getInitialCreatorIntroVideoPreviewUrl(
  mode: "create" | "update",
  initialProfile?: CreatorProfileItemApi | null,
): string | null {
  if (mode !== "update") return null;
  const url = initialProfile?.introVideoUrl?.trim();
  if (!url) return null;
  return url.startsWith("http://") || url.startsWith("https://") ? url : null;
}

function getIntroVideoContentType(file: File): string | null {
  const contentType = file.type.toLowerCase();
  if (INTRO_VIDEO_CONTENT_TYPES.has(contentType)) return contentType;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "mp4") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  return null;
}

export function normalizeWholeNumberInput(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeOptionalUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function createInitialSelectedFacets(
  initialProfile?: CreatorProfileItemApi | null,
): SelectedFacets {
  const out: SelectedFacets = {};
  for (const row of initialProfile?.facetSelections ?? []) {
    if (row.dimension === "LANGUAGE") continue;
    const dimension = row.dimension as Exclude<
      CreatorFacetDimension,
      "LANGUAGE"
    >;
    out[dimension] = [...(out[dimension] ?? []), row.slug];
  }
  return out;
}

function createInitialLanguageDrafts(
  initialProfile?: CreatorProfileItemApi | null,
): LanguageDraft[] {
  return (initialProfile?.profileLanguages ?? []).map((row) => ({
    slug: row.slug,
    fluency: row.fluency,
  }));
}

function createInitialPackageDraft(
  initialProfile?: CreatorProfileItemApi | null,
): PackageDraft {
  const pkg = initialProfile?.packages?.[0];
  return {
    packageName: pkg?.name ?? PACKAGE_NAME,
    videoLengthSeconds:
      pkg?.videoLengthSeconds != null
        ? String(pkg.videoLengthSeconds)
        : String(PACKAGE_VIDEO_LENGTH_SECONDS),
    priceAmount: pkg?.priceAmount
      ? String(Math.round(Number(pkg.priceAmount)))
      : "",
    maxRevisions: pkg?.maxRevisions != null ? String(pkg.maxRevisions) : "1",
    basicEditing: pkg?.deliverables?.includes("Basic editing") ?? false,
  };
}

function findCountryByName(name: string | null | undefined): ICountry | null {
  const target = name?.trim().toLowerCase();
  if (!target) return null;
  return (
    Country.getAllCountries().find(
      (c) => c.name.trim().toLowerCase() === target,
    ) ?? null
  );
}

function findStateByName(
  countryCode: string,
  name: string | null | undefined,
): IState | null {
  const target = name?.trim().toLowerCase();
  if (!countryCode || !target) return null;
  return (
    State.getStatesOfCountry(countryCode).find(
      (s) => s.name.trim().toLowerCase() === target,
    ) ?? null
  );
}

function addOnPriceError(
  option: CreatorAddOnOption,
  priceAmount: string,
): string | null {
  const price = Number(priceAmount);
  if (!/^\d+$/.test(priceAmount) || !Number.isInteger(price)) {
    return `${option.name} price must be a whole number.`;
  }
  if (option.fixedPrice != null) {
    return price === option.fixedPrice
      ? null
      : `${option.name} price must be exactly ₹${option.fixedPrice}.`;
  }
  const min = option.minPrice ?? 0;
  const step = option.stepPrice ?? 1;
  if (price < min || price % step !== 0) {
    return `${option.name} price must be >= ₹${min} and in steps of ₹${step}.`;
  }
  return null;
}

export type UseCreatorProfileFormStateOptions = {
  variant: "onboarding" | "settings";
  mode: "create" | "update";
  profileId?: string;
  initialProfile?: CreatorProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

export function useCreatorProfileFormState(
  options: UseCreatorProfileFormStateOptions,
) {
  const {
    variant,
    mode,
    profileId,
    initialProfile,
    onSuccess,
    onPendingChange,
  } = options;
  const { user, refreshUser } = useAuth();

  const uploadCreatorIntroVideoMutation =
    useUploadCreatorIntroVideoMutation({ mode, creatorProfileId: profileId });
  const submitCreatorProfileMutation = useSubmitCreatorProfileMutation({
    mode,
    profileId,
    onSuccess,
  });
  const facetOptionsQuery = useCreatorFacetOptionsQuery({
    enabled: Boolean(user),
    staleTime: 60 * 60_000,
  });
  const addOnOptionsQuery = useCreatorAddOnOptionsQuery({
    enabled: Boolean(user),
    staleTime: 60 * 60_000,
  });

  const initialCountry = useMemo(
    () => findCountryByName(initialProfile?.countryName),
    [initialProfile?.countryName],
  );
  const initialState = useMemo(
    () =>
      findStateByName(initialCountry?.isoCode ?? "", initialProfile?.stateName),
    [initialCountry?.isoCode, initialProfile?.stateName],
  );

  const pending = submitCreatorProfileMutation.isPending;
  useLayoutEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [displayName, setDisplayName] = useState(() =>
    mode === "update"
      ? (initialProfile?.displayName ?? "")
      : getInitialCreatorName(user),
  );
  const [countryCode, setCountryCode] = useState(initialCountry?.isoCode ?? "");
  const [stateCode, setStateCode] = useState(initialState?.isoCode ?? "");
  const [city, setCity] = useState(() => initialProfile?.city?.trim() ?? "");
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
  const [contactEmail, setContactEmail] = useState(() =>
    mode === "update"
      ? (initialProfile?.contactEmail?.trim() ?? user?.email ?? "")
      : (user?.email ?? ""),
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
  const [selectedFacets, setSelectedFacets] = useState<SelectedFacets>(() =>
    createInitialSelectedFacets(initialProfile),
  );
  const [languageDrafts, setLanguageDrafts] = useState<LanguageDraft[]>(() =>
    createInitialLanguageDrafts(initialProfile),
  );
  const [packageDraft, setPackageDraft] = useState<PackageDraft>(() =>
    createInitialPackageDraft(initialProfile),
  );
  const [selectedAddOnSlugs, setSelectedAddOnSlugs] = useState<string[]>([]);
  const [addOnDrafts, setAddOnDrafts] = useState<Record<string, AddOnDraft>>(
    {},
  );
  const [addOnsTouched, setAddOnsTouched] = useState(false);

  const introVideoInputRef = useRef<HTMLInputElement>(null);
  const [introVideoPreviewUrl, setIntroVideoPreviewUrl] = useState<
    string | null
  >(() => getInitialCreatorIntroVideoPreviewUrl(mode, initialProfile));
  const [pendingIntroVideoKey, setPendingIntroVideoKey] = useState<
    string | null
  >(null);
  const [introVideoRemoved, setIntroVideoRemoved] = useState(false);
  const uploadingIntroVideo = uploadCreatorIntroVideoMutation.isPending;

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode) : []),
    [countryCode],
  );
  const cities = useMemo<ICity[]>(
    () =>
      countryCode && stateCode
        ? City.getCitiesOfState(countryCode, stateCode)
        : [],
    [countryCode, stateCode],
  );
  const countryName = useMemo(
    () => countries.find((c) => c.isoCode === countryCode)?.name ?? "",
    [countries, countryCode],
  );
  const stateName = useMemo(
    () => states.find((s) => s.isoCode === stateCode)?.name ?? "",
    [states, stateCode],
  );
  const facetOptionsByDimension =
    facetOptionsQuery.data?.optionsByDimension ?? {};
  const addOnOptions = useMemo(
    () => addOnOptionsQuery.data?.options ?? [],
    [addOnOptionsQuery.data?.options],
  );

  const hydratedAddOns = useMemo(() => {
    if (mode !== "update" || !addOnOptions.length) {
      return {
        selectedSlugs: [] as string[],
        drafts: {} as Record<string, AddOnDraft>,
        unmatchedNames: [] as string[],
      };
    }
    const byName = new Map(
      addOnOptions.map((o) => [o.name.trim().toLowerCase(), o]),
    );
    const nextSlugs: string[] = [];
    const nextDrafts: Record<string, AddOnDraft> = {};
    const unmatched: string[] = [];
    for (const addOn of initialProfile?.addOns ?? []) {
      const option = byName.get(addOn.name.trim().toLowerCase());
      if (!option) {
        unmatched.push(addOn.name);
        continue;
      }
      nextSlugs.push(option.slug);
      nextDrafts[option.slug] = {
        priceAmount: String(Math.round(Number(addOn.priceAmount))),
        description: addOn.description?.trim() ?? "",
      };
    }
    return {
      selectedSlugs: [...new Set(nextSlugs)],
      drafts: nextDrafts,
      unmatchedNames: unmatched,
    };
  }, [addOnOptions, initialProfile?.addOns, mode]);

  const effectiveSelectedAddOnSlugs = addOnsTouched
    ? selectedAddOnSlugs
    : hydratedAddOns.selectedSlugs;
  const effectiveAddOnDrafts = addOnsTouched
    ? addOnDrafts
    : hydratedAddOns.drafts;

  const handleIntroVideoSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const contentType = getIntroVideoContentType(file);
      if (!contentType) {
        toast.error("Use MP4, MOV, or WebM video.");
        return;
      }
      if (file.size > MAX_INTRO_VIDEO_BYTES) {
        toast.error("Intro video must be 200 MB or smaller.");
        return;
      }
      uploadCreatorIntroVideoMutation.mutate(
        { file, contentType },
        {
          onSuccess: (result) => {
            if (!result) return;
            setPendingIntroVideoKey(result.key);
            setIntroVideoPreviewUrl(result.cdnUrl);
            setIntroVideoRemoved(false);
          },
          onSettled: () => {
            if (introVideoInputRef.current)
              introVideoInputRef.current.value = "";
          },
        },
      );
    },
    [uploadCreatorIntroVideoMutation],
  );

  const restoreInitialIntroVideo = useCallback(() => {
    setPendingIntroVideoKey(null);
    setIntroVideoRemoved(false);
    const url = initialProfile?.introVideoUrl?.trim();
    setIntroVideoPreviewUrl(
      mode === "update" &&
        (url?.startsWith("http://") || url?.startsWith("https://"))
        ? url
        : null,
    );
  }, [initialProfile?.introVideoUrl, mode]);

  const removeIntroVideo = useCallback(() => {
    setPendingIntroVideoKey(null);
    setIntroVideoPreviewUrl(null);
    setIntroVideoRemoved(mode === "update");
    if (introVideoInputRef.current) introVideoInputRef.current.value = "";
  }, [mode]);

  const toggleFacet = useCallback(
    (dimension: Exclude<CreatorFacetDimension, "LANGUAGE">, slug: string) => {
      setSelectedFacets((current) => {
        const values = current[dimension] ?? [];
        const nextValues = values.includes(slug)
          ? values.filter((v) => v !== slug)
          : [...values, slug];
        return { ...current, [dimension]: nextValues };
      });
    },
    [],
  );

  const toggleLanguage = useCallback((slug: string) => {
    setLanguageDrafts((current) => {
      if (current.some((row) => row.slug === slug))
        return current.filter((row) => row.slug !== slug);
      return [...current, { slug, fluency: "FLUENT" }];
    });
  }, []);

  const updateLanguageFluency = useCallback(
    (slug: string, fluency: CreatorLanguageFluency) => {
      setLanguageDrafts((current) =>
        current.map((row) => (row.slug === slug ? { ...row, fluency } : row)),
      );
    },
    [],
  );

  const toggleAddOn = useCallback(
    (option: CreatorAddOnOption) => {
      setAddOnsTouched(true);
      setSelectedAddOnSlugs((current) => {
        const base = addOnsTouched ? current : effectiveSelectedAddOnSlugs;
        if (base.includes(option.slug))
          return base.filter((s) => s !== option.slug);
        return [...base, option.slug];
      });
      setAddOnDrafts((current) => {
        const base = addOnsTouched ? current : effectiveAddOnDrafts;
        if (base[option.slug]) return base;
        return {
          ...base,
          [option.slug]: {
            priceAmount: String(option.fixedPrice ?? option.minPrice ?? 0),
            description: "",
          },
        };
      });
    },
    [addOnsTouched, effectiveAddOnDrafts, effectiveSelectedAddOnSlugs],
  );

  const updateAddOnDraft = useCallback(
    (slug: string, patch: Partial<AddOnDraft>) => {
      setAddOnsTouched(true);
      setAddOnDrafts((current) => ({
        ...(addOnsTouched ? current : effectiveAddOnDrafts),
        [slug]: {
          ...((addOnsTouched ? current : effectiveAddOnDrafts)[slug] ?? {
            priceAmount: "",
            description: "",
          }),
          ...patch,
        },
      }));
    },
    [addOnsTouched, effectiveAddOnDrafts],
  );

  const buildPackages = useCallback(():
    | CreatorPackageCreatePayload[]
    | null => {
    const packageName = packageDraft.packageName.trim();
    const videoLength = Number(packageDraft.videoLengthSeconds);
    const price = packageDraft.priceAmount.trim();
    const priceNumber = Number(price);
    const revisions = Number(packageDraft.maxRevisions);
    if (!packageName) {
      toast.error("Package name is required.");
      return null;
    }
    if (!Number.isInteger(videoLength) || videoLength < 1 || videoLength > 60) {
      toast.error("Video length must be between 1 and 60 seconds.");
      return null;
    }
    if (!/^\d+$/.test(price)) {
      toast.error("Package price must be a whole number.");
      return null;
    }
    if (
      !Number.isInteger(priceNumber) ||
      priceNumber < PACKAGE_PRICE_STEP ||
      priceNumber % PACKAGE_PRICE_STEP !== 0
    ) {
      toast.error("Package price must be at least ₹500 and in steps of ₹500.");
      return null;
    }
    if (!Number.isInteger(revisions) || revisions < 1) {
      toast.error("Package revisions must be at least 1.");
      return null;
    }
    const deliverables = packageDraft.basicEditing
      ? ["1 Video", "Basic editing"]
      : ["1 Video"];
    return [
      {
        name: packageName,
        deliverables,
        videoLengthSeconds: videoLength,
        basicEditing: packageDraft.basicEditing,
        priceAmount: price,
        deliveryDays: PACKAGE_DELIVERY_DAYS,
        maxRevisions: revisions,
      },
    ];
  }, [packageDraft]);

  const buildAddOns = useCallback((): CreatorAddOnCreatePayload[] | null => {
    const bySlug = new Map(addOnOptions.map((o) => [o.slug, o]));
    const out: CreatorAddOnCreatePayload[] = [];
    for (const slug of effectiveSelectedAddOnSlugs) {
      const option = bySlug.get(slug);
      const draft = effectiveAddOnDrafts[slug];
      if (!option || !draft) continue;
      const price = draft.priceAmount.trim();
      const error = addOnPriceError(option, price);
      if (error) {
        toast.error(error);
        return null;
      }
      out.push({
        slug,
        priceAmount: price,
        ...(draft.description.trim()
          ? { description: draft.description.trim() }
          : {}),
      });
    }
    return out;
  }, [addOnOptions, effectiveAddOnDrafts, effectiveSelectedAddOnSlugs]);

  const handleSubmit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (uploadingIntroVideo) {
        toast.error("Wait for uploads to finish before saving your profile.");
        return;
      }
      if (facetOptionsQuery.isLoading || addOnOptionsQuery.isLoading) {
        toast.error("Profile options are still loading.");
        return;
      }
      if (facetOptionsQuery.isError || addOnOptionsQuery.isError) {
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
      const email = contactEmail.trim();
      if (!email) {
        toast.error("Contact email is required.");
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
      const packages = buildPackages();
      if (!packages) return;
      const addOns = buildAddOns();
      if (!addOns) return;

      const facetSelections: CreatorFacetSelectionPayload[] = [];
      for (const section of facetSections) {
        for (const slug of selectedFacets[section.dimension] ?? []) {
          facetSelections.push({ dimension: section.dimension, slug });
        }
      }
      const profileLanguages: CreatorProfileLanguagePayload[] =
        languageDrafts.map((row) => ({ slug: row.slug, fluency: row.fluency }));

      const payload: CreateCreatorProfilePayload | UpdateCreatorProfilePayload =
        {
          displayName: name,
          contactEmail: email,
          ...(pendingIntroVideoKey
            ? { introVideoKey: pendingIntroVideoKey }
            : mode === "update" && introVideoRemoved
              ? { introVideoKey: "" }
              : {}),
          countryName: countryName || undefined,
          stateName: stateName || undefined,
          city: city.trim() || undefined,
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
          packages,
          addOns,
        };

      submitCreatorProfileMutation.mutate({ payload });
    },
    [
      addOnOptionsQuery.isError,
      addOnOptionsQuery.isLoading,
      bio,
      buildAddOns,
      buildPackages,
      city,
      collaborationCount,
      contactEmail,
      contentVolume,
      countryName,
      dateOfBirth,
      displayName,
      facetOptionsQuery.isError,
      facetOptionsQuery.isLoading,
      gender,
      instagramUrl,
      introVideoRemoved,
      languageDrafts,
      mode,
      onLocationAvailable,
      pendingIntroVideoKey,
      phoneVerified,
      profileId,
      selectedFacets,
      shippingAddress,
      snapchatUrl,
      stateName,
      submitCreatorProfileMutation,
      tiktokUrl,
      travelRadius,
      uploadingIntroVideo,
      youtubeUrl,
    ],
  );

  const selectedFacetCount = useMemo(
    () =>
      Object.values(selectedFacets).reduce(
        (sum, values) => sum + (values?.length ?? 0),
        0,
      ),
    [selectedFacets],
  );

  const completionSummary = useMemo(() => {
    const checkpoints = [
      Boolean(introVideoPreviewUrl || pendingIntroVideoKey),
      phoneVerified,
      Boolean(displayName.trim()),
      Boolean(countryName && city.trim()),
      Boolean(dateOfBirth),
      Boolean(gender),
      languageDrafts.length > 0,
      selectedFacetCount > 0,
      Boolean(packageDraft.priceAmount.trim()),
    ];
    const completed = checkpoints.filter(Boolean).length;
    const total = checkpoints.length;
    return { completed, total, percent: Math.round((completed / total) * 100) };
  }, [
    city,
    countryName,
    dateOfBirth,
    displayName,
    gender,
    introVideoPreviewUrl,
    languageDrafts.length,
    packageDraft.priceAmount,
    pendingIntroVideoKey,
    phoneVerified,
    selectedFacetCount,
  ]);

  return {
    user,
    refreshUser,

    pending,
    uploadingIntroVideo,
    submitCreatorProfileMutation,

    facetOptionsQuery,
    addOnOptionsQuery,

    phoneVerified,
    setPhoneVerified,
    displayName,
    setDisplayName,
    countryCode,
    setCountryCode,
    stateCode,
    setStateCode,
    city,
    setCity,
    bio,
    setBio,
    gender,
    setGender,
    dateOfBirth,
    setDateOfBirth,
    shippingAddress,
    setShippingAddress,
    contactEmail,
    setContactEmail,
    instagramUrl,
    setInstagramUrl,
    youtubeUrl,
    setYoutubeUrl,
    tiktokUrl,
    setTiktokUrl,
    snapchatUrl,
    setSnapchatUrl,
    contentVolume,
    setContentVolume,
    collaborationCount,
    setCollaborationCount,
    travelRadius,
    setTravelRadius,
    onLocationAvailable,
    setOnLocationAvailable,
    selectedFacets,
    toggleFacet,
    languageDrafts,
    toggleLanguage,
    updateLanguageFluency,
    packageDraft,
    setPackageDraft,
    selectedAddOnSlugs: effectiveSelectedAddOnSlugs,
    addOnDrafts: effectiveAddOnDrafts,
    hydratedAddOns,
    toggleAddOn,
    updateAddOnDraft,

    introVideoInputRef,
    introVideoPreviewUrl,
    pendingIntroVideoKey,
    introVideoRemoved,
    handleIntroVideoSelected,
    restoreInitialIntroVideo,
    removeIntroVideo,

    countries,
    states,
    cities,
    countryName,
    stateName,
    facetOptionsByDimension,
    addOnOptions,

    completionSummary,
    selectedFacetCount,

    handleSubmit,

    variant,
    mode,
  };
}

export type CreatorProfileFormState = ReturnType<
  typeof useCreatorProfileFormState
>;
