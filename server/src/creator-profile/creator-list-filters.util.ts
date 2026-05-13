import {
  ApprovalStatus,
  CreatorFacetDimension,
  PortfolioVisibilityStatus,
  Prisma,
} from '@prisma/client';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import {
  ageGroupToAgeRange,
  dateOfBirthRangeForAgeFilter,
} from './creator-age.util';

const PUBLIC = PortfolioVisibilityStatus.PUBLIC;

function facetWhere(
  dimension: CreatorFacetDimension,
  slugs: string[] | undefined,
): Prisma.CreatorProfileWhereInput | undefined {
  const s = slugs?.filter(Boolean);
  if (!s?.length) return undefined;
  return {
    facetSelections: {
      some: {
        option: {
          dimension,
          slug: { in: s },
        },
      },
    },
  };
}

function languageFacetWhere(
  slugs: string[] | undefined,
): Prisma.CreatorProfileWhereInput | undefined {
  const s = slugs?.filter(Boolean);
  if (!s?.length) return undefined;
  return {
    profileLanguages: {
      some: {
        option: {
          dimension: CreatorFacetDimension.LANGUAGE,
          slug: { in: s },
        },
      },
    },
  };
}

/**
 * Match category / persona tag / restriction text the way users type it:
 * - Case-insensitive substring (`contains`) so "UGC videos" matches stored "UGC Video".
 * - Space-separated tokens must all appear on the same row (AND); each token tries a
 *   singular variant when it ends with "s" so "videos" also matches "video".
 */
function buildProfileStringFieldRowMatchInner(
  field: 'tag' | 'category' | 'restriction',
  raw: string,
): Record<string, unknown> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const perToken = tokens.map((token) => {
    const variants = [token];
    if (token.length > 3 && /s$/i.test(token)) {
      variants.push(token.slice(0, -1));
    }
    const orBranches = variants.map((v) => ({
      [field]: { contains: v, mode: 'insensitive' as const },
    }));
    return orBranches.length === 1 ? orBranches[0] : { OR: orBranches };
  });

  if (perToken.length === 1) {
    return perToken[0] as Record<string, unknown>;
  }
  return { AND: perToken };
}

export function buildProfileStringFieldRowMatch(
  field: 'tag',
  raw: string,
): Prisma.CreatorPersonaTagWhereInput | undefined;
export function buildProfileStringFieldRowMatch(
  field: 'category',
  raw: string,
): Prisma.CreatorCategoryWhereInput | undefined;
export function buildProfileStringFieldRowMatch(
  field: 'restriction',
  raw: string,
): Prisma.CreatorRestrictionWhereInput | undefined;
export function buildProfileStringFieldRowMatch(
  field: 'tag' | 'category' | 'restriction',
  raw: string,
):
  | Prisma.CreatorPersonaTagWhereInput
  | Prisma.CreatorCategoryWhereInput
  | Prisma.CreatorRestrictionWhereInput
  | undefined {
  return buildProfileStringFieldRowMatchInner(field, raw) as
    | Prisma.CreatorPersonaTagWhereInput
    | Prisma.CreatorCategoryWhereInput
    | Prisma.CreatorRestrictionWhereInput
    | undefined;
}

/**
 * Builds `portfolioVideos.some` / nested portfolio `where` for PUBLIC videos,
 * optionally requiring industry and/or tag on the **same** video when both are set.
 * Uses `contains` for industry so "gym" matches "gym", "Gym", or "Local gym tour".
 */
export function buildPortfolioVideoMatchWhere(
  query: ListCreatorsQueryDto,
): Prisma.CreatorPortfolioVideoWhereInput | undefined {
  const industry = query.industry?.trim();
  const portfolioTag = query.portfolioTag?.trim();

  if (!industry && !portfolioTag) return undefined;

  const parts: Prisma.CreatorPortfolioVideoWhereInput[] = [
    { visibilityStatus: PUBLIC },
  ];

  if (industry) {
    parts.push({
      industryLabel: { contains: industry, mode: 'insensitive' },
    });
  }
  if (portfolioTag) {
    parts.push({
      tags: {
        some: {
          tag: { contains: portfolioTag, mode: 'insensitive' },
        },
      },
    });
  }

  if (parts.length === 1) {
    return parts[0];
  }
  return { AND: parts };
}

export type BuildListCreatorsWhereOptions = {
  /** When true (default), only creators with APPROVED approval appear in discovery lists. */
  requireApproved?: boolean;
};

/**
 * `where` for listing creators: AND of optional profile + portfolio predicates.
 */
