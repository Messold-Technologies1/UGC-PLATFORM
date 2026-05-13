"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { City, Country, State, type ICity, type ICountry, type IState } from "country-state-city";
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
import type {
  CreatorAddOnOption,
} from "@/features/creators/api/get-creator-add-on-options";
import type {
  CreatorFacetDimension,
  CreatorFacetOption,
} from "@/features/creators/api/get-creator-facet-options";

const MAX_INTRO_VIDEO_BYTES = 200 * 1024 * 1024;
const INTRO_VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
const INTRO_VIDEO_CONTENT_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const SELECT_NONE = "__none__";
const PACKAGE_NAME = "1 Video UGC";
const PACKAGE_DELIVERY_DAYS = 5;
const PACKAGE_VIDEO_LENGTH_SECONDS = 60;
const PACKAGE_PRICE_STEP = 500;

const facetSections: Array<{
  dimension: Exclude<CreatorFacetDimension, "LANGUAGE">;
  label: string;
}> = [
  { dimension: "CONTENT_FORMAT", label: "Content format" },
  { dimension: "APPEARANCE", label: "Appearance" },
  { dimension: "CONTENT_STYLE", label: "Content style" },
  { dimension: "CAPABILITY", label: "Capabilities" },
  { dimension: "LIFE_STYLE", label: "Lifestyle" },
  { dimension: "INTEREST", label: "Content category" },
  { dimension: "CATEGORY_EXPERIENCE", label: "Category experience" },
  { dimension: "OCCUPATION", label: "Occupation" },
  { dimension: "CAN_CREATE_WITH", label: "Can create with" },
  { dimension: "AI_CONTENT_PERMISSION", label: "AI content permission" },
];

const genderOptions: Array<{ value: CreatorGender; label: string }> = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
  { value: "OTHER", label: "Other" },
];

