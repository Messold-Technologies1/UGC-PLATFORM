"use client";

import { motion, type Variants } from "framer-motion";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { BrandLogoField } from "@/features/brands/components/brand-logo-field";
import { BrandPronunciationAudioField } from "@/features/brands/components/brand-pronunciation-audio-field";
import { PhoneVerificationField } from "@/features/auth/components/phone-verification-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitBrandProfileMutation } from "@/features/brands/hooks/use-brand-profile-form-mutation";
import { useAuth } from "@/providers/auth-provider";
import type { BrandProfileItemApi } from "@/features/brands/api/types";
import type { UpdateBrandProfilePayload } from "@/features/brands/api/update-brand-profile";
import {
  brandCategoryOptionsQueryKey,
  fetchBrandCategoryOptions,
} from "@/features/brands/api/fetch-brand-category-options";
import type { BrandCategoryApi } from "@/features/brands/api/brand-category-types";


import {
  brandProfileUpdateSchema,
  brandProductTypeValues,
  normalizeOptionalString,
  normalizeOptionalUrl,
  LOGO_ACCEPT,
  type BrandProfileUpdateFormValues,
} from "@/features/brands/hooks/brand-profile-form-utils";
import { useBrandLogoForm } from "@/features/brands/hooks/use-brand-logo-form";
import { useBrandPronunciationForm } from "@/features/brands/hooks/use-brand-pronunciation-form";
import { normalizePhoneForOtp } from "@/features/auth/components/phone-verification-field";



export type BrandProfileUpdateFormProps = {
  variant: "onboarding" | "settings";
  mode: "update";
  initialProfile?: BrandProfileItemApi | null;
  onSuccess: () => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
};



export function BrandProfileUpdateForm({
  variant,
  mode,
  initialProfile = null,
  onSuccess,
  onPendingChange,
}: BrandProfileUpdateFormProps) {
  const formKey = `${mode}:${initialProfile?.id ?? "new"}`;

  return (
    <BrandProfileUpdateFormContent
      key={formKey}
      variant={variant}
      mode={mode}
      initialProfile={initialProfile}
      onSuccess={onSuccess}
      onPendingChange={onPendingChange}
    />
  );
}