export function buildListCreatorsWhere(
  query: ListCreatorsQueryDto,
  options?: BuildListCreatorsWhereOptions,
): Prisma.CreatorProfileWhereInput {
  const requireApproved = options?.requireApproved ?? true;
  const clauses: Prisma.CreatorProfileWhereInput[] = [];

  if (requireApproved) {
    clauses.push({
      creatorApproval: { status: ApprovalStatus.APPROVED },
    });
  }

  const city = query.city?.trim();
  if (city) {
    clauses.push({
      city: { contains: city, mode: 'insensitive' },
    });
  }

  if (query.gender !== undefined) {
    clauses.push({ gender: query.gender });
  }

  let effMin = query.minAge;
  let effMax = query.maxAge;
  if (query.ageGroup) {
    const r = ageGroupToAgeRange(query.ageGroup);
    effMin = effMin !== undefined ? Math.max(effMin, r.minAge) : r.minAge;
    effMax = effMax !== undefined ? Math.min(effMax, r.maxAge) : r.maxAge;
  }
  if (effMin !== undefined || effMax !== undefined) {
    const { lte, gte } = dateOfBirthRangeForAgeFilter(effMin, effMax);
    const dob: Prisma.DateTimeNullableFilter = {};
    if (lte !== undefined) dob.lte = lte;
    if (gte !== undefined) dob.gte = gte;
    if (Object.keys(dob).length > 0) {
      clauses.push({ dateOfBirth: dob });
    }
  }

  const facetClause = facetWhere(
    CreatorFacetDimension.CONTENT_FORMAT,
    query.contentFormat,
  );
  if (facetClause) clauses.push(facetClause);

  const appearanceClause = facetWhere(
    CreatorFacetDimension.APPEARANCE,
    query.appearance,
  );
  if (appearanceClause) clauses.push(appearanceClause);

  const contentStyleClause = facetWhere(
    CreatorFacetDimension.CONTENT_STYLE,
    query.contentStyle,
  );
  if (contentStyleClause) clauses.push(contentStyleClause);

  const capabilityClause = facetWhere(
    CreatorFacetDimension.CAPABILITY,
    query.capability,
  );
  if (capabilityClause) clauses.push(capabilityClause);

  const lifeClause = facetWhere(
    CreatorFacetDimension.LIFE_STYLE,
    query.lifeStyle,
  );
  if (lifeClause) clauses.push(lifeClause);

  const occupationClause = facetWhere(
    CreatorFacetDimension.OCCUPATION,
    query.occupation,
  );
  if (occupationClause) clauses.push(occupationClause);

  const interestClause = facetWhere(
    CreatorFacetDimension.INTEREST,
    query.interest,
  );
  if (interestClause) clauses.push(interestClause);

  const catExpClause = facetWhere(
    CreatorFacetDimension.CATEGORY_EXPERIENCE,
    query.categoryExperience,
  );
  if (catExpClause) clauses.push(catExpClause);

  const availClause = facetWhere(
    CreatorFacetDimension.CAN_CREATE_WITH,
    query.canCreateWith,
  );
  if (availClause) clauses.push(availClause);

  const langClause = languageFacetWhere(query.language);
  if (langClause) clauses.push(langClause);

  if (query.onLocationAvailable !== undefined) {
    clauses.push({
      onLocationAvailable: query.onLocationAvailable,
    });
  }

  const personaTags = query.personaTags?.filter(Boolean);
  const personaBranches = personaTags
    ?.map((v) => buildProfileStringFieldRowMatch('tag', v))
    .filter((b): b is NonNullable<typeof b> => b != null);
  if (personaBranches?.length) {
    clauses.push({
      personaTags: {
        some: {
          OR: personaBranches,
        },
      },
    });
  }

  const categories = query.categories?.filter(Boolean);
  const categoryBranches = categories
    ?.map((v) => buildProfileStringFieldRowMatch('category', v))
    .filter((b): b is NonNullable<typeof b> => b != null);
  if (categoryBranches?.length) {
    clauses.push({
      categories: {
        some: {
          OR: categoryBranches,
        },
      },
    });
  }

  const restrictions = query.restrictions?.filter(Boolean);
  const restrictionBranches = restrictions
    ?.map((v) => buildProfileStringFieldRowMatch('restriction', v))
    .filter((b): b is NonNullable<typeof b> => b != null);
  if (restrictionBranches?.length) {
    clauses.push({
      restrictions: {
        some: {
          OR: restrictionBranches,
        },
      },
    });
  }

  const portfolioMatch = buildPortfolioVideoMatchWhere(query);
  if (portfolioMatch) {
    clauses.push({
      portfolioVideos: { some: portfolioMatch },
    });
  }

  const minPrice = query.minPrice;
  const maxPrice = query.maxPrice;
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceAmount: Prisma.DecimalFilter = {};
    if (minPrice !== undefined) {
      priceAmount.gte = minPrice;
    }
    if (maxPrice !== undefined) {
      priceAmount.lte = maxPrice;
    }
    clauses.push({
      packages: {
        some: {
          priceAmount,
        },
      },
    });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) {
    const only = clauses[0];
    return only ?? {};
  }
  return { AND: clauses };
}

const portfolioSelect = {
  id: true,
  creatorId: true,
  videoUrl: true,
  thumbnailUrl: true,
  industryLabel: true,
  tags: { select: { tag: true } },
  createdAt: true,
} as const;

const facetOptionSelect = {
  id: true,
  dimension: true,
  slug: true,
  label: true,
  sortOrder: true,
} as const;

/**
 * Include for list endpoint: one preview video — latest public, or latest matching
 * industry/tag filters when those are present.
 */
export function buildCreatorListRelationsInclude(
  query: ListCreatorsQueryDto,
): Prisma.CreatorProfileInclude {
  const portfolioMatch = buildPortfolioVideoMatchWhere(query);
  const baseWhere: Prisma.CreatorPortfolioVideoWhereInput =
    portfolioMatch ?? { visibilityStatus: PUBLIC };

  return {
    facetSelections: { include: { option: { select: facetOptionSelect } } },
    profileLanguages: { include: { option: { select: facetOptionSelect } } },
    categories: { select: { category: true } },
    personaTags: { select: { tag: true } },
    restrictions: { select: { restriction: true } },
    packages: {
      select: { name: true, priceAmount: true, deliveryDays: true, deliverables: true },
    },
    portfolioVideos: {
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: portfolioSelect,
    },
  };
}
