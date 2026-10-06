"use client";

import "@/features/brands/components/brand-profile-edit.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { motion, type Variants } from "framer-motion";
import { Building2, LayoutGrid, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { BrandLogoField } from "@/features/brands/components/brand-logo-field";
import {
  normalizePhoneForOtp,
  PhoneVerificationField,
} from "@/features/auth/components/phone-verification-field";
import type { AgencyProfile } from "@/features/agency/api/fetch-agency-profile-me";
import { agencyProfileMeQueryKey } from "@/features/agency/api/fetch-agency-profile-me";
import { updateAgencyProfile } from "@/features/agency/api/update-agency-profile";
import { presignAgencyLogoUpload } from "@/features/agency/api/presign-agency-logo-upload";
import { putFileToPresignedUrl } from "@/features/brands/api/presign-brand-logo-upload";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_ACCEPT = "image/jpeg,image/png,image/webp";
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const NAV_ITEMS = [
  { id: "agency", label: "Agency profile", icon: LayoutGrid },
  { id: "contact", label: "Primary contact", icon: UserIcon },
] as const;

function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your agency name").max(200),
  contactFullName: z.string().trim().min(2, "Enter a contact name").max(200),
  contactPhone: z.string().optional(),
  website: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) return true;
      try {
        const url = new URL(normalizeWebsite(value));
        return Boolean(url.hostname.includes("."));
      } catch {
        return false;
      }
    }, "Enter a valid website URL"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function AgencyProfileSettingsForm({
  profile,
}: Readonly<{
  profile: AgencyProfile;
}>) {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    profile.logoUrl,
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof NAV_ITEMS)[number]["id"]>(
    NAV_ITEMS[0].id,
  );

  const defaultFormValues = useMemo<ProfileFormData>(
    () => ({
      name: profile.name,
      contactFullName: profile.contactFullName,
      contactPhone: profile.contactPhone ?? "",
      website: profile.website ?? "",
    }),
    [profile],
  );

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultFormValues,
  });

  const agencyName = useWatch({ control: form.control, name: "name" }) ?? "";
  const { isDirty: isFormDirty } = form.formState;
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(isFormDirty || Boolean(logoFile) || removeLogo);
  }, [isFormDirty, logoFile, removeLogo]);

  useEffect(() => {
    function onScroll() {
      const offset = 120;
      let current: (typeof NAV_ITEMS)[number]["id"] = NAV_ITEMS[0].id;
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
  }, []);

  function scrollToSection(id: string) {
    const el = document.getElementById(`pe-section-${id}`);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 76,
        behavior: "smooth",
      });
    }
  }

  const mutation = useMutation({
    mutationFn: updateAgencyProfile,
    onSuccess: (updated) => {
      toast.success("Agency profile updated");
      queryClient.setQueryData(agencyProfileMeQueryKey, updated);
      setLogoFile(null);
      setRemoveLogo(false);
      setLogoPreviewUrl(updated.logoUrl);
      form.reset({
        name: updated.name,
        contactFullName: updated.contactFullName,
        contactPhone: updated.contactPhone ?? "",
        website: updated.website ?? "",
      });
      setPhoneVerified(false);
      setIsDirty(false);
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? error.response?.data?.message
        : null;
      toast.error(
        typeof message === "string" && message.trim()
          ? message
          : "Could not update agency profile. Try again.",
      );
    },
  });

  const pending = mutation.isPending || uploadingLogo;

  function clearLogo() {
    setLogoFile(null);
    setRemoveLogo(true);
    setLogoPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleLogoSelected(file: File | null) {
    if (!file) {
      clearLogo();
      return;
    }
    if (
      !ACCEPTED_LOGO_TYPES.includes(
        file.type as (typeof ACCEPTED_LOGO_TYPES)[number],
      )
    ) {
      toast.error("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo must be 5 MB or smaller.");
      return;
    }
    setRemoveLogo(false);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }

  function handleDiscard() {
    form.reset(defaultFormValues);
    setLogoFile(null);
    setRemoveLogo(false);
    setLogoPreviewUrl(profile.logoUrl);
    setPhoneVerified(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsDirty(false);
    toast.info("Changes discarded");
  }

  async function onSubmit(values: ProfileFormData) {
    if (pending) return;

    const phone = normalizePhoneForOtp(values.contactPhone ?? "");
    const initialPhone = normalizePhoneForOtp(profile.contactPhone ?? "");
    const phoneChanged = phone !== initialPhone;

    if (phoneChanged && phone && !phoneVerified) {
      const message = "Verify your new mobile number before saving changes.";
      form.setError("contactPhone", { message });
      toast.error(message);
      return;
    }

    setUploadingLogo(true);
    try {
      let logoKey: string | null | undefined = undefined;
      if (removeLogo) {
        logoKey = null;
      } else if (logoFile) {
        const presign = await presignAgencyLogoUpload({
          contentType: logoFile.type,
          contentLength: logoFile.size,
        });
        await putFileToPresignedUrl(logoFile, presign);
        logoKey = presign.key;
      }

      await mutation.mutateAsync({
        name: values.name.trim(),
        contactFullName: values.contactFullName.trim(),
        contactPhone: phone || null,
        website: values.website?.trim()
          ? normalizeWebsite(values.website)
          : null,
        ...(logoKey !== undefined ? { logoKey } : {}),
      });
    } catch (error) {
      if (!mutation.isError) {
        const message = isAxiosError(error)
          ? error.response?.data?.message
          : null;
        toast.error(
          typeof message === "string" && message.trim()
            ? message
            : "Could not upload logo. Try again.",
        );
      }
    } finally {
      setUploadingLogo(false);
    }
  }

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

  return (
    <div className={cn("pe-scope")}>
      <motion.form
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="pe-form"
      >
        <div className="pe-shell">
          <nav className="pe-nav" data-tour="agency-profile-edit-nav">
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
            <motion.section
              variants={itemVariants}
              className="pe-card"
              id="pe-section-agency"
            >
              <div className="pe-card-head">
                <h3>
                  <div className="pe-card-icon">
                    <LayoutGrid size={16} />
                  </div>
                  Agency profile
                </h3>
                <p>This is how your agency appears to creators on orders.</p>
              </div>
              <div className="pe-card-body">
                <div className="pe-grid pe-grid-2">
                  <div className="pe-field">
                    <BrandLogoField
                      previewUrl={removeLogo ? null : logoPreviewUrl}
                      accept={LOGO_ACCEPT}
                      disabled={pending}
                      uploading={uploadingLogo}
                      fileInputRef={fileInputRef}
                      onSelectFile={(file) => handleLogoSelected(file)}
                      onRemove={clearLogo}
                      brandName={agencyName || "Agency"}
                    />
                  </div>
                </div>

                <div className="pe-grid pe-grid-2 mt-4">
                  <div className="pe-field">
                    <label htmlFor="agencyName">
                      Agency name <span className="pe-required">*</span>
                    </label>
                    <div className="pe-input-wrap">
                      <input
                        id="agencyName"
                        className="pe-input"
                        disabled={pending}
                        {...form.register("name")}
                        placeholder="Northstar Media"
                        autoComplete="organization"
                      />
                    </div>
                    {form.formState.errors.name ? (
                      <span className="pe-help text-destructive">
                        {form.formState.errors.name.message}
                      </span>
                    ) : null}
                  </div>

                  <div className="pe-field">
                    <label htmlFor="agencyWebsite">Website</label>
                    <div className="pe-input-wrap">
                      <input
                        id="agencyWebsite"
                        className="pe-input"
                        disabled={pending}
                        {...form.register("website")}
                        placeholder="https://youragency.com"
                        inputMode="url"
                      />
                    </div>
                    {form.formState.errors.website ? (
                      <span className="pe-help text-destructive">
                        {form.formState.errors.website.message}
                      </span>
                    ) : null}
                  </div>
                </div>

                {profile.brandNames.length > 0 ? (
                  <div className="pe-field mt-4">
                    <label>Client brand names</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.brandNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[12.5px] font-semibold text-foreground"
                        >
                          <Building2 className="size-3 text-muted-foreground" />
                          {name}
                        </span>
                      ))}
                    </div>
                    <span className="pe-help">
                      Collected automatically from briefs you submit.
                    </span>
                  </div>
                ) : null}
              </div>
            </motion.section>

            <motion.section
              variants={itemVariants}
              className="pe-card"
              id="pe-section-contact"
            >
              <div className="pe-card-head">
                <h3>
                  <div className="pe-card-icon">
                    <UserIcon size={16} />
                  </div>
                  Primary contact
                </h3>
                <p>Internal details for platform communications.</p>
              </div>
              <div className="pe-card-body">
                <div className="pe-field mb-4 max-w-xl">
                  <label htmlFor="accountEmail">Account email</label>
                  <div className="pe-input-wrap">
                    <input
                      id="accountEmail"
                      type="email"
                      className="pe-input"
                      value={user?.email ?? profile.contactEmail}
                      disabled
                      readOnly
                      autoComplete="username"
                    />
                  </div>
                  <span className="pe-help">
                    Login email from signup. Contact details below can be
                    changed anytime.
                  </span>
                </div>

                <div className="pe-grid pe-grid-2">
                  <div className="pe-field">
                    <label htmlFor="contactFullName">
                      Contact name <span className="pe-required">*</span>
                    </label>
                    <div className="pe-input-wrap">
                      <input
                        id="contactFullName"
                        className="pe-input"
                        disabled={pending}
                        {...form.register("contactFullName")}
                        autoComplete="name"
                      />
                    </div>
                    {form.formState.errors.contactFullName ? (
                      <span className="pe-help text-destructive">
                        {form.formState.errors.contactFullName.message}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="pe-field max-w-sm mt-4">
                  <label>Mobile number</label>
                  <PhoneVerificationField
                    idPrefix="agency-profile"
                    disabled={pending}
                    invalid={Boolean(form.formState.errors.contactPhone)}
                    initialPhone={profile.contactPhone ?? undefined}
                    initialVerified={Boolean(profile.contactPhone?.trim())}
                    onVerifiedChange={setPhoneVerified}
                    onVerified={() => void refreshUser()}
                    onVerifiedPhone={(phone) =>
                      form.setValue("contactPhone", phone, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  {form.formState.errors.contactPhone ? (
                    <span className="pe-help text-destructive mt-1">
                      {form.formState.errors.contactPhone.message}
                    </span>
                  ) : null}
                </div>
              </div>
            </motion.section>
          </div>
        </div>

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
                disabled={pending}
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
      </motion.form>
    </div>
  );
}
