import { OrderStatus } from '@prisma/client';

/** Chat is not open until the creator accepts the brief. */
export const CHAT_NOT_YET_OPEN_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.BRIEF_SUBMISSION_PENDING,
  OrderStatus.BRIEF_SUBMITTED,
];

/** Orders in these statuses have read-only chat in the messages inbox UI. */
export const CHAT_LOCKED_ORDER_STATUSES: OrderStatus[] = [
  ...CHAT_NOT_YET_OPEN_ORDER_STATUSES,
  OrderStatus.ACCEPTED,
  OrderStatus.CREATOR_PAYMENT_DONE,
  OrderStatus.REJECTED,
  OrderStatus.REFUNDED,
];

/** Threads appear in the inbox only after the creator accepts. */
export const CHAT_INBOX_EXCLUDED_STATUSES: OrderStatus[] = [
  ...CHAT_NOT_YET_OPEN_ORDER_STATUSES,
];
