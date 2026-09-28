import { NotificationRecipientRole, OrderStatus } from '@prisma/client';
import { defineEvents } from './define-events';
import {
  brandDisplayName,
  brandOrderUrl,
  creatorDisplayName,
  creatorOrderBriefUrl,
  creatorOrderListUrl,
  creatorOrderUrl,
  formatDate,
  formatMoney,
  loadOrder,
  omitBlank,
  toBrand,
  toCreator,
} from './order-context';

const { CREATOR, BRAND } = NotificationRecipientRole;

/** Vars every order template already receives. */
const commonVars = {
  recipientName: { type: 'string', example: 'Ananya R' },
  orderId: { type: 'string', example: 'ord_8f21c4' },
  packageName: { type: 'string', example: 'Standard — 3 reels' },
  actionUrl: { type: 'url', example: '/creator/orders/ord_8f21c4' },
} as const;

/** The only outcome the resolve path currently emits (the no-refund path). */
const DISPUTE_CONTINUED_MESSAGE =
  'The order will continue from the stage it was in before the dispute.';

const brandNameVar = {
  brandName: { type: 'string', example: 'Acme Beauty' },
} as const;
const creatorNameVar = {
  creatorName: { type: 'string', example: 'Ananya R' },
} as const;

/**
 * Order lifecycle events.
 *
 * One entry per template key, so the key names the recipient exactly as the
 * templates already do. Several of today's `notify*` methods mail both parties
 * from one call; those become two events, which is what lets an admin turn one
 * side off without the other.
 *
 * Every `resolve()` is a port of the corresponding notifier method, minus the
 * send. Values that used to arrive as call arguments are re-read from the row
 * instead — all of them are persisted (courier and tracking, revision notes,
 * cancellation reason, refunded-at), which is what makes resolving at send
 * time possible.
 */
