import {
  NotificationChannel,
  OrderStatus,
  RoleName,
  NotificationRecipientRole,
  OrderChatMessageType,
  UserStatus,
} from '@prisma/client';
import { defineEvents } from './define-events';
import type { ResolvedRecipient } from './define-events';
import type { EventContext } from './define-events';
import {
  brandDisplayName,
  loadOrder,
  toBrand,
  toCreator,
  type OrderRow,
} from './order-context';

const { CREATOR, BRAND, USER } = NotificationRecipientRole;

/**
 * Chat seeds as push only.
 *
 * The other two are a deliberate no, not an omission. A mailbox with one
 * email per chat message is worse than no notification at all, and WhatsApp
 * would charge per message for the privilege. An admin can still tick them;
 * the point is that nobody has to discover and untick them first.
 */
const PUSH_ONLY = [NotificationChannel.PUSH] as const;

/**
 * How long one notification speaks for.
 *
 * The occurrence key is bucketed by this, so the first message in a window
 * claims the delivery log row and every later one in the same window loses the
 * insert and is dropped as a duplicate. A burst of twenty messages is one
 * notification, and the rate limiting is the idempotency machinery that was
 * already there rather than a timer, a queue or a table of its own.
 *
 * Two minutes is a conversational pause: long enough that a flurry of short
 * messages reads as one event, short enough that a reply half a minute after
 * you looked away still reaches you promptly. Widen it if chat proves noisy.
 *
 * The cost of a window is at its edge — a message at 1:59 and one at 2:01
 * each send — which is why the copy counts unread messages rather than
 * describing one. "3 new messages" is true at either side of the boundary.
 */
export const CHAT_WINDOW_MS = 2 * 60_000;

/**
 * The occurrence key for a chat notification: one per order, per recipient,
 * per window.
 *
 * Exported because the emitting side builds it and the tests assert on it, and
 * a second copy of this expression would be a silent way to break the
 * collapsing — two spellings of the bucket mean two log rows mean two
 * notifications.
 */
export function chatOccurrenceKey(orderId: string, at: Date): string {
  return `${orderId}:${Math.floor(at.getTime() / CHAT_WINDOW_MS)}`;
}

const adminChatVars = {
  recipientName: { type: 'string', example: 'Priya' },
  orderId: { type: 'string', example: 'ord_8f21c4' },
  packageName: { type: 'string', example: 'Standard — 3 reels' },
  actionUrl: {
    type: 'url',
    example: '/admin/orderManagement/ord_8f21c4',
  },
  senderName: { type: 'string', example: 'the creator' },
} as const;

/**
 * Everything the chat templates may render EXCEPT the message itself.
 *
 * The quoted message is the sender's own words, so on a brand's or an admin's
 * screen it can carry the creator's name however the sender is labelled —
 * people sign off. Those two therefore get a count and nothing more, and the
 * preview is declared only where the author is the brand, who is named in
 * that copy anyway.
 */
const chatVarsWithoutPreview = {
  recipientName: { type: 'string', example: 'Ananya R' },
  orderId: { type: 'string', example: 'ord_8f21c4' },
  packageName: { type: 'string', example: 'Standard — 3 reels' },
  actionUrl: { type: 'url', example: '/creator/messages?orderId=ord_8f21c4' },
  senderName: { type: 'string', example: 'the creator' },
  unreadCount: { type: 'number', example: '3' },
} as const;

const chatVars = {
  ...chatVarsWithoutPreview,
  messagePreview: {
    type: 'string',
    example: 'Could you reshoot the opening line?',
  },
} as const;

/** Where this side of the order reads its messages. */
function messagesUrl(
  ctx: EventContext,
  order: OrderRow,
  side: 'brand' | 'creator',
): string {
  const workspace =
    side === 'creator' ? 'creator' : order.agency ? 'agency' : 'brand';
  return `${ctx.frontendBaseUrl}/${workspace}/messages?orderId=${order.id}`;
}

/** What a message shows as when there is nothing to quote. */
function previewOf(
  message: { type: OrderChatMessageType; text: string | null } | null,
): string {
  if (!message) return '';
  if (message.type === OrderChatMessageType.VOICE) return 'Voice message';
  return message.text?.trim() ?? '';
}

/**
 * Read the conversation as it stands *now*, at send time.
 *
 * This is the whole reason the window is harmless. The notification does not
 * describe the message that triggered it — by the time it goes out there may
 * be four more — it describes the state of the thread: how much is unread, and
 * who spoke last. A count is still true a minute later; a quoted message is
 * not.
 */
