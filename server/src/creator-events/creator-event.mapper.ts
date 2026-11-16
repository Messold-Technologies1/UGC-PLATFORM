import { Prisma } from '@prisma/client';
import {
  AdminCreatorEventDto,
  CreatorEventAuthorDto,
  CreatorEventDto,
  FeedCreatorEventDto,
} from './dto/creator-event.dto';

/**
 * Everything the brand feed card needs from the creator, and nothing else.
 *
 * `displayName` is deliberately absent. Selecting only these columns means a
 * future edit cannot leak the real name by forgetting to strip it from a
 * wider object — the row never holds it in the first place.
 */
export const feedCreatorSelect = {
  id: true,
  publicSlug: true,
  publicNameSlug: true,
  profileImageUrl: true,
  city: true,
  firstOrderFreeEnabled: true,
  stats: {
    select: { avgRating: true, reviewCount: true, completedOrders: true },
  },
  // CreatorPackage.creatorId is unique, so this is one row at most.
  packages: { select: { priceAmount: true, deliveryDays: true } },
  addOns: { select: { name: true, priceAmount: true } },
  facetSelections: {
    where: { option: { dimension: 'CONTENT_CATEGORY' as const } },
    orderBy: { rank: 'asc' as const },
    select: {
      rank: true,
      customLabel: true,
      option: { select: { label: true } },
    },
  },
} satisfies Prisma.CreatorProfileSelect;

type FeedCreatorRow = Prisma.CreatorProfileGetPayload<{
  select: typeof feedCreatorSelect;
}>;

type EventRow = {
  id: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  hiddenAt: Date | null;
  hiddenReason: string | null;
  deletedAt?: Date | null;
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * The creator prices the catalog's on-location shoot add-on, so a brand can
 * actually buy travel from them. Mirrors offersOnLocationShoot() in
 * creator-profile, but takes the option name resolved once per page rather
 * than per row.
 */
function pricesOnLocationShoot(
  addOns: FeedCreatorRow['addOns'],
  onLocationOptionName: string | null,
): boolean {
  if (!onLocationOptionName) return false;
  return addOns.some(
    (addOn) =>
      addOn.name === onLocationOptionName &&
      (toNumber(addOn.priceAmount) ?? 0) > 0,
  );
}

export function mapFeedCreator(
  creator: FeedCreatorRow,
  onLocationOptionName: string | null,
): CreatorEventAuthorDto {
  const pkg = creator.packages[0] ?? null;
  // publicNameSlug is set only for creators an admin has chosen to reveal; it
  // is then the canonical URL. The label stays the opaque slug either way.
  const linkSlug = creator.publicNameSlug ?? creator.publicSlug;

  return {
    id: creator.id,
    name: creator.publicSlug,
    publicSlug: linkSlug,
    profileImageUrl: creator.profileImageUrl ?? null,
    city: creator.city ?? null,
    categories: creator.facetSelections
      .map((row) => row.customLabel ?? row.option.label)
      .filter((label): label is string => Boolean(label)),
    avgRating: creator.stats?.avgRating
      ? String(creator.stats.avgRating)
      : null,
    reviewCount: creator.stats?.reviewCount ?? 0,
    ordersCompleted: creator.stats?.completedOrders ?? 0,
    startingPrice: pkg ? toNumber(pkg.priceAmount) : null,
    deliveryDays: pkg?.deliveryDays ?? null,
    onLocationShoot: pricesOnLocationShoot(
      creator.addOns,
      onLocationOptionName,
    ),
    firstOrderFree: creator.firstOrderFreeEnabled,
  };
}

export function mapFeedEvent(
  event: EventRow & { creator: FeedCreatorRow },
  onLocationOptionName: string | null,
): FeedCreatorEventDto {
  return {
    id: event.id,
    body: event.body,
    createdAt: event.createdAt,
    editedAt: event.editedAt,
    creator: mapFeedCreator(event.creator, onLocationOptionName),
  };
}

export function mapOwnEvent(event: EventRow): CreatorEventDto {
  return {
    id: event.id,
    body: event.body,
    createdAt: event.createdAt,
    editedAt: event.editedAt,
    hidden: event.hiddenAt !== null,
    hiddenReason: event.hiddenReason,
  };
}

export function mapAdminEvent(
  event: EventRow & {
    creatorId: string;
    creator: { publicSlug: string };
    hiddenByUser: { name: string | null } | null;
  },
): AdminCreatorEventDto {
  return {
    id: event.id,
    body: event.body,
    createdAt: event.createdAt,
    editedAt: event.editedAt,
    creatorId: event.creatorId,
    creatorName: event.creator.publicSlug,
    hiddenAt: event.hiddenAt,
    hiddenReason: event.hiddenReason,
    hiddenByName: event.hiddenByUser?.name ?? null,
    deletedAt: event.deletedAt ?? null,
  };
}
