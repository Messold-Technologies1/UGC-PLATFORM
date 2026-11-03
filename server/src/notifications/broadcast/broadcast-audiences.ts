import { BroadcastAudience, UserStatus } from '@prisma/client';
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