const contentVolumeOptions: Array<{
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

const fluencyOptions: Array<{ value: CreatorLanguageFluency; label: string }> =
  [
    { value: "NATIVE", label: "Native" },
    { value: "FLUENT", label: "Fluent" },
    { value: "CONVERSATIONAL", label: "Conversational" },
  ];

export type CreatorProfileSetupFormProps = {
  variant: "onboarding" | "settings";
  mode: "create" | "update";
  profileId?: string;
  initialProfile?: CreatorProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

type CreatorProfileSetupFormContentProps = CreatorProfileSetupFormProps & {
  user: AuthUser | null;
};

type SelectedFacets = Partial<
  Record<Exclude<CreatorFacetDimension, "LANGUAGE">, string[]>
>;

type LanguageDraft = {
  slug: string;
  fluency: CreatorLanguageFluency;
};

type PackageDraft = {
  packageName: string;
  videoLengthSeconds: string;
  priceAmount: string;
  maxRevisions: string;
  basicEditing: boolean;
};

type AddOnDraft = {
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
  if (INTRO_VIDEO_CONTENT_TYPES.has(contentType)) {
    return contentType;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "mp4") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  return null;
}

function normalizeWholeNumberInput(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeOptionalUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
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
    const dimension = row.dimension as Exclude<CreatorFacetDimension, "LANGUAGE">;
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
    videoLengthSeconds: pkg?.videoLengthSeconds != null ? String(pkg.videoLengthSeconds) : String(PACKAGE_VIDEO_LENGTH_SECONDS),
    priceAmount: pkg?.priceAmount ? String(Math.round(Number(pkg.priceAmount))) : "",
    maxRevisions: pkg?.maxRevisions != null ? String(pkg.maxRevisions) : "1",
    basicEditing: pkg?.deliverables?.includes("Basic editing") ?? false,
  };
}

function findCountryByName(name: string | null | undefined): ICountry | null {
  const target = name?.trim().toLowerCase();
  if (!target) return null;
  return (
    Country.getAllCountries().find(
      (country) => country.name.trim().toLowerCase() === target,
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
      (state) => state.name.trim().toLowerCase() === target,
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

export function CreatorProfileSetupForm({
  variant,
  mode,
  profileId,
  initialProfile,
  onSuccess,
  onPendingChange,
}: CreatorProfileSetupFormProps) {
  const { user } = useAuth();
  const formKey =
    mode === "update"
      ? `update:${initialProfile?.id ?? profileId ?? "profile"}`
      : `create:${user?.id ?? "anonymous"}`;

  return (
    <CreatorProfileSetupFormContent
      key={formKey}
      variant={variant}
      mode={mode}
      profileId={profileId}
      initialProfile={initialProfile}
      onSuccess={onSuccess}
      onPendingChange={onPendingChange}
      user={user}
    />
  );
}

function CreatorProfileSetupFormContent({
  variant,
  mode,
  profileId,
  initialProfile,
  onSuccess,
  onPendingChange,
  user,
}: CreatorProfileSetupFormContentProps) {
  const { refreshUser } = useAuth();
  const uploadCreatorIntroVideoMutation =
    useUploadCreatorIntroVideoMutation(mode);
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
    () => findStateByName(initialCountry?.isoCode ?? "", initialProfile?.stateName),
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
  const [instagramUrl, setInstagramUrl] = useState(
    () => initialProfile?.instagramUrl?.trim() ?? "",
  );
  const [contentVolume, setContentVolume] = useState<
    CreatorContentVolumeBucket | ""
  >(() => (initialProfile?.contentVolume as CreatorContentVolumeBucket | undefined) ?? "");
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
  const [addOnDrafts, setAddOnDrafts] = useState<Record<string, AddOnDraft>>({});
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
    () =>
      countries.find((country) => country.isoCode === countryCode)?.name ?? "",
    [countries, countryCode],
  );
  const stateName = useMemo(
    () => states.find((state) => state.isoCode === stateCode)?.name ?? "",
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
      addOnOptions.map((option) => [option.name.trim().toLowerCase(), option]),
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
            if (introVideoInputRef.current) {
              introVideoInputRef.current.value = "";
            }
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
    if (introVideoInputRef.current) {
      introVideoInputRef.current.value = "";
    }
  }, [mode]);

  const toggleFacet = useCallback(
    (dimension: Exclude<CreatorFacetDimension, "LANGUAGE">, slug: string) => {
      setSelectedFacets((current) => {
        const values = current[dimension] ?? [];
        const nextValues = values.includes(slug)
          ? values.filter((value) => value !== slug)
          : [...values, slug];
        return { ...current, [dimension]: nextValues };
      });
    },
    [],
  );

  const toggleLanguage = useCallback((slug: string) => {
    setLanguageDrafts((current) => {
      if (current.some((row) => row.slug === slug)) {
        return current.filter((row) => row.slug !== slug);
      }
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
        if (base.includes(option.slug)) {
          return base.filter((slug) => slug !== option.slug);
        }
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

  const buildPackages = useCallback((): CreatorPackageCreatePayload[] | null => {
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
    const bySlug = new Map(addOnOptions.map((option) => [option.slug, option]));
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
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

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

      const instagram = normalizeOptionalUrl(instagramUrl);
      if (instagramUrl.trim() && !instagram) {
        toast.error("Instagram URL must be a valid http(s) URL.");
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
        languageDrafts.map((row) => ({
          slug: row.slug,
          fluency: row.fluency,
        }));

      const payload: CreateCreatorProfilePayload | UpdateCreatorProfilePayload = {
        displayName: name,
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
      stateName,
      submitCreatorProfileMutation,
      travelRadius,
      uploadingIntroVideo,
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
          videoPreviewUrl={introVideoPreviewUrl}
          accept={INTRO_VIDEO_ACCEPT}
          disabled={uploadingIntroVideo || pending}
          uploading={uploadingIntroVideo}
          hasPendingVideo={Boolean(pendingIntroVideoKey) || introVideoRemoved}
          hasExistingVideo={Boolean(introVideoPreviewUrl)}
          pendingActionLabel={introVideoRemoved ? "Undo remove" : undefined}
          fileInputRef={introVideoInputRef}
          onSelectFile={(file) => void handleIntroVideoSelected(file)}
          onDiscard={restoreInitialIntroVideo}
          onRemove={removeIntroVideo}
        />
      </motion.div>

      <div className="flex flex-col gap-6">
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
            <SelectField
              id="country"
              label="Country"
              value={countryCode}
              placeholder="Select country"
              disabled={pending}
              options={countries.map((country) => ({
                value: country.isoCode,
                label: country.name,
              }))}
              onChange={(value) => {
                setCountryCode(value);
                setStateCode("");
                setCity("");
              }}
            />
            <SelectField
              id="state"
              label="State"
              value={stateCode}
              placeholder={countryCode ? "Select state" : "Select country first"}
              disabled={pending || !countryCode || states.length === 0}
              options={states.map((state) => ({
                value: state.isoCode,
                label: state.name,
              }))}
              onChange={(value) => {
                setStateCode(value);
                setCity("");
              }}
            />
            <SelectField
              id="city"
              label="City"
              value={city}
              placeholder={stateCode ? "Select city" : "Select state first"}
              disabled={pending || !stateCode || cities.length === 0}
              options={cities.map((row) => ({
                value: row.name,
                label: row.name,
              }))}
              onChange={setCity}
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
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
            loading={facetOptionsQuery.isLoading}
          error={facetOptionsQuery.isError}
            label="creator profile options"
            onRetry={() => void facetOptionsQuery.refetch()}
          />
        </motion.div>

        {!facetOptionsQuery.isLoading && !facetOptionsQuery.isError ? (
          <motion.section variants={itemVariants} className="space-y-4">
            {/* <div>
              <p className="text-sm font-medium text-foreground">
                Profile facets
              </p>
              <p className="text-xs text-muted-foreground">
                Select the catalog values that best describe your creator work.
              </p>
            </div> */}
            <div className="flex flex-col gap-3">
              {facetSections.map((section) => {
                const options = facetOptionsByDimension[section.dimension] ?? [];
                const selected = selectedFacets[section.dimension] ?? [];
                return (
                  <FacetSectionDropdown
                    key={section.dimension}
                    dimension={section.dimension}
                    label={section.label}
                    options={options}
                    selected={selected}
                    disabled={pending}
                    onToggle={(slug) => toggleFacet(section.dimension, slug)}
                  />
                );
              })}
            </div>
            {/* <div>
              <p className="text-sm font-medium text-foreground">
                Select languages
              </p>
              <p className="text-xs text-muted-foreground">
                Select the languages you are comfortable creating content in.
              </p>
            </div> */}
            <LanguageDropdown
              options={facetOptionsByDimension.LANGUAGE ?? []}
              selected={languageDrafts}
              disabled={pending}
              onToggle={toggleLanguage}
              onFluencyChange={updateLanguageFluency}
            />
          </motion.section>
        ) : null}

        <motion.div variants={itemVariants}>
          <PackageEditor
            draft={packageDraft}
            disabled={pending}
            onChange={setPackageDraft}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <CatalogStatus
            loading={addOnOptionsQuery.isLoading}
          error={addOnOptionsQuery.isError}
            label="add-on options"
            onRetry={() => void addOnOptionsQuery.refetch()}
          />
        </motion.div>

        {!addOnOptionsQuery.isLoading && !addOnOptionsQuery.isError ? (
          <motion.div variants={itemVariants}>
            <AddOnCatalogEditor
            options={addOnOptions}
            selectedSlugs={effectiveSelectedAddOnSlugs}
            drafts={effectiveAddOnDrafts}
            unmatchedNames={hydratedAddOns.unmatchedNames}
            disabled={pending}
            onToggle={toggleAddOn}
            onDraftChange={(slug, patch) => {
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
          uploadingIntroVideo ||
          facetOptionsQuery.isLoading ||
          addOnOptionsQuery.isLoading
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
                        visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
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
                <p className="text-xs text-muted-foreground">No options configured.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OptionChecklist({
  title,
  options,
  selected,
  disabled,
  onToggle,
}: {
  title: string;
  options: CreatorFacetOption[];
  selected: string[];
  disabled: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-4">
      <legend className="px-1 text-sm font-medium text-foreground">
        {title}
      </legend>
      {options.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.slug}
              className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/60"
            >
              <Checkbox
                className="mt-0.5"
                disabled={disabled}
                checked={selected.includes(option.slug)}
                onCheckedChange={() => onToggle(option.slug)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No options configured.</p>
      )}
    </fieldset>
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
        <ChevronDownIcon className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
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
                              disabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <RadioGroupItem value={item.value} id={`${option.slug}-${item.value}`} disabled={disabled} />
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
            <p className="text-xs text-muted-foreground">No languages configured.</p>
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
          <Input value={`${PACKAGE_DELIVERY_DAYS} Days`} disabled className="h-9 text-sm" />
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
          onCheckedChange={(basicEditing) => onChange({ ...draft, basicEditing })}
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
                      <Label htmlFor={`addon-price-${option.slug}`}>Price</Label>
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
