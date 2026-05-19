"use client";

import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { CreatorProfileFormState } from "@/features/creators/hooks/use-creator-profile-form-state";
import {
  facetSections,
  genderOptions,
  contentVolumeOptions,
  fluencyOptions,
  PACKAGE_DELIVERY_DAYS,
} from "@/features/creators/hooks/use-creator-profile-form-state";

type Props = {
  form: CreatorProfileFormState;
  onBack?: () => void;
};

export function CreatorOnboardingStepReview({ form, onBack }: Props) {
  const facetOptionsByDimension = form.facetOptionsByDimension;

  function resolveFacetLabel(dimension: string, slug: string) {
    const options =
      facetOptionsByDimension[
        dimension as keyof typeof facetOptionsByDimension
      ] ?? [];
    return options.find((o) => o.slug === slug)?.label ?? slug;
  }

  function resolveLanguageLabel(slug: string) {
    const options = facetOptionsByDimension.LANGUAGE ?? [];
    return options.find((o) => o.slug === slug)?.label ?? slug;
  }

  const genderLabel =
    genderOptions.find((o) => o.value === form.gender)?.label ?? "—";
  const volumeLabel =
    contentVolumeOptions.find((o) => o.value === form.contentVolume)?.label ??
    "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
          <Check className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-900">Almost done!</p>
          <p className="text-xs text-green-700">
            Review your profile details below and click &ldquo;Create
            Profile&rdquo; to finish.
          </p>
        </div>
      </div>

      <ReviewSection title="Basic Info">
        <ReviewRow label="Full Name" value={form.displayName || "—"} />
        <ReviewRow
          label="Phone"
          value={form.phoneVerified ? "Verified ✓" : "Not verified"}
        />
        <ReviewRow
          label="Location"
          value={
            [form.countryName, form.stateName, form.city]
              .filter(Boolean)
              .join(", ") || "—"
          }
        />
        <ReviewRow
          label="Content category"
          value={
            (form.selectedFacets.CONTENT_CATEGORY ?? [])
              .map((s) => resolveFacetLabel("CONTENT_CATEGORY", s))
              .join(", ") || "—"
          }
        />
        <ReviewRow label="Bio" value={form.bio || "—"} />
        <ReviewRow label="Gender" value={genderLabel} />
        <ReviewRow label="Date of birth" value={form.dateOfBirth || "—"} />
        <ReviewRow label="Content volume" value={volumeLabel} />
        <ReviewRow
          label="Collaboration count"
          value={form.collaborationCount || "0"}
        />
      </ReviewSection>

      <ReviewSection title="Profile Details">
        {facetSections
          .filter((s) => s.dimension !== "CONTENT_CATEGORY")
          .map((section) => {
            const slugs = form.selectedFacets[section.dimension] ?? [];
            if (!slugs.length) return null;
            return (
              <ReviewRow
                key={section.dimension}
                label={section.label}
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {slugs.map((slug) => (
                      <span
                        key={slug}
                        className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                      >
                        {resolveFacetLabel(section.dimension, slug)}
                      </span>
                    ))}
                  </div>
                }
              />
            );
          })}
        <ReviewRow
          label="Languages"
          value={
            form.languageDrafts.length > 0
              ? form.languageDrafts
                  .map((l) => {
                    const fluencyLabel =
                      fluencyOptions.find((f) => f.value === l.fluency)
                        ?.label ?? l.fluency;
                    return `${resolveLanguageLabel(l.slug)} (${fluencyLabel})`;
                  })
                  .join(", ")
              : "—"
          }
        />
        <ReviewRow
          label="Shipping address"
          value={form.shippingAddress || "—"}
        />
        <ReviewRow
          label="On-location"
          value={
            form.onLocationAvailable
              ? `Yes${form.travelRadius ? ` (${form.travelRadius} km)` : ""}`
              : "No"
          }
        />
        <ReviewRow label="Contact email" value={form.contactEmail || "—"} />
        <ReviewRow label="Instagram" value={form.instagramUrl || "—"} />
        <ReviewRow label="YouTube" value={form.youtubeUrl || "—"} />
        <ReviewRow label="TikTok" value={form.tiktokUrl || "—"} />
        <ReviewRow label="Snapchat" value={form.snapchatUrl || "—"} />
        <ReviewRow
          label="Intro video"
          value={form.introVideoPreviewUrl ? "Uploaded ✓" : "—"}
        />
      </ReviewSection>

      <ReviewSection title="Package">
        <ReviewRow label="Name" value={form.packageDraft.packageName || "—"} />
        <ReviewRow
          label="Video length"
          value={`${form.packageDraft.videoLengthSeconds}s`}
        />
        <ReviewRow
          label="Price"
          value={
            form.packageDraft.priceAmount
              ? `₹${form.packageDraft.priceAmount}`
              : "—"
          }
        />
        <ReviewRow label="Delivery" value={`${PACKAGE_DELIVERY_DAYS} days`} />
        <ReviewRow
          label="Revisions"
          value={form.packageDraft.maxRevisions || "1"}
        />
        <ReviewRow
          label="Basic editing"
          value={form.packageDraft.basicEditing ? "Yes" : "No"}
        />
      </ReviewSection>

      {form.selectedAddOnSlugs.length > 0 && (
        <ReviewSection title="Add-ons">
          {form.selectedAddOnSlugs.map((slug) => {
            const option = form.addOnOptions.find((o) => o.slug === slug);
            const draft = form.addOnDrafts[slug];
            if (!option) return null;
            return (
              <ReviewRow
                key={slug}
                label={option.name}
                value={
                  draft
                    ? `₹${draft.priceAmount}${draft.description ? ` — ${draft.description}` : ""}`
                    : "—"
                }
              />
            );
          })}
        </ReviewSection>
      )}

      <div className="flex items-center gap-4 pt-4">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="gap-2 text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <Button
          type="submit"
          disabled={form.pending || form.uploadingIntroVideo}
          className="flex-1 gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-200/50 hover:bg-purple-700 transition-all"
          onClick={() => void form.handleSubmit()}
        >
          {form.pending ? (
            <>
              <Spinner className="mr-2 size-4" aria-hidden /> Creating profile…
            </>
          ) : (
            "Create Profile"
          )}
        </Button>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <h3 className="border-b border-gray-100 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-900">
        {title}
      </h3>
      <div className="divide-y divide-gray-50 px-5">{children}</div>
    </section>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
      <p className="w-40 shrink-0 text-sm font-medium text-gray-500">{label}</p>
      <div className="text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}