async function unreadWhere(
  ctx: EventContext,
  orderId: string,
  recipientUserId: string,
) {
  const readState = await ctx.prisma.orderChatReadState.findUnique({
    where: { orderId_userId: { orderId, userId: recipientUserId } },
    select: { lastReadAt: true },
  });

  // Anything the recipient did not write and has not read. With no read state
  // the whole thread is unread, which is right for a first message.
  return {
    orderId,
    senderUserId: { not: recipientUserId },
    ...(readState?.lastReadAt
      ? { createdAt: { gt: readState.lastReadAt } }
      : {}),
  };
}

/**
 * The buyer side's account, or null when the order has neither brand nor
 * agency — a row that cannot be addressed at all.
 */
async function buyerUserId(
  ctx: EventContext,
  order: OrderRow,
): Promise<string | null> {
  return ctx.brandAccess
    .resolveBuyerActorUserId({
      brandId: order.brand?.id ?? null,
      agencyId: order.agency?.id ?? null,
    })
    .catch(() => null);
}

async function chatDigest(
  ctx: EventContext,
  order: OrderRow,
  recipientUserId: string,
): Promise<{
  unreadCount: number;
  senderName: string;
  messagePreview: string;
}> {
  const where = await unreadWhere(ctx, order.id, recipientUserId);

  const [unreadCount, latest] = await Promise.all([
    ctx.prisma.orderChatMessage.count({ where }),
    ctx.prisma.orderChatMessage.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select: { senderUserId: true, type: true, text: true },
    }),
  ]);

  return {
    unreadCount,
    senderName: await senderLabel(ctx, order, latest?.senderUserId ?? null),
    messagePreview: previewOf(latest),
  };
}

/**
 * Who to say the message is from.
 *
 * The creator is never named. Brand-facing copy calls them "the creator"
 * everywhere else in the catalog — only the auto-accept reminder and the
 * agency-placed notice print `creatorName` — and a notification is the worst
 * place to break that, since it lands on a lock screen where anyone nearby
 * can read it.
 *
 * The brand is named, which is the same asymmetry the rest of the catalog
 * has: creator-facing copy says "Acme Beauty", brand-facing copy says "the
 * creator".
 *
 * Admins write into this thread during a dispute, and naming the individual
 * would put a support agent's account name in front of a brand. Anyone who is
 * neither party to the order is "Support".
 */
async function senderLabel(
  ctx: EventContext,
  order: OrderRow,
  senderUserId: string | null,
): Promise<string> {
  if (!senderUserId) return 'Support';
  if (senderUserId === order.creator.user.id) return 'the creator';

  const buyer = await buyerUserId(ctx, order);
  return senderUserId === buyer ? brandDisplayName(order) : 'Support';
}

/** Support only joins the conversation while the order is under dispute. */
async function isDisputed(
  ctx: EventContext,
  orderId: string,
): Promise<boolean | null> {
  const order = await ctx.prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order) return null;
  return order.status === OrderStatus.DISPUTED;
}

/**
 * Every admin who could pick this up.
 *
 * A dispute has no assigned owner — `OrderDispute.resolvedByUserId` is set at
 * the end, by whoever happened to resolve it — so there is nobody in
 * particular to tell and the event addresses all of them. Each gets their own
 * claim and log row, so one admin's browser being unreachable does not silence
 * the rest.
 *
 * ADMIN can sit on the primary role or among the secondary ones, matching how
 * AdminGuard decides, so that the people who can open the dispute chat are
 * exactly the people told about it.
 */
async function activeAdmins(ctx: EventContext): Promise<
  Array<{
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
  }>
> {
  return ctx.prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      deletedAt: null,
      OR: [
        { primaryRole: { name: RoleName.ADMIN } },
        { userRoles: { some: { role: { name: RoleName.ADMIN } } } },
      ],
    },
    select: { id: true, email: true, name: true, phone: true },
  });
}

/**
 * Is there still anything unread for this side?
 *
 * Every event in this catalog declares a relevance check so the admin can put
 * any of them on a delay without a code change. For chat the condition writes
 * itself: the notification is about unread messages, so it stops being true
 * the moment the recipient opens the thread. A delayed row therefore nudges
 * someone who never looked and stays silent for someone who did — which is
 * also exactly what makes a late chat notice tolerable rather than annoying.
 *
 * Returns null, not false, when the order is gone: "I cannot see it" is a
 * different answer from "they already read it", and the delivery log keeps
 * them apart.
 */
async function stillUnread(
  ctx: EventContext,
  orderId: string,
  side: 'brand' | 'creator',
): Promise<boolean | null> {
  const order = await loadOrder(ctx, orderId);
  if (!order) return null;

  const recipientUserId =
    side === 'creator' ? order.creator.user.id : await buyerUserId(ctx, order);
  if (!recipientUserId) return null;

  const where = await unreadWhere(ctx, orderId, recipientUserId);
  return (await ctx.prisma.orderChatMessage.count({ where })) > 0;
}

