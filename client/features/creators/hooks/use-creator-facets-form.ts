import { useCallback, useMemo, useState } from "react";

import {
  createInitialSelectedFacets,
  createInitialLanguageDrafts,
  type SelectedFacets,
  type LanguageDraft,
} from "./creator-profile-form-utils";
import { useCreatorFacetOptionsQuery } from "./use-creator-suggestion-queries";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type {
  CreatorFacetDimension,
} from "@/features/creators/api/get-creator-facet-options";
import type { CreatorLanguageFluency } from "@/features/creators/api/create-creator-profile";

export type UseCreatorFacetsFormOptions = {
  initialProfile?: CreatorProfileItemApi | null;
  enabled: boolean;
};

export function useCreatorFacetsForm({
  initialProfile,
  enabled,
}: UseCreatorFacetsFormOptions) {
  const facetOptionsQuery = useCreatorFacetOptionsQuery({
    enabled,
    staleTime: 60 * 60_000,
  });

  const [selectedFacets, setSelectedFacets] = useState<SelectedFacets>(() =>
    createInitialSelectedFacets(initialProfile),
  );
  const [languageDrafts, setLanguageDrafts] = useState<LanguageDraft[]>(() =>
    createInitialLanguageDrafts(initialProfile),
  );

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

  const addLanguage = useCallback((slug: string) => {
    setLanguageDrafts((current) => [...current, { slug, fluency: "FLUENT" }]);
  }, []);

  const removeLanguage = useCallback((index: number) => {
    setLanguageDrafts((current) => current.filter((_, i) => i !== index));
  }, []);

  const updateLanguageSlug = useCallback((index: number, newSlug: string) => {
    setLanguageDrafts((current) => {
      const next = [...current];
      if (next[index]) next[index] = { ...next[index], slug: newSlug };
      return next;
    });
  }, []);

  const updateLanguageFluency = useCallback(
    (index: number, fluency: CreatorLanguageFluency) => {
      setLanguageDrafts((current) => {
        const next = [...current];
        if (next[index]) next[index] = { ...next[index], fluency };
        return next;
      });
    },
    [],
  );

  return {
    facetOptionsQuery,
    facetOptionsByDimension,
    selectedFacets,
    toggleFacet,
    languageDrafts,
    addLanguage,
    removeLanguage,
    updateLanguageSlug,
    updateLanguageFluency,
    selectedFacetCount,
  };
}
