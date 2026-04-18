import {
  ApprovalStatus,
  PortfolioVisibilityStatus,
  Prisma,
} from '@prisma/client';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';

const PUBLIC = PortfolioVisibilityStatus.PUBLIC;

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

  const gender = query.gender?.trim();
  if (gender) {
    clauses.push({
      gender: { equals: gender, mode: 'insensitive' },
    });
  }

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
    languages: { select: { language: true } },
    categories: { select: { category: true } },
    personaTags: { select: { tag: true } },
    restrictions: { select: { restriction: true } },
    packages: { select: { name: true, priceAmount: true } },
    portfolioVideos: {
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: portfolioSelect,
    },
  };
}