/**
 * Order chat.
 *
 * The one part of the catalog that is not about a stage changing: a message
 * arrived, which is both far more frequent than anything else here and the
 * thing people most want told about away from the tab. Both events are
 * expected to run on PUSH alone — an email per chat message is nobody's idea
 * of help — which the per-row channel model expresses without any special
 * case. See docs/BROWSER_PUSH_PLAN.md §5.
 *
 * Both declare a relevance check, as every event in this catalog does, and for
 * chat it is the obvious one: still anything unread? A delayed row then nudges
 * someone who never opened the thread and says nothing to someone who did.
 */
export const orderChatEvents = defineEvents({
  'order-chat-message-for-creator': {
    label: 'Chat message — to creator',
    description:
      'The brand, their agency, or support posted in the order chat. Collapses a burst into one notice.',
    recipient: CREATOR,
    vars: chatVars,
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;

      const digest = await chatDigest(ctx, order, order.creator.user.id);
      // Everything was read between the message landing and this firing, so
      // there is nothing left to announce.
      if (digest.unreadCount === 0) return null;

      return toCreator(order, {
        orderId: order.id,
        packageName: order.packageNameSnapshot,
        actionUrl: messagesUrl(ctx, order, 'creator'),
        senderName: digest.senderName,
        unreadCount: digest.unreadCount,
        messagePreview: digest.messagePreview,
      });
    },
    stillRelevant: (ctx, id) => stillUnread(ctx, id, 'creator'),
    suppressWhenViewing: true,
    defaultChannels: PUSH_ONLY,
  },

  'order-chat-message-for-brand': {
    label: 'Chat message — to brand',
    description:
      'The creator or support posted in the order chat. Collapses a burst into one notice.',
    recipient: BRAND,
    vars: chatVarsWithoutPreview,
    resolve: async (ctx, id) => {
      const order = await loadOrder(ctx, id);
      if (!order) return null;

      const buyer = await buyerUserId(ctx, order);
      if (!buyer) return null;

      const digest = await chatDigest(ctx, order, buyer);
      if (digest.unreadCount === 0) return null;

      return toBrand(ctx, order, {
        orderId: order.id,
        packageName: order.packageNameSnapshot,
        actionUrl: messagesUrl(ctx, order, 'brand'),
        senderName: digest.senderName,
        unreadCount: digest.unreadCount,
      });
    },
    stillRelevant: (ctx, id) => stillUnread(ctx, id, 'brand'),
    suppressWhenViewing: true,
    defaultChannels: PUSH_ONLY,
  },

  'order-chat-message-for-admin': {
    label: 'Chat message — to support',
    description:
      "Somebody posted in a disputed order's chat. Goes to every admin, and only while the dispute is open.",
    recipient: USER,
    vars: adminChatVars,
    resolve: async (ctx, id) => {
      // Support is a participant only while the dispute is open. Outside that
      // the thread is the brand and creator's own, and admins should not be
      // notified about a conversation they are not part of.
      if (!(await isDisputed(ctx, id))) return null;

      const order = await loadOrder(ctx, id);
      if (!order) return null;

      const admins = await activeAdmins(ctx);
      const latest = await ctx.prisma.orderChatMessage.findFirst({
        where: { orderId: id },
        orderBy: { createdAt: 'desc' },
        select: { senderUserId: true, type: true, text: true },
      });

      const senderName = await senderLabel(
        ctx,
        order,
        latest?.senderUserId ?? null,
      );
      const vars = {
        orderId: order.id,
        packageName: order.packageNameSnapshot,
        senderName,
        actionUrl: `${ctx.frontendBaseUrl}/admin/orderManagement/${order.id}`,
      };

      // Whoever just wrote is not told about their own message — which is how
      // an admin replying in the thread avoids notifying themselves.
      return admins
        .filter((admin) => admin.id !== latest?.senderUserId)
        .map((admin): ResolvedRecipient => ({
          userId: admin.id,
          email: admin.email,
          phone: admin.phone,
          // Admins have no workspace profile, so there are no opt-in columns
          // to read. Their gate is the browser permission.
          bypassProfileOptIn: true,
          vars: { recipientName: admin.name?.trim() || 'there', ...vars },
        }));
    },
    // The nudge stops when the dispute does: a resolved order's chat is no
    // longer support's to watch.
    stillRelevant: (ctx, id) => isDisputed(ctx, id),
    suppressWhenViewing: true,
    defaultChannels: PUSH_ONLY,
  },
});