export const orderEvents = defineEvents({
  // ---- brief ----

  'order-brief-submitted-for-creator': {
    label: 'Brief submitted — to creator',
    description:
      'Brand submitted the creative brief; the creator must accept or reject it.',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      ...brandNameVar,
      briefSubmittedAt: { type: 'date', example: '28 Sep 2026, 4:30 pm' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toCreator(order, {
        brandName: brandDisplayName(order.brand),
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        briefSubmittedAt: formatDate(order.briefSubmittedAt),
        actionUrl: creatorOrderBriefUrl(ctx, order.id),
      });
    },
    // The nudge stops the moment the creator acts on the brief.
    stillRelevant: async (ctx, id) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id },
        select: { status: true },
      });
      return order?.status === OrderStatus.BRIEF_SUBMITTED;
    },
  },

  'order-brief-accepted-for-brand': {
    label: 'Brief accepted — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      ...creatorNameVar,
      deliveryDueAt: { type: 'date', example: '05 Oct 2026, 6:00 pm' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toBrand(
        ctx,
        order,
        omitBlank({
          creatorName: creatorDisplayName(order),
          orderId: order.id,
          deliveryDueAt: formatDate(order.deliveryDueAt),
          actionUrl: brandOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-brief-rejected-for-brand': {
    label: 'Brief rejected by creator — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      rejectionNote: { type: 'string', example: 'Outside my content niche.' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toBrand(
        ctx,
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          rejectionNote: order.cancellationReason ?? '',
          actionUrl: brandOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-brief-rejected-for-creator': {
    label: 'Brief rejected by creator — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      ...brandNameVar,
      rejectionNote: { type: 'string', example: 'Outside my content niche.' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toCreator(
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          rejectionNote: order.cancellationReason ?? '',
          brandName: brandDisplayName(order.brand),
          actionUrl: creatorOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  // ---- shipping ----

  'order-product-shipped-for-creator': {
    label: 'Product shipped — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      ...brandNameVar,
      courierName: { type: 'string', example: 'Delhivery' },
      trackingId: { type: 'string', example: 'DL1234567890' },
      dispatchedAt: { type: 'date', example: '28 Sep 2026, 11:00 am' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toCreator(
        order,
        omitBlank({
          brandName: brandDisplayName(order.brand),
          orderId: order.id,
          courierName: order.courierName ?? '',
          trackingId: order.trackingId ?? '',
          dispatchedAt: formatDate(order.dispatchedAt),
          actionUrl: creatorOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-product-received-for-brand': {
    label: 'Product received by creator — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      ...creatorNameVar,
      deliveryDueAt: { type: 'date', example: '05 Oct 2026, 6:00 pm' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toBrand(ctx, order, {
        creatorName: creatorDisplayName(order),
        orderId: order.id,
        deliveryDueAt: formatDate(order.deliveryDueAt),
        actionUrl: brandOrderUrl(ctx, order.id),
      });
    },
  },

  // ---- revisions ----

  'order-revision-requested-for-creator': {
    label: 'Revision requested — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      ...brandNameVar,
      revisionNumber: { type: 'number', example: '1' },
      revisionsRemaining: { type: 'number', example: '2' },
      revisionNote: { type: 'string', example: 'Please reshoot the opening.' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      // The note used to arrive as an argument; it lives on the revision row.
      const revision = await ctx.prisma.orderRevision.findFirst({
        where: { orderId: order.id },
        orderBy: { revisionNumber: 'desc' },
        select: { note: true },
      });
      return toCreator(
        order,
        omitBlank({
          brandName: brandDisplayName(order.brand),
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          revisionNumber: String(order.revisionCount),
          revisionsRemaining: String(
            Math.max(0, order.maxRevisionsSnapshot - order.revisionCount),
          ),
          revisionNote: revision?.note?.trim() ?? '',
          actionUrl: creatorOrderListUrl(ctx, order.id, 'revisions'),
        }),
      );
    },
  },

  'order-extra-revisions-purchased-for-creator': {
    label: 'Extra revisions purchased — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      ...brandNameVar,
      revisionsAdded: { type: 'number', example: '2' },
      maxRevisions: { type: 'number', example: '5' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      const purchase = await ctx.prisma.orderRevisionPurchase.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
        select: { revisionsAdded: true },
      });
      return toCreator(order, {
        brandName: brandDisplayName(order.brand),
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        revisionsAdded: String(purchase?.revisionsAdded ?? 0),
        maxRevisions: String(order.maxRevisionsSnapshot),
        actionUrl: creatorOrderListUrl(ctx, order.id, 'revisions'),
      });
    },
  },

  'order-extra-revisions-purchased-for-brand': {
    label: 'Extra revisions purchased — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      ...brandNameVar,
      revisionsAdded: { type: 'number', example: '2' },
      maxRevisions: { type: 'number', example: '5' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      const purchase = await ctx.prisma.orderRevisionPurchase.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
        select: { revisionsAdded: true },
      });
      return toBrand(ctx, order, {
        brandName: brandDisplayName(order.brand),
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        revisionsAdded: String(purchase?.revisionsAdded ?? 0),
        maxRevisions: String(order.maxRevisionsSnapshot),
        actionUrl: brandOrderUrl(ctx, order.id),
      });
    },
  },

  // ---- usage rights ----

  'order-extra-usage-rights-purchased-for-brand': {
    label: 'Extra usage rights purchased — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      ...brandNameVar,
      ...creatorNameVar,
      daysAdded: { type: 'number', example: '30' },
      totalUsageDays: { type: 'number', example: '60' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      const purchase = await ctx.prisma.orderUsageRightsPurchase.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
        select: { daysAdded: true },
      });
      return toBrand(ctx, order, {
        brandName: brandDisplayName(order.brand),
        creatorName: creatorDisplayName(order),
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        daysAdded: String(purchase?.daysAdded ?? 0),
        // The base licence is 30 days; extras accumulate on the order.
        totalUsageDays: String(30 + order.usageRightsExtraDays),
        actionUrl: brandOrderUrl(ctx, order.id),
      });
    },
  },

  'order-extra-usage-rights-purchased-for-creator': {
    label: 'Extra usage rights purchased — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      ...brandNameVar,
      ...creatorNameVar,
      daysAdded: { type: 'number', example: '30' },
      totalUsageDays: { type: 'number', example: '60' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      const purchase = await ctx.prisma.orderUsageRightsPurchase.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
        select: { daysAdded: true },
      });
      return toCreator(order, {
        brandName: brandDisplayName(order.brand),
        creatorName: creatorDisplayName(order),
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        daysAdded: String(purchase?.daysAdded ?? 0),
        totalUsageDays: String(30 + order.usageRightsExtraDays),
        actionUrl: creatorOrderListUrl(ctx, order.id, 'completed'),
      });
    },
  },

  // ---- delivery and completion ----

  'order-content-delivered-for-brand': {
    label: 'Content delivered — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      ...creatorNameVar,
      deliveredAt: { type: 'date', example: '02 Oct 2026, 1:15 pm' },
      revisionNumber: { type: 'number', example: '1' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      const delivery = await ctx.prisma.orderDelivery.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
        select: { revisionNumber: true, createdAt: true },
      });
      return toBrand(
        ctx,
        order,
        omitBlank({
          creatorName: creatorDisplayName(order),
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          deliveredAt: formatDate(delivery?.createdAt ?? order.deliveredAt),
          // Only set past the first delivery, matching the template's `{{#if}}`.
          revisionNumber:
            delivery && delivery.revisionNumber > 0
              ? String(delivery.revisionNumber)
              : '',
          actionUrl: brandOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-content-accepted-for-creator': {
    label: 'Content accepted — to creator',
    recipient: CREATOR,
    vars: { ...commonVars, ...brandNameVar },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toCreator(order, {
        brandName: brandDisplayName(order.brand),
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        actionUrl: creatorOrderUrl(ctx, order.id),
      });
    },
  },

  'order-completed-for-brand': {
    label: 'Order completed — to brand',
    recipient: BRAND,
    vars: { ...commonVars, ...creatorNameVar },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toBrand(ctx, order, {
        creatorName: creatorDisplayName(order),
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        actionUrl: brandOrderUrl(ctx, order.id),
      });
    },
  },

  // ---- rejection, cancellation, refund ----

  'order-rejected-for-brand': {
    label: 'Order rejected — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      ...creatorNameVar,
      resolutionNotes: { type: 'string', example: 'Refunded in full.' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toBrand(
        ctx,
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          resolutionNotes: order.cancellationReason ?? '',
          creatorName: creatorDisplayName(order),
          actionUrl: brandOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-rejected-for-creator': {
    label: 'Order rejected — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      ...brandNameVar,
      resolutionNotes: { type: 'string', example: 'Refunded in full.' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toCreator(
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          resolutionNotes: order.cancellationReason ?? '',
          brandName: brandDisplayName(order.brand),
          actionUrl: creatorOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-cancelled-for-brand': {
    label: 'Order cancelled by brand — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      ...creatorNameVar,
      cancellationNote: { type: 'string', example: 'Campaign postponed.' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toBrand(
        ctx,
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          cancellationNote: order.cancellationReason ?? '',
          creatorName: creatorDisplayName(order),
          actionUrl: brandOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-cancelled-for-creator': {
    label: 'Order cancelled by brand — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      ...brandNameVar,
      cancellationNote: { type: 'string', example: 'Campaign postponed.' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toCreator(
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          cancellationNote: order.cancellationReason ?? '',
          brandName: brandDisplayName(order.brand),
          actionUrl: creatorOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-cancelled-by-support-for-brand': {
    label: 'Order cancelled by support — to brand',
    description:
      'Support ended the order; neither party is named as the canceller.',
    recipient: BRAND,
    vars: {
      ...commonVars,
      cancellationNote: { type: 'string', example: 'Cancelled after review.' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toBrand(
        ctx,
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          cancellationNote: order.cancellationReason ?? '',
          actionUrl: brandOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-cancelled-by-support-for-creator': {
    label: 'Order cancelled by support — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      cancellationNote: { type: 'string', example: 'Cancelled after review.' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toCreator(
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          cancellationNote: order.cancellationReason ?? '',
          actionUrl: creatorOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-refunded-for-brand': {
    label: 'Order refunded — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      refundAmount: { type: 'money', example: '₹12,500.00' },
      refundedAt: { type: 'date', example: '29 Sep 2026, 10:00 am' },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      return toBrand(ctx, order, {
        packageName: order.packageNameSnapshot,
        orderId: order.id,
        refundAmount: formatMoney(order.priceAmountSnapshot, order.currency),
        refundedAt: formatDate(order.refundedAt),
        actionUrl: brandOrderUrl(ctx, order.id),
      });
    },
  },

  // ---- disputes ----

  'order-dispute-opened-for-brand': {
    label: 'Dispute opened — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      raisedByLabel: { type: 'string', example: 'Creator' },
      reason: {
        type: 'string',
        example: 'Deliverables do not match the brief.',
      },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      const dispute = await ctx.prisma.orderDispute.findFirst({
        where: { orderId: order.id },
        orderBy: { openedAt: 'desc' },
        select: { openedBy: true, reason: true },
      });
      return toBrand(
        ctx,
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          raisedByLabel: dispute?.openedBy === 'BRAND' ? 'Brand' : 'Creator',
          reason: dispute?.reason?.trim() ?? '',
          actionUrl: brandOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-dispute-opened-for-creator': {
    label: 'Dispute opened — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      raisedByLabel: { type: 'string', example: 'Brand' },
      reason: {
        type: 'string',
        example: 'Deliverables do not match the brief.',
      },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      const dispute = await ctx.prisma.orderDispute.findFirst({
        where: { orderId: order.id },
        orderBy: { openedAt: 'desc' },
        select: { openedBy: true, reason: true },
      });
      return toCreator(
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          raisedByLabel: dispute?.openedBy === 'BRAND' ? 'Brand' : 'Creator',
          reason: dispute?.reason?.trim() ?? '',
          actionUrl: creatorOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-dispute-resolved-for-brand': {
    label: 'Dispute resolved — to brand',
    recipient: BRAND,
    vars: {
      ...commonVars,
      outcomeMessage: {
        type: 'string',
        example:
          'The order will continue from the stage it was in before the dispute.',
      },
      resolutionNotes: {
        type: 'string',
        example: 'Both parties agreed to continue.',
      },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      const dispute = await ctx.prisma.orderDispute.findFirst({
        where: { orderId: order.id },
        orderBy: { openedAt: 'desc' },
        select: { resolutionNotes: true },
      });
      return toBrand(
        ctx,
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          outcomeMessage: DISPUTE_CONTINUED_MESSAGE,
          resolutionNotes: dispute?.resolutionNotes?.trim() ?? '',
          actionUrl: brandOrderUrl(ctx, order.id),
        }),
      );
    },
  },

  'order-dispute-resolved-for-creator': {
    label: 'Dispute resolved — to creator',
    recipient: CREATOR,
    vars: {
      ...commonVars,
      outcomeMessage: {
        type: 'string',
        example:
          'The order will continue from the stage it was in before the dispute.',
      },
      resolutionNotes: {
        type: 'string',
        example: 'Both parties agreed to continue.',
      },
    },
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;
      const dispute = await ctx.prisma.orderDispute.findFirst({
        where: { orderId: order.id },
        orderBy: { openedAt: 'desc' },
        select: { resolutionNotes: true },
      });
      return toCreator(
        order,
        omitBlank({
          packageName: order.packageNameSnapshot,
          orderId: order.id,
          outcomeMessage: DISPUTE_CONTINUED_MESSAGE,
          resolutionNotes: dispute?.resolutionNotes?.trim() ?? '',
          actionUrl: creatorOrderUrl(ctx, order.id),
        }),
      );
    },
  },
});
