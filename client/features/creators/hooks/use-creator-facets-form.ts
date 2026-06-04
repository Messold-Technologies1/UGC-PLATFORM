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

  return {
    facetOptionsQuery,
    facetOptionsByDimension,
    selectedFacets,
    toggleFacet,
    languageDrafts,
    toggleLanguage,
    updateLanguageFluency,
    selectedFacetCount,
  };
}
