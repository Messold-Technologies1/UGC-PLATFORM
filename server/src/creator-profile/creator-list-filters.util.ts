import {
  ApprovalStatus,
  CreatorFacetDimension,
  PortfolioVisibilityStatus,
  Prisma,
  SocialConnectionStatus,
  SocialPlatform,
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
import { playableAssetWhere } from '../creator-portfolio/portfolio-video-asset.util';

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

export type BuildListCreatorsWhereOptions = {
  /**
   * When true (default), only listed creators appear in discovery lists.
   * `isListed` is the denormalized gate = (approval APPROVED) AND completeProfile,
   * so a single indexed predicate replaces the approval join + completeness check.
   */
  requireApproved?: boolean;
  /**
   * What the typed location term turned out to name, widest first: a country,
   * else a state, else neither. Set by the caller, which has to look the term
   * up; `buildLocationClause` below says why the order matters. Both unset
   * means the term is treated as a city.
   */
  locationCountryName?: string | null;
  locationStateName?: string | null;
};

/**
 * One typed box covers country, state and city, so the term is matched at the
 * widest level it names: "India" is a country, "Delhi" a state (and a city),
 * "Mumbai" only a city. Widest wins because a brand typing a state means the
 * state — otherwise "Delhi" would return only the creators whose city happens
 * to be spelled that way and miss the rest of it.
 *
 * Country and state match exactly; only the city falls back to a substring, so
 * a half-typed "Pun" finds Pune rather than being read as Punjab.
 */
function buildLocationClause(
  term: string,
  options?: BuildListCreatorsWhereOptions,
): Prisma.CreatorProfileWhereInput {
  const countryName = options?.locationCountryName?.trim();
  if (countryName) {
    return { countryName: { equals: countryName, mode: 'insensitive' } };
  }

  const stateName = options?.locationStateName?.trim();
  if (stateName) {
    return { stateName: { equals: stateName, mode: 'insensitive' } };
  }

  return { city: { contains: term, mode: 'insensitive' } };
}

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
    clauses.push(buildLocationClause(city, options));
  }

  const searchClause = buildCreatorListSearchWhere(query.search);
  if (searchClause) clauses.push(searchClause);

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

  const appearanceClause = facetWhere(
    CreatorFacetDimension.APPEARANCE,
    query.appearance,
  );
  if (appearanceClause) clauses.push(appearanceClause);

  const creatorTypeClause = facetWhere(
    CreatorFacetDimension.CREATOR_TYPE,
    query.creatorType,
  );
  if (creatorTypeClause) clauses.push(creatorTypeClause);

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

  const minFollowers = query.minFollowers;
  const maxFollowers = query.maxFollowers;
  if (minFollowers !== undefined || maxFollowers !== undefined) {
    const followersCount: Prisma.IntNullableFilter = {};
    if (minFollowers !== undefined) {
      followersCount.gte = minFollowers;
    }
    if (maxFollowers !== undefined) {
      followersCount.lte = maxFollowers;
    }
    // Match creators with a live Instagram connection whose follower count is in
    // range. ACTIVE only, so the count reflects a currently-synced account.
    clauses.push({
      socialConnections: {
        some: {
          platform: SocialPlatform.INSTAGRAM,
          status: SocialConnectionStatus.ACTIVE,
          followersCount,
        },
      },
    });
  }

  const maxDeliveryDays = query.maxDeliveryDays;
  if (maxDeliveryDays !== undefined) {
    clauses.push({
      packages: {
        some: {
          deliveryDays: { lte: maxDeliveryDays },
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
 * Include for list endpoint: one preview video — the latest public one.
 */
export function buildCreatorListRelationsInclude(
  _query: ListCreatorsQueryDto,
): Prisma.CreatorProfileInclude {
  const baseWhere: Prisma.CreatorPortfolioVideoWhereInput = {
    visibilityStatus: PUBLIC,
    ...playableAssetWhere(),
  };

  return {
    // rank asc so the CONTENT_CATEGORY picks arrive primary-first — the card
    // leads with the primary niche and shows the secondaries behind it.
    facetSelections: {
      include: { option: { select: facetOptionSelect } },
      orderBy: { rank: 'asc' },
    },
    profileLanguages: { include: { option: { select: facetOptionSelect } } },
    restrictions: { select: { restriction: true } },
    packages: {
      select: {
        name: true,
        priceAmount: true,
        deliveryDays: true,
        deliverables: true,
      },
    },
    portfolioVideos: {
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: portfolioSelect,
    },
    stats: { select: { avgRating: true, reviewCount: true } },
    // priceAmount comes along because an add-on priced at zero is one a brand
    // cannot buy — see offersOnLocationShoot.
    addOns: { select: { name: true, priceAmount: true } },
    unavailability: { select: { startsOn: true, endsOn: true } },
  };
}

/**
 * Public creator browse: match location or bio only. The creator's real name
 * is intentionally excluded so brands can never search by (or infer) it.
 */
export function buildCreatorListSearchWhere(
  search?: string,
): Prisma.CreatorProfileWhereInput | undefined {
  const q = search?.trim();
  if (!q) return undefined;
  const like = { contains: q, mode: 'insensitive' as const };
  return {
    OR: [
      // Location + bio (as before).
      { city: like },
      { stateName: like },
      { countryName: like },
      { bio: like },
      // Niche / facet labels (and any free-text "Other" custom label).
      {
        facetSelections: {
          some: {
            OR: [{ option: { label: like } }, { customLabel: like }],
          },
        },
      },
      // Package names.
      { packages: { some: { name: like } } },
      // "Open to" restrictions.
      { restrictions: { some: { restriction: like } } },
    ],
  };
  // Note: the creator's real name is intentionally never matched (privacy).
}

/** Admin queues: search by name, email, phone, or public slug. */
export function buildAdminCreatorApprovalSearchWhere(
  search?: string,
): Prisma.CreatorProfileWhereInput | undefined {
  const q = search?.trim();
  if (!q) return undefined;
  const like = { contains: q, mode: 'insensitive' as const };
  return {
    OR: [
      { displayName: like },
      { contactEmail: like },
      { publicSlug: like },
      { user: { email: like } },
      { user: { phone: { contains: q } } },
    ],
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
    case AdminCreatorListSegment.SELF_COMPLETED:
      // profile_first only: creators who finished their profile on their own.
      // They wait here until an admin sends them for review.
      segmentClause = {
        completeProfile: true,
        creatorApproval: { status: ApprovalStatus.SELF_COMPLETED },
      };
      break;
    case AdminCreatorListSegment.WITHDRAWN:
      // Profiles the creator pulled back from review to edit. They stay here
      // (completeProfile is always false in this state) until they resubmit,
      // which moves them to Self complete / Awaiting review.
      segmentClause = {
        creatorApproval: { status: ApprovalStatus.WITHDRAWN },
      };
      break;
    case AdminCreatorListSegment.LISTED:
    // Both completeness segments start from the same set of listed creators —
    // the split between them is derived live from the Go-Live checklist plus
    // OTP verification and payout details (never the intro video, which stays
    // optional), which Prisma's `where` cannot express (it has no "at least N
    // related rows" filter, and the mandatory add-ons rule is a comparison
    // against the catalog). `listListedCreatorsByCompleteness` narrows it.
    case AdminCreatorListSegment.LISTED_COMPLETE:
    case AdminCreatorListSegment.LISTED_INCOMPLETE:
      segmentClause = { isListed: true };
      break;
    default:
      segmentClause = {};
  }

  if (!searchClause) return segmentClause;
  return { AND: [segmentClause, searchClause] };
}
