import { OrderChatMessageType, Prisma } from '@prisma/client';
import type { OrderChatMessageRow } from './order-chat-message.mapper';

/** Denormalized Order fields updated whenever a new chat message is persisted. */
export function buildOrderLastChatSnapshotUpdate(
  message: Pick<
    OrderChatMessageRow,
    'id' | 'senderUserId' | 'type' | 'text' | 'createdAt'
  >,
): Prisma.OrderUpdateInput {
  return {
    lastChatActivityAt: message.createdAt,
    lastChatMessageId: message.id,
    lastChatMessageSenderUserId: message.senderUserId,
    lastChatMessageType: message.type,
    lastChatMessageText:
      message.type === OrderChatMessageType.TEXT ? message.text : null,
  };
}

export function isOrderChatSnapshotUpdate(
  data: Prisma.OrderUpdateInput,
): boolean {
  return (
    data.lastChatActivityAt !== undefined ||
    data.lastChatMessageId !== undefined ||
    data.lastChatMessageAt !== undefined ||
    data.lastChatMessageSenderUserId !== undefined ||
    data.lastChatMessageType !== undefined ||
    data.lastChatMessageText !== undefined
  );
}

type OrderLookupClient = {
  order: {
    findUnique(args: {
      where: { id: string };
      select: { lastChatMessageId: true };
    }): Promise<{ lastChatMessageId: string | null } | null>;
  };
};

/** Bump inbox sort for orders with no chat yet when the order row changes. */
export async function withOrderInboxActivityOnUpdate(
  prisma: Prisma.TransactionClient | OrderLookupClient,
  args: Prisma.OrderUpdateArgs,
): Promise<Prisma.OrderUpdateArgs> {
  const orderId = resolveOrderIdFromWhere(args.where);
  if (!orderId || !args.data || isOrderChatSnapshotUpdate(args.data)) {
    return args;
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { lastChatMessageId: true },
  });
  if (existing?.lastChatMessageId) return args;

  return {
    ...args,
    data: {
      ...args.data,
      lastChatActivityAt: new Date(),
    },
  };
}

function resolveOrderIdFromWhere(
  where: Prisma.OrderWhereUniqueInput,
): string | null {
  if (typeof where.id === 'string') return where.id;
  return null;
}