function BrandProfileUpdateFormContent({
  variant,
  mode,
  initialProfile = null,
  onSuccess,
  onPendingChange,
}: BrandProfileUpdateFormProps) {
  const { user, refreshUser } = useAuth();

  const { data: categoryOptionRows = [] } = useQuery({
    queryKey: brandCategoryOptionsQueryKey,
    queryFn: fetchBrandCategoryOptions,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const defaultFormValues = useMemo<BrandProfileUpdateFormValues>(
    () => ({
      contactFullName: initialProfile?.contactFullName ?? user?.name ?? "",
      contactEmail: initialProfile?.contactEmail ?? user?.email ?? "",
      contactPhone: initialProfile?.contactPhone ?? "",
      brandName: initialProfile?.brandName ?? "",
      brandPronunciation: initialProfile?.brandPronunciation ?? "",
      website: initialProfile?.website ?? "",
      instagramUrl: initialProfile?.instagramUrl ?? "",
      productType: initialProfile?.productType ?? "",
      categories: initialProfile?.categories ?? [],
      otherCategoryText: initialProfile?.otherCategoryLabel ?? "",
    }),
    [initialProfile, user?.email, user?.name],
  );

  const form = useForm<BrandProfileUpdateFormValues>({
    resolver: zodResolver(brandProfileUpdateSchema),
    defaultValues: defaultFormValues,
  });

  const brandName = useWatch({ control: form.control, name: "brandName" }) ?? "";
  const contactFullName = useWatch({ control: form.control, name: "contactFullName" }) ?? "";
  const contactEmail = useWatch({ control: form.control, name: "contactEmail" }) ?? "";
  const contactPhone = useWatch({ control: form.control, name: "contactPhone" }) ?? "";
  const website = useWatch({ control: form.control, name: "website" }) ?? "";
  const selectedCategories = useWatch({ control: form.control, name: "categories" }) ?? [];
  const productType = useWatch({ control: form.control, name: "productType" }) ?? "";

  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  
  const [phoneVerified, setPhoneVerified] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoriesDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!initialProfile?.contactEmail && user?.email && !form.getValues("contactEmail")) {
      form.setValue("contactEmail", user.email);
    }
    if (!initialProfile?.contactFullName && user?.name && !form.getValues("contactFullName")) {
      form.setValue("contactFullName", user.name);
    }
  }, [form, initialProfile?.contactEmail, initialProfile?.contactFullName, user?.email, user?.name]);

  
  const logo = useBrandLogoForm({ mode, initialProfile });
  const pronunciation = useBrandPronunciationForm({ mode, initialProfile });

  const submitBrandProfileMutation = useSubmitBrandProfileMutation({
    mode,
    onSuccess,
  });

  const pending = submitBrandProfileMutation.isPending;
  useLayoutEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

  const title = "Edit your brand profile";
  const description = "Update your brand details and logo.";

  const toggleCategory = useCallback(
    (value: BrandCategoryApi) => {
      const current = form.getValues("categories");
      form.setValue(
        "categories",
        current.includes(value)
          ? current.filter((category) => category !== value)
          : [...current, value],
        {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        },
      );
    },
    [form],
  );

  const completionSummary = useMemo(() => {
    const checkpoints = [
      Boolean(brandName.trim()),
      Boolean(contactFullName.trim()),
      Boolean(contactEmail.trim()),
      Boolean(contactPhone.trim()),
      Boolean(website.trim()),
      Boolean(logo.logoPreviewUrl || logo.pendingLogoKey),
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
    logo.logoPreviewUrl,
    logo.pendingLogoKey,
    selectedCategories.length,
    productType,
  ]);

  const handleSubmit = useCallback(
    (values: BrandProfileUpdateFormValues) => {
      const name = values.brandName.trim();
      if (!name) {
        toast.error("Brand name is required");
        return;
      }

      const fullName = values.contactFullName.trim();
      const email = values.contactEmail.trim();
      const phone = normalizePhoneForOtp(values.contactPhone);
      const initialPhone = normalizePhoneForOtp(initialProfile?.contactPhone ?? "");
      const phoneChanged = phone !== initialPhone;

      if (!fullName) {
        form.setError("contactFullName", { message: "Name is required" });
        toast.error("Name is required");
        return;
      }
      if (!email) {
        form.setError("contactEmail", { message: "Email is required" });
        toast.error("Email is required");
        return;
      }
      if (phoneChanged && !phoneVerified) {
        const message = "Verify your new mobile number before saving changes.";
        form.setError("contactPhone", { message });
        toast.error(message);
        return;
      }
      if (values.categories.includes("OTHER") && !values.otherCategoryText.trim()) {
        const message = "Enter a custom category for Other.";
        form.setError("otherCategoryText", { message });
        toast.error(message);
        return;
      }

      const payload: UpdateBrandProfilePayload = {
        brandName: name,
        contactFullName: fullName,
        contactEmail: email,
        contactPhone: phone,
        logoKey: logo.pendingLogoKey,
        website: normalizeOptionalUrl(values.website) ?? null,
        instagramUrl: normalizeOptionalUrl(values.instagramUrl) ?? null,
        productType: values.productType || null,
        categories: values.categories,
        otherCategoryLabel: values.categories.includes("OTHER")
          ? values.otherCategoryText.trim()
          : null,
        brandPronunciation: values.brandPronunciation.trim()
          ? values.brandPronunciation.trim()
          : null,
        brandPronunciationAudioKey: pronunciation.pendingPronunciationAudioKey,
      };

      submitBrandProfileMutation.mutate({ payload });
    },
    [form, initialProfile?.contactPhone, logo.pendingLogoKey, phoneVerified, pronunciation.pendingPronunciationAudioKey, submitBrandProfileMutation],
  );

 
  const inputClass = "h-10";
  const shellClass =
    variant === "onboarding"
      ? "flex flex-col bg-transparent p-0"
      : "flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8";

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <motion.form
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
      className={shellClass}
    >
      <motion.div variants={itemVariants} className="mb-8 space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
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
            aria-label="Brand profile completion"
            className="mt-3 h-1"
          />
        </div>
      </motion.div>

      <div className="flex flex-col gap-8">
        <motion.section variants={itemVariants} className="space-y-4 rounded-xl border border-border bg-muted/10 p-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Brand Identity
            </h3>
            <p className="text-xs text-muted-foreground">
              This is how your brand appears across the platform.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand name *</Label>
                <Input
                  id="brandName"
                  className={inputClass}
                  disabled={pending}
                  {...form.register("brandName")}
                  placeholder="Acme Corp"
                  autoComplete="organization"
                />
                {form.formState.errors.brandName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.brandName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandPronunciation">Brand pronunciation</Label>
                <Input
                  id="brandPronunciation"
                  className={inputClass}
                  disabled={pending}
                  {...form.register("brandPronunciation")}
                  placeholder="e.g. Ack-mee"
                />
              </div>
              <div className="space-y-2">
                <Label>Pronunciation audio</Label>
                <BrandPronunciationAudioField
                  audioUrl={pronunciation.pronunciationAudioPreviewUrl}
                  disabled={pronunciation.uploadingPronunciation || pending}
                  uploading={pronunciation.uploadingPronunciation}
                  hasRecording={Boolean(pronunciation.pendingPronunciationAudioKey) || Boolean(pronunciation.pronunciationAudioPreviewUrl)}
                  onRecordingReady={pronunciation.handlePronunciationBlob}
                  onRemove={pronunciation.clearPronunciationAudio}
                />
              </div>
            </div>
            <div className="space-y-2 sm:w-[140px]">
              <Label>Brand logo</Label>
              <BrandLogoField
                previewUrl={logo.logoPreviewUrl}
                accept={LOGO_ACCEPT}
                disabled={logo.uploadingLogo || pending}
                uploading={logo.uploadingLogo}
                fileInputRef={logo.fileInputRef}
                onSelectFile={(file) => void logo.handleLogoSelected(file)}
                onRemove={logo.clearLogo}
              />
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="space-y-4 rounded-xl border border-border bg-muted/10 p-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Contact Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Internal details for platform communications.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactFullName">Contact name *</Label>
              <Input
                id="contactFullName"
                className={inputClass}
                disabled={pending}
                {...form.register("contactFullName")}
                autoComplete="name"
              />
              {form.formState.errors.contactFullName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.contactFullName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact email *</Label>
              <Input
                id="contactEmail"
                type="email"
                className={inputClass}
                disabled={pending}
                {...form.register("contactEmail")}
                autoComplete="email"
              />
              {form.formState.errors.contactEmail && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.contactEmail.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2 max-w-sm">
            <Label>Mobile number</Label>
            <PhoneVerificationField
              idPrefix="brand-profile"
              disabled={pending}
              onVerifiedChange={setPhoneVerified}
              onVerified={() => void refreshUser()}
            />
            {form.formState.errors.contactPhone && (
              <p className="text-xs text-destructive">
                {form.formState.errors.contactPhone.message}
              </p>
            )}
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="space-y-4 rounded-xl border border-border bg-muted/10 p-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Online Presence
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                className={inputClass}
                disabled={pending}
                {...form.register("website")}
                placeholder="https://acmecorp.com"
                inputMode="url"
              />
              {form.formState.errors.website && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.website.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagramUrl">Instagram URL</Label>
              <Input
                id="instagramUrl"
                className={inputClass}
                disabled={pending}
                {...form.register("instagramUrl")}
                placeholder="https://instagram.com/acmecorp"
                inputMode="url"
              />
              {form.formState.errors.instagramUrl && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.instagramUrl.message}
                </p>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="space-y-4 rounded-xl border border-border bg-muted/10 p-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Product Details
            </h3>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-base font-medium">Product type</Label>
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                {brandProductTypeValues.map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded text-sm transition-colors hover:bg-muted/50 p-1"
                  >
                    <Checkbox
                      disabled={pending}
                      checked={productType === value}
                      onCheckedChange={() =>
                        form.setValue(
                          "productType",
                          productType === value ? "" : value,
                          { shouldDirty: true, shouldTouch: true },
                        )
                      }
                      className="rounded-full"
                    />
                    <span className="capitalize">{value.toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3" ref={dropdownRef}>
              <Label className="text-base font-medium">Categories</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between border-border bg-background hover:bg-background"
                  disabled={pending}
                  onClick={() => setIsCategoriesDropdownOpen(!isCategoriesDropdownOpen)}
                >
                  <span className="truncate">
                    {selectedCategories.length === 0
                      ? "Select categories"
                      : `${selectedCategories.length} category${
                          selectedCategories.length === 1 ? "" : "s"
                        } selected`}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 opacity-50 transition-transform ${
                      isCategoriesDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
                {isCategoriesDropdownOpen && (
                  <div className="absolute top-[calc(100%+4px)] z-50 max-h-[280px] w-full overflow-y-auto rounded-md border border-border bg-popover p-2 shadow-md">
                    <div className="flex flex-col gap-1">
                      {categoryOptionRows.map((row) => (
                        <label
                          key={row.value}
                          className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <Checkbox
                            className="mt-0.5"
                            disabled={pending}
                            checked={selectedCategories.includes(row.value as BrandCategoryApi)}
                            onCheckedChange={() => toggleCategory(row.value as BrandCategoryApi)}
                          />
                          <span>{row.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {selectedCategories.includes("OTHER") && (
                <div className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3">
                  <Label htmlFor="otherCategoryText">Specify other category</Label>
                  <Input
                    id="otherCategoryText"
                    className={inputClass}
                    disabled={pending}
                    {...form.register("otherCategoryText")}
                    placeholder="E.g. Custom woodwork"
                  />
                  {form.formState.errors.otherCategoryText && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.otherCategoryText.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.section>
      </div>

      <motion.div variants={itemVariants} className="mt-8 flex justify-end">
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={pending || logo.uploadingLogo || pronunciation.uploadingPronunciation}
        >
          {pending || logo.uploadingLogo || pronunciation.uploadingPronunciation ? (
            <>
              <Spinner className="mr-2 h-4 w-4" aria-hidden />
              Saving...
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </motion.div>
    </motion.form>
  );
}
