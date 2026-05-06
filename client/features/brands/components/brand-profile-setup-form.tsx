"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { BrandLogoField } from "@/features/brands/components/brand-logo-field";
import { BrandPronunciationAudioField } from "@/features/brands/components/brand-pronunciation-audio-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  useSubmitBrandProfileMutation,
  useUploadBrandLogoMutation,
  useUploadBrandPronunciationMutation,
} from "@/features/brands/hooks/use-brand-profile-form-mutation";
import { useAuth } from "@/providers/auth-provider";
import type { BrandProfileItemApi } from "@/features/brands/api/types";
import {
  type CreateBrandProfilePayload,
} from "@/features/brands/api/create-brand-profile";
import {
  type UpdateBrandProfilePayload,
} from "@/features/brands/api/update-brand-profile";
import {
  brandCategoryOptionsQueryKey,
  fetchBrandCategoryOptions,
} from "@/features/brands/api/fetch-brand-category-options";
import type {
  BrandCategoryApi,
  BrandProductTypeApi,
} from "@/features/brands/api/brand-category-types";

const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function normalizeOptionalString(raw: string): string | undefined {
  const t = raw.trim();
  return t ? t : undefined;
}

function normalizeOptionalUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export type BrandProfileSetupFormProps = {
  variant: "onboarding" | "settings";
  mode: "create" | "update";
  initialProfile?: BrandProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};

export function BrandProfileSetupForm({
  variant,
  mode,
  initialProfile = null,
  onSuccess,
  onPendingChange,
}: BrandProfileSetupFormProps) {
  const formKey = `${mode}:${initialProfile?.id ?? "new"}`;

  return (
    <BrandProfileSetupFormContent
      key={formKey}
      variant={variant}
      mode={mode}
      initialProfile={initialProfile}
      onSuccess={onSuccess}
      onPendingChange={onPendingChange}
    />
  );
}

