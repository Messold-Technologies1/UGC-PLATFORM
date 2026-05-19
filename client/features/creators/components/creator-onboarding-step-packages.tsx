"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { CreatorProfileFormState } from "@/features/creators/hooks/use-creator-profile-form-state";
import {
  normalizeWholeNumberInput,
  PACKAGE_DELIVERY_DAYS,
  PACKAGE_PRICE_STEP,
} from "@/features/creators/hooks/use-creator-profile-form-state";

type Props = { form: CreatorProfileFormState };

export function CreatorOnboardingStepPackages({ form }: Props) {
  const inputClass =
    "h-11 rounded-lg border-gray-200 bg-white text-sm shadow-sm focus-visible:border-purple-400 focus-visible:ring-purple-400/20";
  const { packageDraft, setPackageDraft, pending } = form;

  const priceRaw = packageDraft.priceAmount.trim();
  let priceWarning: string | null = null;
  if (priceRaw) {
    const priceNumber = Number(priceRaw);
    if (!/^\d+$/.test(priceRaw)) {
      priceWarning = "Price must be a whole number.";
    } else if (priceNumber < PACKAGE_PRICE_STEP) {
      priceWarning = `Price must be at least ₹${PACKAGE_PRICE_STEP}.`;
    } else if (priceNumber % PACKAGE_PRICE_STEP !== 0) {
      priceWarning = `Price must be in steps of ₹${PACKAGE_PRICE_STEP} (e.g. ${PACKAGE_PRICE_STEP}, ${PACKAGE_PRICE_STEP * 2}, ${PACKAGE_PRICE_STEP * 3}).`;
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
        <div>
          <p className="text-base font-semibold text-gray-900">Package</p>
          <p className="text-xs text-gray-400 mt-1">
            One package is supported for creator profiles.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="onb-pkg-name"
              className="text-sm font-medium text-gray-700"
            >
              Package Name
            </Label>
            <Input
              id="onb-pkg-name"
              className={inputClass}
              disabled={pending}
              value={packageDraft.packageName}
              onChange={(e) =>
                setPackageDraft({
                  ...packageDraft,
                  packageName: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Deliverables
            </Label>
            <Input value="1 Video" disabled className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="onb-pkg-length"
              className="text-sm font-medium text-gray-700"
            >
              Video length (sec)
            </Label>
            <Input
              id="onb-pkg-length"
              className={inputClass}
              disabled={pending}
              value={packageDraft.videoLengthSeconds}
              inputMode="numeric"
              placeholder="Up to 60"
              onChange={(e) => {
                const val = normalizeWholeNumberInput(e.target.value);
                setPackageDraft({
                  ...packageDraft,
                  videoLengthSeconds: Number(val) > 60 ? "60" : val,
                });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="onb-pkg-price"
              className="text-sm font-medium text-gray-700"
            >
              Price <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                ₹
              </span>
              <Input
                id="onb-pkg-price"
                className={`${inputClass} pl-7`}
                disabled={pending}
                value={packageDraft.priceAmount}
                inputMode="numeric"
                placeholder="500"
                onChange={(e) =>
                  setPackageDraft({
                    ...packageDraft,
                    priceAmount: normalizeWholeNumberInput(e.target.value),
                  })
                }
              />
            </div>
            {priceWarning && (
              <p className="text-xs text-red-500 font-medium mt-1">
                {priceWarning}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Delivery time
            </Label>
            <Input
              value={`${PACKAGE_DELIVERY_DAYS} Days`}
              disabled
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="onb-pkg-revisions"
              className="text-sm font-medium text-gray-700"
            >
              Revisions
            </Label>
            <Input
              id="onb-pkg-revisions"
              className={inputClass}
              disabled={pending}
              value={packageDraft.maxRevisions}
              inputMode="numeric"
              onChange={(e) =>
                setPackageDraft({
                  ...packageDraft,
                  maxRevisions: normalizeWholeNumberInput(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Basic editing</p>
            <p className="text-xs text-gray-400">
              Adds basic editing to the package deliverables.
            </p>
          </div>
          <Switch
            checked={packageDraft.basicEditing}
            disabled={pending}
            onCheckedChange={(basicEditing) =>
              setPackageDraft({ ...packageDraft, basicEditing })
            }
          />
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
        <div>
          <p className="text-base font-semibold text-gray-900">Add-ons</p>
          <p className="text-xs text-gray-400 mt-1">
            Optional catalog extras brands can add to your package.
          </p>
        </div>

        {form.addOnOptionsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner className="size-4" aria-hidden /> Loading add-on options…
          </div>
        ) : form.addOnOptionsQuery.isError ? (
          <div className="flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-600">
              Could not load add-on options.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void form.addOnOptionsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {form.hydratedAddOns.unmatchedNames.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                These saved add-ons are no longer in the catalog:{" "}
                {form.hydratedAddOns.unmatchedNames.join(", ")}.
              </div>
            )}
            {form.addOnOptions.length ? (
              <div className="flex flex-col gap-3">
                {form.addOnOptions.map((option) => {
                  const selected = form.selectedAddOnSlugs.includes(
                    option.slug,
                  );
                  const draft = form.addOnDrafts[option.slug] ?? {
                    priceAmount: String(
                      option.fixedPrice ?? option.minPrice ?? 0,
                    ),
                    description: "",
                  };
                  return (
                    <div
                      key={option.slug}
                      className="space-y-3 rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                          <Checkbox
                            className="mt-0.5"
                            disabled={pending}
                            checked={selected}
                            onCheckedChange={() => form.toggleAddOn(option)}
                          />
                          <span className="font-medium text-gray-900">
                            {option.name}
                          </span>
                        </label>
                        <p className="shrink-0 text-xs text-gray-400">
                          {option.fixedPrice != null
                            ? `Fixed ₹${option.fixedPrice}`
                            : `Min ₹${option.minPrice ?? 0}, step ₹${option.stepPrice ?? 1}`}
                        </p>
                      </div>
                      {selected && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor={`onb-addon-price-${option.slug}`}
                              className="text-sm font-medium text-gray-700"
                            >
                              Price
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                ₹
                              </span>
                              <Input
                                id={`onb-addon-price-${option.slug}`}
                                className={`${inputClass} pl-7`}
                                disabled={pending || option.fixedPrice != null}
                                inputMode="numeric"
                                value={draft.priceAmount}
                                onChange={(e) =>
                                  form.updateAddOnDraft(option.slug, {
                                    priceAmount: normalizeWholeNumberInput(
                                      e.target.value,
                                    ),
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor={`onb-addon-desc-${option.slug}`}
                              className="text-sm font-medium text-gray-700"
                            >
                              Description
                            </Label>
                            <Input
                              id={`onb-addon-desc-${option.slug}`}
                              className={inputClass}
                              disabled={pending}
                              value={draft.description}
                              onChange={(e) =>
                                form.updateAddOnDraft(option.slug, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-400">
                No add-ons configured.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
