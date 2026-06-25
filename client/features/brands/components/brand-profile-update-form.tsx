"use client";
import "./brand-profile-edit.css";

import { motion, type Variants } from "framer-motion";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, LayoutGrid, User as UserIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { BrandLogoField } from "@/features/brands/components/brand-logo-field";
import { BrandPronunciationAudioField } from "@/features/brands/components/brand-pronunciation-audio-field";
import { PhoneVerificationField } from "@/features/auth/components/phone-verification-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  normalizeOptionalUrl,
  LOGO_ACCEPT,
  type BrandProfileUpdateFormValues,
} from "@/features/brands/hooks/brand-profile-form-utils";
import { useBrandLogoForm } from "@/features/brands/hooks/use-brand-logo-form";
import { useBrandPronunciationForm } from "@/features/brands/hooks/use-brand-pronunciation-form";
import { normalizePhoneForOtp } from "@/features/auth/components/phone-verification-field";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "brand", label: "Brand profile", icon: LayoutGrid },
  { id: "contact", label: "Primary contact", icon: UserIcon },
];

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

  const productType = useWatch({ control: form.control, name: "productType" }) ?? "";
  const selectedCategories = useWatch({ control: form.control, name: "categories" }) ?? [];
  const brandName = useWatch({ control: form.control, name: "brandName" }) ?? "";

  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [activeSection, setActiveSection] = useState(NAV_ITEMS[0].id);
  const [isDirty, setIsDirty] = useState(false);

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
  }, [form, initialProfile, user]);

  const { isDirty: isFormDirty } = form.formState;
  
  useEffect(() => {
    setIsDirty(isFormDirty);
  }, [isFormDirty]);

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

  const logo = useBrandLogoForm({ mode, initialProfile });
  const pronunciation = useBrandPronunciationForm({ mode, initialProfile });

  const submitBrandProfileMutation = useSubmitBrandProfileMutation({
    mode,
    onSuccess: async () => {
      setIsDirty(false);
      await onSuccess();
    },
  });

  const pending = submitBrandProfileMutation.isPending;
  useLayoutEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

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
      const initialPhone = normalizePhoneForOtp(
        initialProfile?.contactPhone ?? "",
      );
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
      if (
        values.categories.includes("OTHER") &&
        !values.otherCategoryText.trim()
      ) {
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
    [
      form,
      initialProfile?.contactPhone,
      logo.pendingLogoKey,
      phoneVerified,
      pronunciation.pendingPronunciationAudioKey,
      submitBrandProfileMutation,
    ],
  );

  const handleDiscard = useCallback(() => {
    form.reset(defaultFormValues);
    setIsDirty(false);
    logo.clearLogo();
    pronunciation.clearPronunciationAudio();
    toast.info("Changes discarded");
  }, [form, defaultFormValues, logo, pronunciation]);

  const isSettings = variant === "settings";

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const contentCardsNode = (
    <>
      <motion.section variants={itemVariants} className="pe-card" id="pe-section-brand" style={{ position: "relative", zIndex: isCategoriesDropdownOpen ? 30 : 1 }}>
        <div className="pe-card-head">
          <h3>
            {isSettings && (
              <div className="pe-card-icon">
                <LayoutGrid size={16} />
              </div>
            )}
            Brand profile
          </h3>
          <p>This is how your brand appears across the platform.</p>
        </div>
        <div className="pe-card-body">
          <div className="pe-grid pe-grid-2">
            <div className="pe-field">
              <BrandLogoField
                previewUrl={logo.logoPreviewUrl}
                accept={LOGO_ACCEPT}
                disabled={logo.uploadingLogo || pending}
                uploading={logo.uploadingLogo}
                fileInputRef={logo.fileInputRef}
                onSelectFile={(file) => void logo.handleLogoSelected(file)}
                onRemove={logo.clearLogo}
                brandName={brandName}
              />
            </div>
          </div>
          
          <div className="pe-grid pe-grid-2 mt-4">
            <div className="pe-field">
              <label htmlFor="brandName">Brand name <span className="pe-required">*</span></label>
              <div className="pe-input-wrap">
                <input
                  id="brandName"
                  className="pe-input"
                  disabled={pending}
                  {...form.register("brandName")}
                  placeholder="Acme Corp"
                  autoComplete="organization"
                />
              </div>
              {form.formState.errors.brandName && (
                <span className="pe-help text-destructive">
                  {form.formState.errors.brandName.message}
                </span>
              )}
            </div>
            
            <div className="pe-field">
              <label htmlFor="brandPronunciation">Brand pronunciation</label>
              <div className="pe-input-wrap">
                <input
                  id="brandPronunciation"
                  className="pe-input"
                  disabled={pending}
                  {...form.register("brandPronunciation")}
                  placeholder="e.g. Ack-mee"
                />
              </div>
            </div>
          </div>

          <div className="pe-field mt-4">
            <label>Pronunciation audio</label>
            <BrandPronunciationAudioField
              audioUrl={pronunciation.pronunciationAudioPreviewUrl}
              disabled={pronunciation.uploadingPronunciation || pending}
              uploading={pronunciation.uploadingPronunciation}
              hasRecording={
                Boolean(pronunciation.pendingPronunciationAudioKey) ||
                Boolean(pronunciation.pronunciationAudioPreviewUrl)
              }
              onRecordingReady={pronunciation.handlePronunciationBlob}
              onRemove={pronunciation.clearPronunciationAudio}
            />
          </div>
          
          <div className="pe-grid pe-grid-2 mt-4">
            <div className="pe-field">
              <label htmlFor="website">Website</label>
              <div className="pe-input-wrap">
                <input
                  id="website"
                  className="pe-input"
                  disabled={pending}
                  {...form.register("website")}
                  placeholder="https://acmecorp.com"
                  inputMode="url"
                />
              </div>
              {form.formState.errors.website && (
                <span className="pe-help text-destructive">
                  {form.formState.errors.website.message}
                </span>
              )}
            </div>
            <div className="pe-field">
              <label htmlFor="instagramUrl">Instagram URL</label>
              <div className="pe-input-wrap">
                <input
                  id="instagramUrl"
                  className="pe-input"
                  disabled={pending}
                  {...form.register("instagramUrl")}
                  placeholder="https://instagram.com/acmecorp"
                  inputMode="url"
                />
              </div>
              {form.formState.errors.instagramUrl && (
                <span className="pe-help text-destructive">
                  {form.formState.errors.instagramUrl.message}
                </span>
              )}
            </div>
          </div>

          <div className="pe-grid pe-grid-2 mt-4">
            <div className="pe-field">
              <label>Product type</label>
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3 mt-1">
                {brandProductTypeValues.map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded text-[13.5px] transition-colors hover:bg-muted/50 p-1 font-medium"
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
                      className="rounded-full w-4 h-4"
                    />
                    <span className="capitalize">{value.toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="pe-field" ref={dropdownRef}>
              <label>Categories</label>
              <div className="relative mt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between border-[1.4px] border-border h-[42px] bg-card hover:bg-muted/50 rounded-[10px] px-3 font-normal text-[13.5px] text-foreground"
                  disabled={pending}
                  onClick={() =>
                    setIsCategoriesDropdownOpen(!isCategoriesDropdownOpen)
                  }
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
                  <div className="absolute top-[calc(100%+4px)] z-50 max-h-[280px] w-full overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-md">
                    <div className="flex flex-col gap-1">
                      {categoryOptionRows.map((row) => (
                        <label
                          key={row.value}
                          className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-[13.5px] hover:bg-accent font-medium text-foreground transition-colors"
                        >
                          <Checkbox
                            className="mt-0.5"
                            disabled={pending}
                            checked={selectedCategories.includes(
                              row.value as BrandCategoryApi,
                            )}
                            onCheckedChange={() =>
                              toggleCategory(row.value as BrandCategoryApi)
                            }
                          />
                          <span>{row.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedCategories.includes("OTHER") && (
                <div className="mt-3">
                  <label htmlFor="otherCategoryText" className="text-[12.5px] font-bold block mb-1">
                    Specify other category
                  </label>
                  <div className="pe-input-wrap">
                    <input
                      id="otherCategoryText"
                      className="pe-input"
                      disabled={pending}
                      {...form.register("otherCategoryText")}
                      placeholder="E.g. Custom woodwork"
                    />
                  </div>
                  {form.formState.errors.otherCategoryText && (
                    <span className="pe-help text-destructive">
                      {form.formState.errors.otherCategoryText.message}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="pe-card" id="pe-section-contact">
        <div className="pe-card-head">
          <h3>
            {isSettings && (
              <div className="pe-card-icon">
                <UserIcon size={16} />
              </div>
            )}
            Primary contact
          </h3>
          <p>Internal details for platform communications.</p>
        </div>
        <div className="pe-card-body">
          <div className="pe-grid pe-grid-2">
            <div className="pe-field">
              <label htmlFor="contactFullName">Contact name <span className="pe-required">*</span></label>
              <div className="pe-input-wrap">
                <input
                  id="contactFullName"
                  className="pe-input"
                  disabled={pending}
                  {...form.register("contactFullName")}
                  autoComplete="name"
                />
              </div>
              {form.formState.errors.contactFullName && (
                <span className="pe-help text-destructive">
                  {form.formState.errors.contactFullName.message}
                </span>
              )}
            </div>
            <div className="pe-field">
              <label htmlFor="contactEmail">Contact email <span className="pe-required">*</span></label>
              <div className="pe-input-wrap">
                <input
                  id="contactEmail"
                  type="email"
                  className="pe-input"
                  disabled={pending}
                  {...form.register("contactEmail")}
                  autoComplete="email"
                />
              </div>
              {form.formState.errors.contactEmail && (
                <span className="pe-help text-destructive">
                  {form.formState.errors.contactEmail.message}
                </span>
              )}
            </div>
          </div>
          
          <div className="pe-field max-w-sm mt-4">
            <label>Mobile number</label>
            <PhoneVerificationField
              idPrefix="brand-profile"
              disabled={pending}
              onVerifiedChange={setPhoneVerified}
              onVerified={() => void refreshUser()}
            />
            {form.formState.errors.contactPhone && (
              <span className="pe-help text-destructive mt-1">
                {form.formState.errors.contactPhone.message}
              </span>
            )}
          </div>
        </div>
      </motion.section>
    </>
  );

  return (
    <div className={cn("pe-scope", !isSettings && "pe-onboarding")}>
      <motion.form
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
        className="pe-form"
      >
        {isSettings ? (
          <div className="pe-shell">
            <nav className="pe-nav" data-tour="brand-profile-edit-nav">
              {NAV_ITEMS.map((item) => {
                const IconCmp = item.icon;
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
                  </button>
                );
              })}
            </nav>

            <nav className="pe-nav-mobile" aria-label="Profile sections">
              {NAV_ITEMS.map((item) => {
                const IconCmp = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="pe-nav-mobile-link"
                    data-active={activeSection === item.id}
                    onClick={() => scrollToSection(item.id)}
                  >
                    <IconCmp size={14} className="mr-1" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="pe-content flex flex-col gap-8">
              {contentCardsNode}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {contentCardsNode}
            <motion.div variants={itemVariants} className="mt-8 flex justify-end">
              <Button type="submit" className="w-full sm:w-auto" disabled={pending || logo.uploadingLogo || pronunciation.uploadingPronunciation}>
                {pending || logo.uploadingLogo || pronunciation.uploadingPronunciation ? (
                  <><Spinner className="mr-2 h-4 w-4" aria-hidden />Saving...</>
                ) : ("Save changes")}
              </Button>
            </motion.div>
          </div>
        )}

        {isSettings && (
          <div className="pe-savebar" data-visible={isDirty}>
            <div className="pe-savebar-inner">
              <div className="pe-savebar-dot" />
              <div className="pe-savebar-msg">You have unsaved changes</div>
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
                  disabled={pending || logo.uploadingLogo || pronunciation.uploadingPronunciation}
                >
                  {pending ? (
                    <Spinner className="h-4 w-4" aria-hidden />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.form>
    </div>
  );
}
