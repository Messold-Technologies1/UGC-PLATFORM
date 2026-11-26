import {
  ApprovalStatus,
  NotificationRecipientRole,
  type Prisma,
  SocialConnectionStatus,
} from '@prisma/client';
import {
  resolveBrandMailAddress,
  resolveBrandMailDisplayName,
} from '../../mail/brand-mail.recipient';
import { isProfileFirstOnboardingMode } from '../../config/creator-onboarding-mode';
import {
  ALWAYS_RELEVANT,
  defineEvents,
  type EventContext,
  type ResolvedRecipient,
} from './define-events';
import { omitBlank } from './order-context';

const { CREATOR, BRAND } = NotificationRecipientRole;

const creatorProfileSelect = {
  id: true,
  displayName: true,
  contactEmail: true,
  user: { select: { id: true, email: true, name: true, phone: true } },
} as const satisfies Prisma.CreatorProfileSelect;

async function loadCreator(ctx: EventContext, id: string) {
  return ctx.prisma.creatorProfile.findUnique({
    where: { id },
    select: creatorProfileSelect,
  });
}

type CreatorRow = NonNullable<Awaited<ReturnType<typeof loadCreator>>>;

const creatorName = (p: CreatorRow): string =>
  p.displayName?.trim() || p.user.name?.trim() || 'Creator';

function toCreatorProfile(
  p: CreatorRow,
  vars: Record<string, string | number | boolean | null>,
): ResolvedRecipient {
  return {
    userId: p.user.id,
    profileType: 'creator',
    profileId: p.id,
    email: p.contactEmail?.trim() || p.user.email?.trim() || null,
    phone: p.user.phone,
    vars: { recipientName: creatorName(p), ...vars },
  };
}

const creatorSettingsUrl = (ctx: EventContext) =>
  `${ctx.frontendBaseUrl}/creator/settings/profile`;

/**
 * Creator- and brand-profile events.
 *
 * `password-reset` is deliberately NOT here — see the note at the bottom of
 * this file.
 */
