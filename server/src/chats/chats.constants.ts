import { OrderStatus } from '@prisma/client';

/** Orders in these statuses have read-only chat in the messages inbox UI. */
export const CHAT_LOCKED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.CREATOR_PAYMENT_DONE,
  OrderStatus.REJECTED,
  OrderStatus.REFUNDED,
];

/** Orders must be past checkout to appear in the chat inbox. */
export const CHAT_INBOX_EXCLUDED_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
];
