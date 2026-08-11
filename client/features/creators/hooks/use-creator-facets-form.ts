import { useCallback, useMemo, useState } from "react";

import {
  createInitialSelectedFacets,
  createInitialLanguages,
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
  // Languages are a simple multi-select — an ordered list of unique slugs.
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() =>
    createInitialLanguages(initialProfile),
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
    selectedLanguages,
    setSelectedLanguages,
    toggleLanguage,
    selectedFacetCount,
  };
}