export const profileEvents = defineEvents({
  'creator-profile-approved': {
    label: 'Creator profile approved',
    recipient: CREATOR,
    vars: {
      recipientName: { type: 'string', example: 'Ananya R' },
      actionUrl: { type: 'url', example: '/creator/account' },
    },
    resolve: async (ctx, id) => {
      const p = await loadCreator(ctx, id);
      if (!p) return null;
      return toCreatorProfile(p, {
        actionUrl: `${ctx.frontendBaseUrl}/creator/account`,
      });
    },
    // A record of something that happened, so a delayed copy is still true.
    stillRelevant: ALWAYS_RELEVANT,
  },

  'creator-profile-rejected': {
    label: 'Creator profile rejected',
    recipient: CREATOR,
    vars: {
      recipientName: { type: 'string', example: 'Ananya R' },
      rejectionReason: {
        type: 'string',
        example: 'Portfolio videos are too low resolution.',
      },
      actionUrl: { type: 'url', example: '/creator/settings/profile' },
    },
    resolve: async (ctx, id) => {
      const p = await loadCreator(ctx, id);
      if (!p) return null;
      // The reason is stored on the approval record, not passed in any more.
      const approval = await ctx.prisma.creatorApproval.findUnique({
        where: { creatorId: id },
        select: { rejectionReason: true },
      });
      // The email copy reads the same whichever onboarding mode is on, so no
      // mode flag goes out with it. actionUrl stays because the WhatsApp
      // bridge uses it as the button target, and only profile-first
      // onboarding has a route back into editing to point it at.
      const profileFirst = isProfileFirstOnboardingMode(
        ctx.config.get<string>('CREATOR_ONBOARDING_MODE'),
      );
      return toCreatorProfile(
        p,
        omitBlank({
          rejectionReason: approval?.rejectionReason?.trim() ?? '',
          actionUrl: profileFirst ? creatorSettingsUrl(ctx) : '',
        }),
      );
    },
    // A record of something that happened, so a delayed copy is still true.
    stillRelevant: ALWAYS_RELEVANT,
  },

  'creator-profile-completion-reminder': {
    label: 'Creator profile incomplete — reminder',
    description:
      'Nudges a creator whose profile is still building. Swept across every building profile rather than only recent signups.',
    recipient: CREATOR,
    vars: {
      recipientName: { type: 'string', example: 'Ananya R' },
      actionUrl: { type: 'url', example: '/creator/settings/profile' },
    },
    resolve: async (ctx, id) => {
      const p = await loadCreator(ctx, id);
      if (!p) return null;
      return toCreatorProfile(p, { actionUrl: creatorSettingsUrl(ctx) });
    },
    // Stop the moment the profile is finished.
    stillRelevant: async (ctx, id) => {
      const p = await ctx.prisma.creatorProfile.findUnique({
        where: { id },
        select: { completeProfile: true },
      });
      // null rather than false: no profile means the worker cannot see it,
      // which is a different thing from a creator who finished.
      if (!p) return null;
      return !p.completeProfile;
    },

    /**
     * Swept daily across EVERY building profile, with no time window.
     *
     * The legacy job only reached creators inside a ~10 day backfill window,
     * so anyone older never heard from it again. Removing the window is the
     * point: the reminder should reach the whole backlog.
     */
    population: {
      cron: '0 10 * * *',
      highestDueOnly: true,
      page: async (ctx, cursor, take) => {
        const rows = await ctx.prisma.creatorProfile.findMany({
          where: { completeProfile: false },
          // Keyset, not OFFSET: offset paging degrades quadratically, and on
          // Neon that is real money.
          orderBy: { id: 'asc' },
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: { id: true, completionReminderStartedAt: true },
        });
        return rows.map((row) => ({
          id: row.id,
          clockAt: row.completionReminderStartedAt,
        }));
      },
    },
  },

  'creator-profile-resubmit-reminder': {
    label: 'Creator profile withdrawn — resubmit reminder',
    recipient: CREATOR,
    vars: {
      recipientName: { type: 'string', example: 'Ananya R' },
      actionUrl: { type: 'url', example: '/creator/settings/profile' },
    },
    resolve: async (ctx, id) => {
      const p = await loadCreator(ctx, id);
      if (!p) return null;
      return toCreatorProfile(p, { actionUrl: creatorSettingsUrl(ctx) });
    },
    // Resubmitting flips the status away from WITHDRAWN, which ends the drip.
    stillRelevant: async (ctx, id) => {
      // Read through the profile rather than straight at CreatorApproval: a
      // missing approval row and a missing creator are different answers, and
      // querying the approval alone cannot tell them apart.
      const p = await ctx.prisma.creatorProfile.findUnique({
        where: { id },
        select: { creatorApproval: { select: { status: true } } },
      });
      if (!p) return null;
      return p.creatorApproval?.status === ApprovalStatus.WITHDRAWN;
    },
  },

  'social-connection-expired': {
    label: 'Social connection expired',
    recipient: CREATOR,
    vars: {
      recipientName: { type: 'string', example: 'Ananya R' },
      providerName: { type: 'string', example: 'Instagram' },
      actionUrl: { type: 'url', example: '/creator/settings/profile' },
    },
    resolve: async (ctx, id) => {
      const p = await loadCreator(ctx, id);
      if (!p) return null;
      const connection = await ctx.prisma.socialConnection.findFirst({
        where: { creatorProfileId: id },
        orderBy: { updatedAt: 'desc' },
        select: { platform: true },
      });
      const platform = connection?.platform ?? 'INSTAGRAM';
      return toCreatorProfile(p, {
        providerName: platform.charAt(0) + platform.slice(1).toLowerCase(),
        actionUrl: creatorSettingsUrl(ctx),
      });
    },
    // Stops once the creator reconnects — the connection goes back to ACTIVE.
    stillRelevant: async (ctx, id) => {
      // Through the profile for the same reason: "no expired connection left"
      // (they reconnected) and "no such creator" both came back as an empty
      // result before, and only one of them is a reason to stay quiet.
      const p = await ctx.prisma.creatorProfile.findUnique({
        where: { id },
        select: {
          socialConnections: {
            where: { status: { not: SocialConnectionStatus.ACTIVE } },
            select: { id: true },
            take: 1,
          },
        },
      });
      if (!p) return null;
      return p.socialConnections.length > 0;
    },
  },

  'brand-welcome': {
    label: 'Brand welcome',
    recipient: BRAND,
    vars: {
      recipientName: { type: 'string', example: 'Rohit S' },
      actionUrl: { type: 'url', example: '/brand/settings/profile' },
    },
    resolve: async (ctx, id) => {
      const profile = await ctx.prisma.brandProfile.findUnique({
        where: { id },
        select: {
          id: true,
          brandName: true,
          contactFullName: true,
          contactEmail: true,
          contactPhone: true,
        },
      });
      if (!profile) return null;

      const actorUserId =
        await ctx.brandAccess.resolveBrandActorUserIdForProfile(id);
      const user = await ctx.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { id: true, email: true, name: true, phone: true },
      });

      return {
        userId: user?.id ?? null,
        profileType: 'brand',
        profileId: profile.id,
        email: resolveBrandMailAddress({
          contactEmail: profile.contactEmail,
          accountEmail: user?.email,
        }),
        phone: profile.contactPhone?.trim() || user?.phone?.trim() || null,
        vars: {
          recipientName: resolveBrandMailDisplayName({
            contactFullName: profile.contactFullName,
            brandName: profile.brandName,
            accountName: user?.name,
            fallback: 'there',
          }),
          actionUrl: `${ctx.frontendBaseUrl}/brand/settings/profile`,
        },
      };
    },
    // A record of something that happened, so a delayed copy is still true.
    stillRelevant: ALWAYS_RELEVANT,
  },

  'brand-wishlist-no-order': {
    label: 'Brand saved creators but never ordered',
    description:
      'Nudges a brand that has added creators to a wishlist but has not placed a paid order yet. Swept across every brand in that state, timed from when they first saved a creator; stops the moment they pay for an order.',
    recipient: BRAND,
    vars: {
      recipientName: { type: 'string', example: 'Rohit S' },
      actionUrl: { type: 'url', example: '/brand/wishlists' },
    },
    resolve: async (ctx, id) => {
      const profile = await ctx.prisma.brandProfile.findUnique({
        where: { id },
        select: {
          id: true,
          brandName: true,
          contactFullName: true,
          contactEmail: true,
          contactPhone: true,
        },
      });
      if (!profile) return null;

      const actorUserId =
        await ctx.brandAccess.resolveBrandActorUserIdForProfile(id);
      const user = await ctx.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { id: true, email: true, name: true, phone: true },
      });

      return {
        userId: user?.id ?? null,
        profileType: 'brand',
        profileId: profile.id,
        email: resolveBrandMailAddress({
          contactEmail: profile.contactEmail,
          accountEmail: user?.email,
        }),
        phone: profile.contactPhone?.trim() || user?.phone?.trim() || null,
        vars: {
          recipientName: resolveBrandMailDisplayName({
            contactFullName: profile.contactFullName,
            brandName: profile.brandName,
            accountName: user?.name,
            fallback: 'there',
          }),
          actionUrl: `${ctx.frontendBaseUrl}/brand/wishlists`,
        },
      };
    },

    /**
     * Stop the moment the brand pays for an order. An abandoned, unpaid order
     * (PENDING_PAYMENT) is NOT engagement, so paidAt — not merely a row in the
     * orders table — is the exit. A brand that emptied its wishlist has nothing
     * to be nudged about either, so that ends it too.
     */
    stillRelevant: async (ctx, id) => {
      const brand = await ctx.prisma.brandProfile.findUnique({
        where: { id },
        select: { id: true },
      });
      // null, not false: a missing brand is the worker unable to see it, which
      // is a different thing from a brand that has since ordered.
      if (!brand) return null;

      const paidOrders = await ctx.prisma.order.count({
        where: { brandId: id, paidAt: { not: null } },
      });
      if (paidOrders > 0) return false;

      const savedCreators = await ctx.prisma.brandWishlistCreator.count({
        where: { wishlist: { brandId: id } },
      });
      return savedCreators > 0;
    },

    /**
     * Swept across every brand that has saved a creator and not yet paid for an
     * order, with no time window so the whole backlog is reached. The drip
     * clock starts from the brand's earliest wishlist save; `highestDueOnly`
     * (set by the sweep) means a long-standing brand gets one catch-up rather
     * than the whole drip at once.
     */
    population: {
      cron: '0 11 * * *',
      highestDueOnly: true,
      page: async (ctx, cursor, take) => {
        const brands = await ctx.prisma.brandProfile.findMany({
          where: {
            // No paid order yet — an unpaid, abandoned order does not count.
            orders: { none: { paidAt: { not: null } } },
            // At least one creator saved to at least one wishlist.
            wishlists: { some: { creators: { some: {} } } },
          },
          // Keyset, not OFFSET: offset paging degrades quadratically, and on
          // Neon that is real money.
          orderBy: { id: 'asc' },
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
            id: true,
            createdAt: true,
            wishlists: {
              where: { creators: { some: {} } },
              select: {
                creators: {
                  select: { createdAt: true },
                  orderBy: { createdAt: 'asc' },
                  take: 1,
                },
              },
            },
          },
        });
        return brands.map((b) => {
          const stamps = b.wishlists.flatMap((w) =>
            w.creators.map((c) => c.createdAt.getTime()),
          );
          // Earliest save across all the brand's wishlists; the brand's own
          // createdAt only as a defensive fallback (the where-clause guarantees
          // at least one save, so stamps is non-empty in practice).
          const clockAt = stamps.length
            ? new Date(Math.min(...stamps))
            : b.createdAt;
          return { id: b.id, clockAt };
        });
      },
    },
  },

  'brand-never-ordered': {
    label: 'Brand signed up but never ordered',
    description:
      "Re-engages a brand that registered but has never placed a paid order AND has not saved any creators — the 'cold' brands. A brand that builds a wishlist moves to the wishlist nudge instead, so the two never overlap. Clocked from signup; stops once the brand pays for an order.",
    recipient: BRAND,
    vars: {
      recipientName: { type: 'string', example: 'Rohit S' },
      actionUrl: { type: 'url', example: '/brand/creators' },
    },
    resolve: async (ctx, id) => {
      const profile = await ctx.prisma.brandProfile.findUnique({
        where: { id },
        select: {
          id: true,
          brandName: true,
          contactFullName: true,
          contactEmail: true,
          contactPhone: true,
        },
      });
      if (!profile) return null;

      const actorUserId =
        await ctx.brandAccess.resolveBrandActorUserIdForProfile(id);
      const user = await ctx.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { id: true, email: true, name: true, phone: true },
      });

      return {
        userId: user?.id ?? null,
        profileType: 'brand',
        profileId: profile.id,
        email: resolveBrandMailAddress({
          contactEmail: profile.contactEmail,
          accountEmail: user?.email,
        }),
        phone: profile.contactPhone?.trim() || user?.phone?.trim() || null,
        vars: {
          recipientName: resolveBrandMailDisplayName({
            contactFullName: profile.contactFullName,
            brandName: profile.brandName,
            accountName: user?.name,
            fallback: 'there',
          }),
          actionUrl: `${ctx.frontendBaseUrl}/brand/creators`,
        },
      };
    },

    /**
     * Stops once the brand pays for an order (abandoned, unpaid orders do not
     * count), OR once they save a creator — a wishlist means they are warm, and
     * the brand-wishlist-no-order drip takes over from here so the two never
     * both fire. null, not false, when the brand is gone.
     */
    stillRelevant: async (ctx, id) => {
      const brand = await ctx.prisma.brandProfile.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!brand) return null;

      const paidOrders = await ctx.prisma.order.count({
        where: { brandId: id, paidAt: { not: null } },
      });
      if (paidOrders > 0) return false;

      const savedCreators = await ctx.prisma.brandWishlistCreator.count({
        where: { wishlist: { brandId: id } },
      });
      return savedCreators === 0;
    },

    /**
     * Swept across every brand that registered, never paid for an order and has
     * saved no creators, clocked from signup. highestDueOnly gives a brand that
     * pre-dates the drip a single catch-up rather than the whole series at once.
     */
    population: {
      cron: '0 12 * * *',
      highestDueOnly: true,
      page: async (ctx, cursor, take) => {
        const brands = await ctx.prisma.brandProfile.findMany({
          where: {
            orders: { none: { paidAt: { not: null } } },
            // No creator saved to any wishlist — a saved creator makes the
            // brand 'warm', and the wishlist drip owns those.
            wishlists: { none: { creators: { some: {} } } },
          },
          orderBy: { id: 'asc' },
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: { id: true, createdAt: true },
        });
        return brands.map((b) => ({ id: b.id, clockAt: b.createdAt }));
      },
    },
  },
});

/**
 * Why `password-reset` is not in the catalog.
 *
 * Every event here resolves its variables at SEND time by re-reading the
 * database. A password reset link cannot work that way: only the token's
 * *hash* is stored (`PasswordResetToken.tokenHash`), so the raw token in the
 * URL is unrecoverable by design. Carrying it in the queue payload instead
 * would put live reset tokens in Redis, which is a worse trade than leaving
 * this one event alone.
 *
 * So password-reset keeps calling `MailService.send()` directly. It loses
 * nothing that matters: it is already `alwaysSend`, immediate, email-only
 * (`whatsAppTemplateNameForEmail` returns null for it), and there is no useful
 * schedule an admin would ever configure for it. Its *template* still lives in
 * the database and stays editable in admin, because the renderer resolves
 * templates independently of the event catalog.
 */
export const EVENTS_NOT_IN_CATALOG = ['password-reset'] as const;
