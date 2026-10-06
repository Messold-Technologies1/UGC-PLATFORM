import type { Prisma } from '@prisma/client';
import {
  resolveBrandMailAddress,
  resolveBrandMailDisplayName,
} from '../../mail/brand-mail.recipient';
import type {
  EventContext,
  ResolvedRecipient,
  TemplateVars,
} from './define-events';

/**
 * Shared loading, recipient resolution and formatting for every order event.
 *
 * Ported from the private helpers on OrderMailNotifier so the migrated events
 * address exactly the same people and render exactly the same strings. The
 * difference is *when*: this runs at send time, so a reminder that fires days
 * later reflects the order as it stands then.
 */

export const orderSelect = {
  id: true,
  status: true,
  packageNameSnapshot: true,
  priceAmountSnapshot: true,
  currency: true,
  revisionCount: true,
  maxRevisionsSnapshot: true,
  usageRightsExtraDays: true,
  courierName: true,
  trackingId: true,
  dispatchedAt: true,
  deliveryDueAt: true,
  deliveredAt: true,
  briefSubmittedAt: true,
  briefAcceptedAt: true,
  cancellationReason: true,
  cancelledAt: true,
  refundedAt: true,
  brand: {
    select: {
      id: true,
      brandName: true,
      contactEmail: true,
      contactPhone: true,
      contactFullName: true,
      userId: true,
      agency: { select: { ownerUserId: true } },
    },
  },
  // An order has exactly one buyer: a standalone brand or an agency. Both
  // columns are nullable, so every buyer-side helper below checks the agency
  // first and falls back to the brand.
  agency: {
    select: {
      id: true,
      name: true,
      contactEmail: true,
      contactPhone: true,
      contactFullName: true,
      ownerUserId: true,
    },
  },
  creator: {
    select: {
      id: true,
      displayName: true,
      contactEmail: true,
      user: { select: { id: true, email: true, name: true, phone: true } },
    },
  },
} as const;

export type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

export async function loadOrder(
  ctx: EventContext,
  orderId: string,
): Promise<OrderRow | null> {
  return ctx.prisma.order.findUnique({
    where: { id: orderId },
    select: orderSelect,
  });
}

/**
 * Counterparty label for creator-facing copy (`{{brandName}}`). Agency orders
 * must show the agency name — never the client brand behind it.
 */
export function brandDisplayName(order: OrderRow): string {
  if (order.agency?.name?.trim()) return order.agency.name.trim();
  if (!order.brand) return 'Brand';
  return resolveBrandMailDisplayName({
    contactFullName: order.brand.contactFullName,
    brandName: order.brand.brandName,
    fallback: 'Brand',
  });
}

export function creatorDisplayName(order: OrderRow): string {
  return (
    order.creator.displayName?.trim() ||
    order.creator.user.name?.trim() ||
    'Creator'
  );
}

/** Contact email first, account email second — matching the notifier. */
export function creatorEmail(order: OrderRow): string | null {
  return (
    order.creator.contactEmail?.trim() ||
    order.creator.user.email?.trim() ||
    null
  );
}

/** Addresses the creator side of an order. Synchronous: everything needed is
 * already on the loaded row. */
export function toCreator(
  order: OrderRow,
  vars: TemplateVars,
): ResolvedRecipient {
  return {
    userId: order.creator.user.id,
    profileType: 'creator',
    profileId: order.creator.id,
    email: creatorEmail(order),
    phone: order.creator.user.phone,
    vars: { recipientName: creatorDisplayName(order), ...vars },
  };
}

/**
 * Addresses the buyer side of an order.
 *
 * An agency order goes to the agency owner, gated on the agency. Otherwise the
 * account is resolved through BrandAccessService, because an agency-managed
 * brand's mail goes to the agency owner too.
 */
export async function toBrand(
  ctx: EventContext,
  order: OrderRow,
  vars: TemplateVars,
): Promise<ResolvedRecipient> {
  if (order.agency) {
    const owner = await ctx.prisma.user.findUnique({
      where: { id: order.agency.ownerUserId },
      select: { id: true, email: true, name: true, phone: true },
    });
    return {
      userId: owner?.id ?? null,
      profileType: 'agency',
      profileId: order.agency.id,
      email: resolveBrandMailAddress({
        contactEmail: order.agency.contactEmail,
        accountEmail: owner?.email,
      }),
      phone: order.agency.contactPhone?.trim() || owner?.phone?.trim() || null,
      vars: {
        recipientName: resolveBrandMailDisplayName({
          contactFullName: order.agency.contactFullName,
          brandName: order.agency.name,
          accountName: owner?.name,
        }),
        ...vars,
      },
    };
  }

  // Neither buyer set: the row is unusable, so address nobody. The step service
  // skips a recipient with no address rather than sending into the void.
  if (!order.brand) {
    return {
      userId: null,
      email: null,
      phone: null,
      vars: { recipientName: 'Brand', ...vars },
    };
  }

  const brandUserId = await ctx.brandAccess.resolveBrandActorUserIdForProfile(
    order.brand.id,
  );
  const user = await ctx.prisma.user.findUnique({
    where: { id: brandUserId },
    select: { id: true, email: true, name: true, phone: true },
  });

  const name = resolveBrandMailDisplayName({
    contactFullName: order.brand.contactFullName,
    brandName: order.brand.brandName,
    accountName: user?.name,
  });

  return {
    userId: user?.id ?? null,
    profileType: 'brand',
    profileId: order.brand.id,
    email: resolveBrandMailAddress({
      contactEmail: order.brand.contactEmail,
      accountEmail: user?.email,
    }),
    // The brand's stated contact phone wins over the account phone.
    phone: order.brand.contactPhone?.trim() || user?.phone?.trim() || null,
    vars: { recipientName: name, ...vars },
  };
}

// ---- links ----

export const brandOrderUrl = (ctx: EventContext, orderId: string): string =>
  `${ctx.frontendBaseUrl}/brand/orders/${orderId}`;

export const creatorOrderUrl = (ctx: EventContext, orderId: string): string =>
  `${ctx.frontendBaseUrl}/creator/orders/${orderId}`;

export const creatorOrderBriefUrl = (
  ctx: EventContext,
  orderId: string,
): string => `${ctx.frontendBaseUrl}/creator/orders/${orderId}/brief`;

export function creatorOrderListUrl(
  ctx: EventContext,
  orderId: string,
  tab?: string,
): string {
  const params = new URLSearchParams({ orderId });
  if (tab) params.set('tab', tab);
  return `${ctx.frontendBaseUrl}/creator/orders?${params.toString()}`;
}

// ---- formatting ----

/** IST, matching every existing template's rendered dates. */
export function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

export function formatMoney(amount: Prisma.Decimal, currency: string): string {
  const value = Number.parseFloat(amount.toString());
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(
    value,
  );
}

/** Drops empty optional vars so a template's `{{#if}}` blocks behave as before. */
export function omitBlank(vars: TemplateVars): TemplateVars {
  const out: TemplateVars = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v === null || v === undefined || v === '') continue;
    out[k] = v;
  }
  return out;
}
