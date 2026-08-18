import { useCallback, useMemo, useState } from "react";

import {
  createInitialSelectedFacets,
  createInitialCustomFacetLabels,
  createInitialLanguages,
  MAX_NICHE_SELECTIONS,
  SINGLE_SELECT_FACET_DIMENSIONS,
  type CustomFacetLabels,
  type SelectedFacets,
} from "./creator-profile-form-utils";
import { useCreatorFacetOptionsQuery } from "./use-creator-suggestion-queries";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type {
  CreatorFacetDimension,
} from "@/features/creators/api/get-creator-facet-options";

export type UseCreatorFacetsFormOptions = {
  initialProfile?: CreatorProfileItemApi | null;
  enabled: boolean;
};

type NonLanguageDimension = Exclude<CreatorFacetDimension, "LANGUAGE">;
const NICHE_DIMENSION: NonLanguageDimension = "CONTENT_CATEGORY";
const MAX_SECONDARY_NICHES = MAX_NICHE_SELECTIONS - 1;

export function useCreatorFacetsForm({
  initialProfile,
  enabled,
}: UseCreatorFacetsFormOptions) {
  const facetOptionsQuery = useCreatorFacetOptionsQuery({
    enabled,
    staleTime: 60 * 60_000,
  });

  // CONTENT_CATEGORY is stored as an ordered list: index 0 = primary niche,
  // the rest (max 2) are secondary. Single-select dimensions hold <= 1 slug.
  const [selectedFacets, setSelectedFacets] = useState<SelectedFacets>(() =>
    createInitialSelectedFacets(initialProfile),
  );
  const [customFacetLabels, setCustomFacetLabels] = useState<CustomFacetLabels>(
    () => createInitialCustomFacetLabels(initialProfile),
  );
  // Languages are a simple multi-select — an ordered list of unique slugs.
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() =>
    createInitialLanguages(initialProfile),
  );

  /**
   * Re-seed the form from a freshly-saved profile. Used after a save that may
   * have converted an "Other" value into a real catalog option server-side, so
   * the selection points at the new option (not "Other") without a full reload.
   */
  const resetFromProfile = useCallback((profile: CreatorProfileItemApi) => {
    setSelectedFacets(createInitialSelectedFacets(profile));
    setCustomFacetLabels(createInitialCustomFacetLabels(profile));
    setSelectedLanguages(createInitialLanguages(profile));
  }, []);

  const facetOptionsByDimension =
    facetOptionsQuery.data?.optionsByDimension ?? {};

  const selectedFacetCount = useMemo(
    () =>
      Object.values(selectedFacets).reduce(
        (sum, values) => sum + (values?.length ?? 0),
        0,
      ),
    [selectedFacets],
  );

  // ---- Niche (primary + up to 2 secondary), same catalog ----
  const primaryNiche = selectedFacets[NICHE_DIMENSION]?.[0] ?? "";
  const secondaryNiches = useMemo(
    () => (selectedFacets[NICHE_DIMENSION] ?? []).slice(1),
    [selectedFacets],
  );

  const setPrimaryNiche = useCallback((slug: string) => {
    setSelectedFacets((current) => {
      const list = current[NICHE_DIMENSION] ?? [];
      // Drop the slug from the secondary picks if it was there, then lead with it.
      const secondary = list.slice(1).filter((s) => s !== slug);
      return { ...current, [NICHE_DIMENSION]: [slug, ...secondary] };
    });
  }, []);

  const toggleSecondaryNiche = useCallback((slug: string) => {
    setSelectedFacets((current) => {
      const list = current[NICHE_DIMENSION] ?? [];
      if (list.length === 0) return current; // no primary yet
      const [primary, ...secondary] = list;
      if (slug === primary) return current;
      let nextSecondary: string[];
      if (secondary.includes(slug)) {
        nextSecondary = secondary.filter((s) => s !== slug);
      } else if (secondary.length < MAX_SECONDARY_NICHES) {
        nextSecondary = [...secondary, slug];
      } else {
        // At cap: keep earlier picks and swap in the new one for the last.
        nextSecondary = [...secondary.slice(0, -1), slug];
      }
      return { ...current, [NICHE_DIMENSION]: [primary, ...nextSecondary] };
    });
  }, []);

  // ---- Single-select dimensions (creator type / occupation / appearance) ----
  const selectSingleFacet = useCallback(
    (dimension: NonLanguageDimension, slug: string) => {
      setSelectedFacets((current) => {
        const isSelected = (current[dimension] ?? [])[0] === slug;
        return { ...current, [dimension]: isSelected ? [] : [slug] };
      });
    },
    [],
  );

  // Generic multi-select toggle (retained for any non-restructured dimension).
  const toggleFacet = useCallback(
    (dimension: NonLanguageDimension, slug: string) => {
      if (dimension === NICHE_DIMENSION) return;
      if (SINGLE_SELECT_FACET_DIMENSIONS.has(dimension)) {
        setSelectedFacets((current) => {
          const isSelected = (current[dimension] ?? [])[0] === slug;
          return { ...current, [dimension]: isSelected ? [] : [slug] };
        });
        return;
      }
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

  const setCustomFacetLabel = useCallback(
    (dimension: NonLanguageDimension, value: string) => {
      setCustomFacetLabels((current) => ({ ...current, [dimension]: value }));
    },
    [],
  );

  /** Remove a specific slug from a dimension (used to clear a rejected "Other"). */
  const removeFacetSlug = useCallback(
    (dimension: NonLanguageDimension, slug: string) => {
      setSelectedFacets((current) => ({
        ...current,
        [dimension]: (current[dimension] ?? []).filter((s) => s !== slug),
      }));
    },
    [],
  );

  const toggleLanguage = useCallback((slug: string) => {
    setSelectedLanguages((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug],
    );
  }, []);

  return {
    facetOptionsQuery,
    facetOptionsByDimension,
    selectedFacets,
    toggleFacet,
    selectSingleFacet,
    primaryNiche,
    secondaryNiches,
    setPrimaryNiche,
    toggleSecondaryNiche,
    removeFacetSlug,
    resetFromProfile,
    customFacetLabels,
    setCustomFacetLabel,
    selectedLanguages,
    setSelectedLanguages,
    toggleLanguage,
    selectedFacetCount,
  };
}
