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

/**
 * Agency↔brand partner link events.
 *
 * The direction is the thing to keep straight: the AGENCY owns the partner
 * code, the BRAND redeems it, and the AGENCY accepts. So the request mail goes
 * to the agency (they have to act on it) and the outcome mail goes back to the
 * brand (they are waiting on it).
 *
 * Every event is keyed on the AgencyBrandLink row id, so `resolve()` can read
 * the current state of the relationship and address whichever side this
 * particular message is for.
 */

const { BRAND } = NotificationRecipientRole;

const linkSelect = {
  id: true,
  status: true,
  agency: {
    select: {
      id: true,
      name: true,
      contactFullName: true,
      contactEmail: true,
      contactPhone: true,
      ownerUserId: true,
    },
  },
  brand: {
    select: {
      id: true,
      brandName: true,
      contactFullName: true,
      contactEmail: true,
      contactPhone: true,
      user: { select: { id: true, email: true, name: true, phone: true } },
    },
  },
} as const satisfies Prisma.AgencyBrandLinkSelect;

async function loadLink(ctx: EventContext, id: string) {
  return ctx.prisma.agencyBrandLink.findUnique({
    where: { id },
    select: linkSelect,
  });
}

type LinkRow = NonNullable<Awaited<ReturnType<typeof loadLink>>>;

const brandLabel = (link: LinkRow): string =>
  link.brand.brandName?.trim() ||
  link.brand.contactFullName?.trim() ||
  'A brand';

/** Addresses the AGENCY side. */
async function toAgencyRecipient(
  ctx: EventContext,
  link: LinkRow,
  vars: Record<string, string | number | boolean | null>,
): Promise<ResolvedRecipient> {
  const owner = await ctx.prisma.user.findUnique({
    where: { id: link.agency.ownerUserId },
    select: { email: true, name: true, phone: true },
  });

  return {
    userId: link.agency.ownerUserId,
    profileType: 'agency',
    profileId: link.agency.id,
    email: resolveBrandMailAddress({
      contactEmail: link.agency.contactEmail,
      accountEmail: owner?.email,
    }),
    phone: link.agency.contactPhone?.trim() || owner?.phone?.trim() || null,
    vars: {
      recipientName: resolveBrandMailDisplayName({
        contactFullName: link.agency.contactFullName,
        brandName: link.agency.name,
        accountName: owner?.name,
      }),
      ...vars,
    },
  };
}

/** Addresses the BRAND side. */
function toBrandRecipient(
  link: LinkRow,
  vars: Record<string, string | number | boolean | null>,
): ResolvedRecipient {
  return {
    userId: link.brand.user?.id ?? null,
    profileType: 'brand',
    profileId: link.brand.id,
    email: resolveBrandMailAddress({
      contactEmail: link.brand.contactEmail,
      accountEmail: link.brand.user?.email,
    }),
    phone:
      link.brand.contactPhone?.trim() || link.brand.user?.phone?.trim() || null,
    vars: {
      recipientName: resolveBrandMailDisplayName({
        contactFullName: link.brand.contactFullName,
        brandName: link.brand.brandName,
        accountName: link.brand.user?.name,
      }),
      ...vars,
    },
  };
}

export const agencyLinkEvents = defineEvents({
  'agency-link-requested': {
    label: 'Brand asked an agency to manage them',
    // Goes to the agency: they are the ones who have to accept or decline.
    recipient: BRAND,
    vars: {
      recipientName: { type: 'string', example: 'Best Agency' },
      brandName: { type: 'string', example: 'Acme' },
      actionUrl: { type: 'url', example: '/agency/brands' },
    },
    resolve: async (ctx, id) => {
      const link = await loadLink(ctx, id);
      if (!link) return null;
      return toAgencyRecipient(ctx, link, {
        brandName: brandLabel(link),
        actionUrl: `${ctx.frontendBaseUrl}/agency/brands`,
      });
    },
    /**
     * A pending request is a standing ask, so a delayed copy is only worth
     * sending while it is still pending — once answered the mail would be
     * telling the agency to do something they have already done.
     */
    stillRelevant: async (ctx, id) => {
      const link = await loadLink(ctx, id);
      return link?.status === 'PENDING';
    },
  },

  'agency-link-accepted': {
    label: 'Agency accepted a brand',
    recipient: BRAND,
    vars: {
      recipientName: { type: 'string', example: 'Jane Doe' },
      agencyName: { type: 'string', example: 'Best Agency' },
      actionUrl: { type: 'url', example: '/brand/settings/profile' },
    },
    resolve: async (ctx, id) => {
      const link = await loadLink(ctx, id);
      if (!link) return null;
      return toBrandRecipient(link, {
        agencyName: link.agency.name,
        actionUrl: `${ctx.frontendBaseUrl}/brand/settings/profile`,
      });
    },
    // A record of something that happened, so a delayed copy is still true.
    stillRelevant: ALWAYS_RELEVANT,
  },

  'agency-link-rejected': {
    label: 'Agency declined a brand',
    recipient: BRAND,
    vars: {
      recipientName: { type: 'string', example: 'Jane Doe' },
      agencyName: { type: 'string', example: 'Best Agency' },
      actionUrl: { type: 'url', example: '/brand/settings/profile' },
    },
    resolve: async (ctx, id) => {
      const link = await loadLink(ctx, id);
      if (!link) return null;
      return toBrandRecipient(link, {
        agencyName: link.agency.name,
        actionUrl: `${ctx.frontendBaseUrl}/brand/settings/profile`,
      });
    },
    stillRelevant: ALWAYS_RELEVANT,
  },

  'agency-link-ended': {
    label: 'Agency stopped managing a brand',
    // Addressed to the agency, because the brand is usually the one ending it
    // and already knows. An agency that walked away gets a harmless receipt.
    recipient: BRAND,
    vars: {
      recipientName: { type: 'string', example: 'Best Agency' },
      brandName: { type: 'string', example: 'Acme' },
      actionUrl: { type: 'url', example: '/agency/brands' },
    },
    resolve: async (ctx, id) => {
      const link = await loadLink(ctx, id);
      if (!link) return null;
      return toAgencyRecipient(ctx, link, {
        brandName: brandLabel(link),
        actionUrl: `${ctx.frontendBaseUrl}/agency/brands`,
      });
    },
    stillRelevant: ALWAYS_RELEVANT,
  },
});
