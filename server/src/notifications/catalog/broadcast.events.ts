import { NotificationRecipientRole, type Prisma } from '@prisma/client';
import {
  resolveBrandMailAddress,
  resolveBrandMailDisplayName,
} from '../../mail/brand-mail.recipient';
import {
  ALWAYS_RELEVANT,
  defineEvents,
  type EventContext,
  type ResolvedRecipient,
} from './define-events';

const { CREATOR, BRAND } = NotificationRecipientRole;

/**
 * Announcements sent to a standing audience.
 *
 * These are the only events nothing in the product emits. A broadcast run
 * (`NotificationBroadcast`) walks the audience and enqueues one step job per
 * profile, with the run's id as the occurrence key — which is what lets the
 * same audience be messaged again next month instead of the delivery log
 * refusing the second send as a duplicate.
 *
 * They are ordinary catalog events in every other respect, deliberately: the
 * opt-in booleans, the SES suppression list, the delivery log and the bulk
 * rate limiter all apply without a second implementation. An announcement is
 * marketing, so none of them is `alwaysSend` — anyone who has turned a channel
 * off stays off.
 *
 * Immediate only. A delayed broadcast would need a `stillRelevant` check, and
 * there is nothing to check: an announcement does not become irrelevant because
 * the recipient did something.
 */

const creatorSelect = {
  id: true,
  displayName: true,
  contactEmail: true,
  user: { select: { id: true, email: true, name: true, phone: true } },
} as const satisfies Prisma.CreatorProfileSelect;

const brandSelect = {
  id: true,
  brandName: true,
  contactFullName: true,
  contactEmail: true,
  contactPhone: true,
  user: { select: { id: true, email: true, name: true, phone: true } },
} as const satisfies Prisma.BrandProfileSelect;

const agencySelect = {
  id: true,
  name: true,
  ownerUserId: true,
  contactFullName: true,
  contactEmail: true,
  contactPhone: true,
} as const satisfies Prisma.AgencySelect;

async function creatorRecipient(
  ctx: EventContext,
  id: string,
): Promise<ResolvedRecipient | null> {
  const p = await ctx.prisma.creatorProfile.findUnique({
    where: { id },
    select: creatorSelect,
  });
  if (!p) return null;
  return {
    userId: p.user.id,
    profileType: 'creator',
    profileId: p.id,
    email: p.contactEmail?.trim() || p.user.email?.trim() || null,
    phone: p.user.phone,
    vars: {
      recipientName: p.displayName?.trim() || p.user.name?.trim() || 'Creator',
      actionUrl: `${ctx.frontendBaseUrl}/creator`,
    },
  };
}

async function brandRecipient(
  ctx: EventContext,
  id: string,
): Promise<ResolvedRecipient | null> {
  const b = await ctx.prisma.brandProfile.findUnique({
    where: { id },
    select: brandSelect,
  });
  if (!b) return null;
  return {
    userId: b.user?.id ?? null,
    profileType: 'brand',
    profileId: b.id,
    email: resolveBrandMailAddress({
      contactEmail: b.contactEmail,
      accountEmail: b.user?.email,
    }),
    phone: b.contactPhone?.trim() || b.user?.phone?.trim() || null,
    vars: {
      recipientName: resolveBrandMailDisplayName({
        contactFullName: b.contactFullName,
        brandName: b.brandName,
        accountName: b.user?.name,
      }),
      actionUrl: `${ctx.frontendBaseUrl}/brand`,
    },
  };
}

async function agencyRecipient(
  ctx: EventContext,
  id: string,
): Promise<ResolvedRecipient | null> {
  const a = await ctx.prisma.agency.findUnique({
    where: { id },
    select: agencySelect,
  });
  if (!a) return null;
  const owner = await ctx.prisma.user.findUnique({
    where: { id: a.ownerUserId },
    select: { email: true, name: true, phone: true },
  });
  return {
    userId: a.ownerUserId,
    profileType: 'agency',
    profileId: a.id,
    email: resolveBrandMailAddress({
      contactEmail: a.contactEmail,
      accountEmail: owner?.email,
    }),
    phone: a.contactPhone?.trim() || owner?.phone?.trim() || null,
    vars: {
      recipientName: resolveBrandMailDisplayName({
        contactFullName: a.contactFullName,
        brandName: a.name,
        accountName: owner?.name,
      }),
      actionUrl: `${ctx.frontendBaseUrl}/agency`,
    },
  };
}

/** Every broadcast carries the same two; the copy itself lives in the template. */
const broadcastVars = {
  recipientName: { type: 'string', example: 'Ananya R' },
  actionUrl: { type: 'url', example: '/creator' },
} as const;

export const BROADCAST_EVENTS = defineEvents({
  'broadcast-creators-open-to': {
    label: 'Announcement — creators with an "Open to" category',
    description:
      'Creators who have opted into at least one sensitive category (Gambling, Lingerie, Dating and so on). Sent only when an admin runs a broadcast.',
    recipient: CREATOR,
    vars: broadcastVars,
    resolve: creatorRecipient,
    stillRelevant: ALWAYS_RELEVANT,
  },

  'broadcast-creators-listed': {
    label: 'Announcement — all listed creators',
    description:
      'Every creator whose profile is live in browse. Sent only when an admin runs a broadcast.',
    recipient: CREATOR,
    vars: broadcastVars,
    resolve: creatorRecipient,
    stillRelevant: ALWAYS_RELEVANT,
  },

  'broadcast-brands': {
    label: 'Announcement — all brands',
    description:
      'Every brand with an active account. Sent only when an admin runs a broadcast.',
    recipient: BRAND,
    vars: { ...broadcastVars, actionUrl: { type: 'url', example: '/brand' } },
    resolve: brandRecipient,
    stillRelevant: ALWAYS_RELEVANT,
  },

  'broadcast-agencies': {
    label: 'Announcement — all agencies',
    description:
      'Every agency with an active account. Sent only when an admin runs a broadcast.',
    // No AGENCY role in the enum; agency-facing events already use BRAND.
    recipient: BRAND,
    vars: { ...broadcastVars, actionUrl: { type: 'url', example: '/agency' } },
    resolve: agencyRecipient,
    stillRelevant: ALWAYS_RELEVANT,
  },
});
