import { BroadcastAudience, OrderStatus, UserStatus } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * Who each broadcast audience actually is.
 *
 * One definition per audience, shared by the preview count and the send, so
 * the number an admin is shown before pressing Send is produced by the same
 * query that then walks the audience. Two queries would drift, and the one
 * that drifts is the one nobody checks.
 *
 * Paging is keyset, never OFFSET: these audiences are the largest tables in
 * the product, and OFFSET paging degrades quadratically.
 *
 * Reachability is deliberately NOT filtered here. A creator with no phone, an
 * opted-out brand, a suppressed address — all of them stay in the audience and
 * are skipped per channel by the send path, which records why in the delivery
 * log. Filtering here instead would make the log silent about them, and
 * "nobody was told why" is the failure mode this system exists to avoid.
 */
export type AudienceDefinition = {
  /** The catalog event this audience sends through. */
  eventKey: string;
  label: string;
  /** What the query actually selects, in words, for the admin UI. */
  description: string;
  count: (prisma: PrismaService) => Promise<number>;
  /** One keyset page of profile ids, ordered by id. */
  page: (
    prisma: PrismaService,
    cursor: string | null,
    take: number,
  ) => Promise<string[]>;
};

/** Accounts that are not ACTIVE are excluded up front rather than per row. */
const activeUser = { user: { status: UserStatus.ACTIVE } } as const;

/**
 * Entity-id prefixes for the one audience that spans two tables.
 *
 * The delivery log keys a send on `entityId`, and a bare UUID would not say
 * whether it is a brand or an agency — so `resolve` would have to try one
 * table and fall back to the other, which reads a deleted brand as "might be
 * an agency". The prefix makes it explicit at both ends.
 */
export const BRAND = 'brand';
export const AGENCY = 'agency';

/** Still owes money: the payer on an order that never got past checkout. */
const owesOnAnOrder = {
  orders: { some: { status: OrderStatus.PENDING_PAYMENT } },
} as const;

const brandsOwing = { ...activeUser, ...owesOnAnOrder } as const;
const agenciesOwing = {
  owner: { status: UserStatus.ACTIVE },
  ...owesOnAnOrder,
} as const;

export const BROADCAST_AUDIENCES: Record<
  BroadcastAudience,
  AudienceDefinition
> = {
  [BroadcastAudience.CREATORS_WITH_OPEN_TO]: {
    eventKey: 'broadcast-creators-open-to',
    label: 'Creators with an "Open to" category',
    description:
      'Creators who have opted into at least one sensitive category — Gambling, Lingerie, Intimacy, Dating or Night Clubs.',
    count: (prisma) =>
      prisma.creatorProfile.count({
        where: { ...activeUser, restrictions: { some: {} } },
      }),
    page: async (prisma, cursor, take) => {
      const rows = await prisma.creatorProfile.findMany({
        where: { ...activeUser, restrictions: { some: {} } },
        orderBy: { id: 'asc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },

  [BroadcastAudience.LISTED_CREATORS]: {
    eventKey: 'broadcast-creators-listed',
    label: 'All listed creators',
    description: 'Every creator whose profile is live in browse (isListed).',
    count: (prisma) =>
      prisma.creatorProfile.count({ where: { ...activeUser, isListed: true } }),
    page: async (prisma, cursor, take) => {
      const rows = await prisma.creatorProfile.findMany({
        where: { ...activeUser, isListed: true },
        orderBy: { id: 'asc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },

  [BroadcastAudience.ACTIVE_BRANDS]: {
    eventKey: 'broadcast-brands',
    label: 'All brands',
    description: 'Every brand whose user account is active.',
    count: (prisma) => prisma.brandProfile.count({ where: activeUser }),
    page: async (prisma, cursor, take) => {
      const rows = await prisma.brandProfile.findMany({
        where: activeUser,
        orderBy: { id: 'asc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },

  [BroadcastAudience.ORDERS_AWAITING_PAYMENT]: {
    eventKey: 'broadcast-orders-awaiting-payment',
    label: 'Brands & agencies with an order awaiting payment',
    description:
      'Whoever owes money on an order still in PENDING_PAYMENT — the brand, or the agency when the agency is the buyer. One entry per payer, so a brand with three unpaid orders is chased once, not three times.',
    count: async (prisma) => {
      const [brands, agencies] = await Promise.all([
        prisma.brandProfile.count({ where: brandsOwing }),
        prisma.agency.count({ where: agenciesOwing }),
      ]);
      return brands + agencies;
    },
    // Two tables behind one audience, so the cursor has to say which half it
    // is in. Brands are walked first, then agencies; the prefix on each id is
    // what `resolve` reads to know which table to look in, and it is what
    // keeps the cursor unambiguous when a page lands on the boundary.
    page: async (prisma, cursor, take) => {
      // Written as a null check rather than `cursor?.startsWith(AGENCY)` so
      // the compiler knows `cursor` is a string below this block.
      if (cursor === null || cursor.startsWith(`${BRAND}:`)) {
        const brandCursor = cursor ? cursor.slice(BRAND.length + 1) : null;
        const brands = await prisma.brandProfile.findMany({
          where: brandsOwing,
          orderBy: { id: 'asc' },
          take,
          ...(brandCursor ? { cursor: { id: brandCursor }, skip: 1 } : {}),
          select: { id: true },
        });
        const ids = brands.map((b) => `${BRAND}:${b.id}`);
        if (ids.length === take) return ids;

        // Brands ran out mid-page: top the page up from the agencies rather
        // than returning short, so the caller's loop does not read a partial
        // page as the end of the audience.
        const agencies = await prisma.agency.findMany({
          where: agenciesOwing,
          orderBy: { id: 'asc' },
          take: take - ids.length,
          select: { id: true },
        });
        return [...ids, ...agencies.map((a) => `${AGENCY}:${a.id}`)];
      }

      const agencies = await prisma.agency.findMany({
        where: agenciesOwing,
        orderBy: { id: 'asc' },
        take,
        cursor: { id: cursor.slice(AGENCY.length + 1) },
        skip: 1,
        select: { id: true },
      });
      return agencies.map((a) => `${AGENCY}:${a.id}`);
    },
  },

  [BroadcastAudience.ACTIVE_AGENCIES]: {
    eventKey: 'broadcast-agencies',
    label: 'All agencies',
    description: 'Every agency whose user account is active.',
    // Agency has no `user` relation — it owns a user id instead, so the
    // active check is a relation filter on the owner rather than `activeUser`.
    count: (prisma) =>
      prisma.agency.count({
        where: { owner: { status: UserStatus.ACTIVE } },
      }),
    page: async (prisma, cursor, take) => {
      const rows = await prisma.agency.findMany({
        where: { owner: { status: UserStatus.ACTIVE } },
        orderBy: { id: 'asc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
};