function BrandProfileSetupFormContent({
  variant,
  mode,
  initialProfile = null,
  onSuccess,
  onPendingChange,
}: BrandProfileSetupFormProps) {
  const { user } = useAuth();

  const { data: categoryOptionRows = [] } = useQuery({
    queryKey: brandCategoryOptionsQueryKey,
    queryFn: fetchBrandCategoryOptions,
    staleTime: 60 * 60 * 1000,
  });

  const [contactFullName, setContactFullName] = useState(
    initialProfile?.contactFullName ?? user?.name ?? "",
  );
  const [contactEmail, setContactEmail] = useState(
    initialProfile?.contactEmail ?? user?.email ?? "",
  );
  const [contactPhone, setContactPhone] = useState(
    initialProfile?.contactPhone ?? "",
  );
  const [brandName, setBrandName] = useState(
    initialProfile?.brandName ?? "",
  );
  const [brandPronunciation, setBrandPronunciation] = useState(
    initialProfile?.brandPronunciation ?? "",
  );
  const [website, setWebsite] = useState(initialProfile?.website ?? "");
  const [instagramUrl, setInstagramUrl] = useState(
    initialProfile?.instagramUrl ?? "",
  );
  const [productType, setProductType] = useState<"" | BrandProductTypeApi>(
    (initialProfile?.productType as BrandProductTypeApi | null) ?? "",
  );
  const [selectedCategories, setSelectedCategories] = useState<
    BrandCategoryApi[]
  >((initialProfile?.categories as BrandCategoryApi[] | undefined) ?? []);
  const [otherCategoryText, setOtherCategoryText] = useState("");
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoriesDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [prevUserEmail, setPrevUserEmail] = useState(user?.email);
  if (user?.email !== prevUserEmail) {
    setPrevUserEmail(user?.email);
    if (!initialProfile?.contactEmail && user?.email) {
      setContactEmail((prev) => prev || user.email || "");
    }
    if (!initialProfile?.contactFullName && user?.name) {
      setContactFullName((prev) => prev || user.name || "");
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    initialProfile?.logoUrl ?? null,
  );
  const [pendingLogoKey, setPendingLogoKey] = useState<string | null>(
    initialProfile?.logoKey ?? null,
  );
  const [pendingPronunciationAudioKey, setPendingPronunciationAudioKey] =
    useState<string | null>(
      initialProfile?.brandPronunciationAudioKey ?? null,
    );
  const [pronunciationAudioPreviewUrl, setPronunciationAudioPreviewUrl] =
    useState<string | null>(initialProfile?.brandPronunciationAudioUrl ?? null);
  const uploadBrandLogoMutation = useUploadBrandLogoMutation(mode);
  const uploadPronunciationMutation = useUploadBrandPronunciationMutation(mode);
  const submitBrandProfileMutation = useSubmitBrandProfileMutation({
    mode,
    onSuccess,
  });
  const pending = submitBrandProfileMutation.isPending;
  useLayoutEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);
  const uploadingLogo = uploadBrandLogoMutation.isPending;
  const uploadingPronunciation = uploadPronunciationMutation.isPending;

  const title = useMemo(() => {
    if (mode === "update") return "Edit your brand profile";
    if (variant === "settings") return "Add your brand profile";
    return "Set up your brand profile";
  }, [mode, variant]);

  const description = useMemo(() => {
    if (mode === "update") {
      return "Update your brand details and logo.";
    }
    if (variant === "settings") {
      return "Add your brand details and logo.";
    }
    return "Add your brand details so creators know who they’re working with.";
  }, [mode, variant]);

  const toggleCategory = useCallback((value: BrandCategoryApi) => {
    setSelectedCategories((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : [...prev, value],
    );
  }, []);

  const completionSummary = useMemo(() => {
    const checkpoints = [
      Boolean(brandName.trim()),
      Boolean(contactFullName.trim()),
      Boolean(contactEmail.trim()),
      Boolean(contactPhone.trim()),
      Boolean(website.trim()),
      Boolean(logoPreviewUrl || pendingLogoKey),
      selectedCategories.length > 0,
      Boolean(productType),
    ];
    const completed = checkpoints.filter(Boolean).length;
    const total = checkpoints.length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  }, [
    brandName,
    contactFullName,
    contactEmail,
    contactPhone,
    website,
    logoPreviewUrl,
    pendingLogoKey,
    selectedCategories.length,
    productType,
  ]);

  const handleLogoSelected = useCallback(
    async (file: File | null) => {
      if (!file) return;

      if (!LOGO_ACCEPT.split(",").includes(file.type)) {
        toast.error("Use JPEG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        toast.error("Logo must be 8 MB or smaller.");
        return;
      }

      uploadBrandLogoMutation.mutate(file, {
        onSuccess: (result) => {
          if (!result) {
            return;
          }

          setPendingLogoKey(result.key);
          setLogoPreviewUrl(result.cdnUrl);
        },
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      });
    },
    [uploadBrandLogoMutation],
  );

  const clearLogo = useCallback(() => {
    setPendingLogoKey(null);
    setLogoPreviewUrl(null);
  }, []);

  const handlePronunciationBlob = useCallback(
    (blob: Blob) => {
      uploadPronunciationMutation.mutate(blob, {
        onSuccess: (result) => {
          if (!result) return;
          setPendingPronunciationAudioKey(result.key);
          setPronunciationAudioPreviewUrl(result.cdnUrl);
        },
      });
    },
    [uploadPronunciationMutation],
  );

  const clearPronunciationAudio = useCallback(() => {
    setPendingPronunciationAudioKey(null);
    setPronunciationAudioPreviewUrl(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();

      const name = brandName.trim();
      if (!name) {
        toast.error("Brand name is required");
        return;
      }

      if (website.trim() && !normalizeOptionalUrl(website)) {
        toast.error("Website must be a valid http(s) URL");
        return;
      }

      if (instagramUrl.trim() && !normalizeOptionalUrl(instagramUrl)) {
        toast.error("Instagram URL must be a valid http(s) URL");
        return;
      }

      if (mode === "create") {
        const fullName = contactFullName.trim();
        const email = contactEmail.trim();
        const phone = contactPhone.trim();
        if (!fullName) {
          toast.error("Name is required");
          return;
        }
        if (!email) {
          toast.error("Email is required");
          return;
        }
        if (phone.length < 7) {
          toast.error("Please enter a valid mobile number");
          return;
        }

        const payload: CreateBrandProfilePayload = {
          contactFullName: fullName,
          contactEmail: email,
          contactPhone: phone,
          brandName: name,
          ...(normalizeOptionalString(brandPronunciation)
            ? { brandPronunciation: normalizeOptionalString(brandPronunciation) }
            : {}),
          ...(pendingPronunciationAudioKey
            ? { brandPronunciationAudioKey: pendingPronunciationAudioKey }
            : {}),
          ...(pendingLogoKey ? { logoKey: pendingLogoKey } : {}),
          ...(normalizeOptionalUrl(website)
            ? { website: normalizeOptionalUrl(website) }
            : {}),
          ...(normalizeOptionalUrl(instagramUrl)
            ? { instagramUrl: normalizeOptionalUrl(instagramUrl) }
            : {}),
          ...(productType ? { productType } : {}),
          ...(selectedCategories.length
            ? { categories: selectedCategories }
            : {}),
          ...(selectedCategories.includes("OTHER") && otherCategoryText.trim()
            ? { otherCategory: otherCategoryText.trim() }
            : {}),
        };

        submitBrandProfileMutation.mutate({ payload });
        return;
      }

      const payload: UpdateBrandProfilePayload = {
        brandName: name,
        logoKey: pendingLogoKey,
        website: normalizeOptionalUrl(website) ?? null,
        brandPronunciation: brandPronunciation.trim()
          ? brandPronunciation.trim()
          : null,
        brandPronunciationAudioKey: pendingPronunciationAudioKey,
      };

      submitBrandProfileMutation.mutate({ payload });
    },
    [
      mode,
      brandName,
      contactFullName,
      contactEmail,
      contactPhone,
      brandPronunciation,
      pendingLogoKey,
      pendingPronunciationAudioKey,
      website,
      instagramUrl,
      productType,
      selectedCategories,
      otherCategoryText,
      submitBrandProfileMutation,
    ],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Profile completion
              </p>
              <p className="text-xs text-muted-foreground">
                {completionSummary.completed} of {completionSummary.total} brand
                details added
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {completionSummary.percent}%
            </p>
          </div>
          <Progress
            value={completionSummary.percent}
            aria-label="Brand profile completion"
            className="mt-3 h-1"
          />
        </div>
      </header>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        {mode === "create" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="brand-contact-full-name">Name</Label>
                <Input
                  id="brand-contact-full-name"
                  value={contactFullName}
                  onChange={(e) => setContactFullName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  disabled={pending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand-contact-email">Email</Label>
                <Input
                  id="brand-contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  disabled={pending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand-contact-phone">Mobile</Label>
                <Input
                  id="brand-contact-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  disabled={pending}
                />
              </div>
            </div>

          </>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="brand-name">Brand name</Label>
          <Input
            id="brand-name"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="How you appear to creators"
            autoComplete="organization"
            disabled={pending}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="brand-pronunciation">
            Phonetic spelling (optional)
          </Label>
          <Input
            id="brand-pronunciation"
            value={brandPronunciation}
            onChange={(e) => setBrandPronunciation(e.target.value)}
            placeholder="ACK-mee"
            disabled={pending}
          />
        </div>

        <BrandPronunciationAudioField
          disabled={pending}
          uploading={uploadingPronunciation}
          audioUrl={pronunciationAudioPreviewUrl}
          hasRecording={Boolean(
            pendingPronunciationAudioKey && pronunciationAudioPreviewUrl,
          )}
          onRecordingReady={handlePronunciationBlob}
          onRemove={clearPronunciationAudio}
        />

        <div className="grid gap-2">
          <Label htmlFor="brand-website">Brand website (optional)</Label>
          <Input
            id="brand-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://acme.com"
            autoComplete="url"
            inputMode="url"
            disabled={pending}
          />
        </div>

        {mode === "create" ? (
          <div className="grid gap-2">
            <Label htmlFor="brand-instagram">
              Brand Instagram URL (optional)
            </Label>
            <Input
              id="brand-instagram"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/yourbrand"
              autoComplete="url"
              inputMode="url"
              disabled={pending}
            />
          </div>
        ) : null}

        {mode === "create" ? (
          <div className="space-y-2">
            <Label>Categories (optional)</Label>
            <p className="text-xs text-muted-foreground">Select all that apply.</p>
            <div className="relative" ref={dropdownRef}>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={isCategoriesDropdownOpen}
                className="w-full justify-between"
                onClick={() => setIsCategoriesDropdownOpen(!isCategoriesDropdownOpen)}
                disabled={pending}
              >
                {selectedCategories.length > 0
                  ? `${selectedCategories.length} selected`
                  : "Select categories..."}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
              {isCategoriesDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                  <div className="max-h-60 overflow-y-auto p-1">
                    {categoryOptionRows.map((opt) => (
                      <div key={opt.value} className="flex flex-col">
                        <label
                          className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={selectedCategories.includes(
                              opt.value as BrandCategoryApi,
                            )}
                            onCheckedChange={() =>
                              toggleCategory(opt.value as BrandCategoryApi)
                            }
                            disabled={pending}
                          />
                          <span>{opt.label}</span>
                        </label>
                        {opt.value === "OTHER" && selectedCategories.includes("OTHER") && (
                          <div className="px-2 pb-2 pt-1 animate-in fade-in slide-in-from-top-1">
                            <Input
                              id="other-category-input"
                              value={otherCategoryText}
                              onChange={(e) => setOtherCategoryText(e.target.value)}
                              placeholder="Enter custom category"
                              disabled={pending}
                              className="h-8 text-xs"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {mode === "create" ? (
          <fieldset className="space-y-2 rounded-xl border border-border/60 p-4">
            <legend className="text-sm font-medium text-foreground px-1">
              Product type (optional)
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {(
                [
                  ["PHYSICAL", "Physical"],
                  ["DIGITAL", "Digital"],
                  ["BOTH", "Both"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="productType"
                    value={value}
                    checked={productType === value}
                    onChange={() => setProductType(value)}
                    disabled={pending}
                    className="size-4 accent-primary dark:scheme-dark"
                  />
                  {label}
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="productType"
                  value=""
                  checked={productType === ""}
                  onChange={() => setProductType("")}
                  disabled={pending}
                  className="size-4 accent-primary dark:scheme-dark"
                />
                Prefer not to say
              </label>
            </div>
          </fieldset>
        ) : null}

        <BrandLogoField
          previewUrl={logoPreviewUrl}
          accept={LOGO_ACCEPT}
          disabled={pending || uploadingLogo}
          uploading={uploadingLogo}
          fileInputRef={fileInputRef}
          onSelectFile={(file) => void handleLogoSelected(file)}
          onRemove={clearLogo}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            disabled={pending || uploadingLogo || uploadingPronunciation}
          >
            {pending ? (
              variant === "onboarding" ? (
                mode === "update" ? (
                  "Saving…"
                ) : (
                  "Creating…"
                )
              ) : (
                <>
                  <Spinner className="size-4" aria-hidden />
                  {mode === "update" ? "Saving…" : "Creating…"}
                </>
              )
            ) : mode === "update" ? (
              "Save changes"
            ) : (
              "Create profile"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
