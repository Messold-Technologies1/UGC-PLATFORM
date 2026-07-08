import {
  ApprovalStatus,
  CreatorFacetDimension,
  PortfolioVisibilityStatus,
  Prisma,
} from '@prisma/client';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import { AdminCreatorListSegment } from './dto/admin-creator-list.dto';
import {
  type CreatorOnboardingMode,
  getCreatorOnboardingMode,
} from '../config/creator-onboarding-mode';
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
 * Match restriction text the way users type it:
 * - Case-insensitive substring (`contains`) so "UGC videos" matches stored "UGC Video".
 * - Space-separated tokens must all appear on the same row (AND); each token tries a
 *   singular variant when it ends with "s" so "videos" also matches "video".
 */
function buildRestrictionRowMatch(
  raw: string,
): Prisma.CreatorRestrictionWhereInput | undefined {
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
      restriction: { contains: v, mode: 'insensitive' as const },
    }));
    return orBranches.length === 1 ? orBranches[0] : { OR: orBranches };
  });

  if (perToken.length === 1) {
    return perToken[0] as Prisma.CreatorRestrictionWhereInput;
  }
  return { AND: perToken };
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
  /**
   * When true (default), only listed creators appear in discovery lists.
   * `isListed` is the denormalized gate = (approval APPROVED) AND completeProfile,
   * so a single indexed predicate replaces the approval join + completeness check.
   */
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
    clauses.push({ isListed: true });
  }

  const city = query.city?.trim();
  if (city) {
    clauses.push({
      city: { contains: city, mode: 'insensitive' },
    });
  }

  const search = query.search?.trim();
  if (search) {
    clauses.push({
      displayName: { contains: search, mode: 'insensitive' },
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

  const contentCategoryClause = facetWhere(
    CreatorFacetDimension.CONTENT_CATEGORY,
    query.contentCategory,
  );
  if (contentCategoryClause) clauses.push(contentCategoryClause);

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

  const aiContentClause = facetWhere(
    CreatorFacetDimension.AI_CONTENT_PERMISSION,
    query.aiContentPermission,
  );
  if (aiContentClause) clauses.push(aiContentClause);

  const langClause = languageFacetWhere(query.language);
  if (langClause) clauses.push(langClause);

  if (query.onLocationAvailable !== undefined) {
    clauses.push({
      onLocationAvailable: query.onLocationAvailable,
    });
  }

  const restrictions = query.restrictions?.filter(Boolean);
  const restrictionBranches = restrictions
    ?.map((v) => buildRestrictionRowMatch(v))
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

  const maxDeliveryDays = query.maxDeliveryDays;
  if (maxDeliveryDays !== undefined) {
    clauses.push({
      OR: [
        {
          packages: {
            some: {
              deliveryDays: { lte: maxDeliveryDays },
            },
          },
        },
        {
          addOns: {
            some: {
              deliveryDays: { lte: maxDeliveryDays, not: null },
            },
          },
        },
      ],
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
    stats: { select: { avgRating: true, reviewCount: true } },
    addOns: { select: { name: true, deliveryDays: true } },
  };
}

/** Admin pending/rejected queues: search by creator display name only. */
export function buildAdminCreatorApprovalSearchWhere(
  search?: string,
): Prisma.CreatorProfileWhereInput | undefined {
  const q = search?.trim();
  if (!q) return undefined;
  return {
    displayName: { contains: q, mode: 'insensitive' },
  };
}

/** Admin unified creator list segments. */
export function buildAdminCreatorsListWhere(
  segment: AdminCreatorListSegment,
  search?: string,
  onboardingMode: CreatorOnboardingMode = getCreatorOnboardingMode(
    process.env.CREATOR_ONBOARDING_MODE,
  ),
): Prisma.CreatorProfileWhereInput {
  const searchClause = buildAdminCreatorApprovalSearchWhere(search);
  const profileFirst = onboardingMode === 'profile_first';

  let segmentClause: Prisma.CreatorProfileWhereInput;
  switch (segment) {
    case AdminCreatorListSegment.PENDING:
      segmentClause = profileFirst
        ? {
            creatorApproval: { status: ApprovalStatus.PENDING },
            completeProfile: true,
          }
        : {
            creatorApproval: { status: ApprovalStatus.PENDING },
          };
      break;
    case AdminCreatorListSegment.APPROVED:
      segmentClause = {
        creatorApproval: { status: ApprovalStatus.APPROVED },
      };
      break;
    case AdminCreatorListSegment.NON_APPROVED:
      segmentClause = {
        creatorApproval: { status: ApprovalStatus.REJECTED },
      };
      break;
    case AdminCreatorListSegment.INCOMPLETE:
      // profile_first "Building profile": incomplete profiles that are not
      // rejected (PENDING or APPROVED). Rejected incomplete → NON_APPROVED.
      // approval_first: approved creators who haven't finished go-live.
      segmentClause = profileFirst
        ? {
            completeProfile: false,
            creatorApproval: {
              status: {
                in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
              },
            },
          }
        : {
            completeProfile: false,
            creatorApproval: { status: ApprovalStatus.APPROVED },
          };
      break;
    case AdminCreatorListSegment.LISTED:
      segmentClause = { isListed: true };
      break;
    default:
      segmentClause = {};
  }

  if (!searchClause) return segmentClause;
  return { AND: [segmentClause, searchClause] };
}
