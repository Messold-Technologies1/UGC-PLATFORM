import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  addOnPriceError,
  type AddOnDraft,
} from "./creator-profile-form-utils";
import { useCreatorAddOnOptionsQuery } from "./use-creator-suggestion-queries";
import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";
import type { CreatorAddOnCreatePayload } from "@/features/creators/api/create-creator-profile";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";

export type UseCreatorAddOnsFormOptions = {
  initialProfile?: CreatorProfileItemApi | null;
  enabled: boolean;
};

export function useCreatorAddOnsForm({
  initialProfile,
  enabled,
}: UseCreatorAddOnsFormOptions) {
  const addOnOptionsQuery = useCreatorAddOnOptionsQuery({
    enabled,
    staleTime: 60 * 60_000,
  });

  const [selectedAddOnSlugs, setSelectedAddOnSlugs] = useState<string[]>([]);
  const [addOnDrafts, setAddOnDrafts] = useState<Record<string, AddOnDraft>>(
    {},
  );
  const [addOnsTouched, setAddOnsTouched] = useState(false);

  const addOnOptions = useMemo(
    () => addOnOptionsQuery.data?.options ?? [],
    [addOnOptionsQuery.data?.options],
  );

  const hydratedAddOns = useMemo(() => {
    if (!addOnOptions.length) {
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
  }, [addOnOptions, initialProfile?.addOns]);

  const effectiveSelectedAddOnSlugs = addOnsTouched
    ? selectedAddOnSlugs
    : hydratedAddOns.selectedSlugs;
  const effectiveAddOnDrafts = addOnsTouched
    ? addOnDrafts
    : hydratedAddOns.drafts;

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

  const buildAddOns = useCallback((): CreatorAddOnCreatePayload[] | null => {
    const bySlug = new Map(
      addOnOptions.map((option) => [option.slug, option]),
    );
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
  }, [
    addOnOptions,
    effectiveAddOnDrafts,
    effectiveSelectedAddOnSlugs,
  ]);

  return {
    addOnOptionsQuery,
    addOnOptions,
    hydratedAddOns,
    selectedAddOnSlugs: effectiveSelectedAddOnSlugs,
    addOnDrafts: effectiveAddOnDrafts,
    addOnsTouched,
    setAddOnsTouched,
    setAddOnDrafts,
    effectiveAddOnDrafts,
    toggleAddOn,
    updateAddOnDraft,
    buildAddOns,
  };
}
