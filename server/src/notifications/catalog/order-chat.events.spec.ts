import { OrderChatMessageType } from '@prisma/client';
import type { EventContext } from './define-events';
import {
  CHAT_WINDOW_MS,
  chatOccurrenceKey,
  orderChatEvents,
} from './order-chat.events';

const CREATOR_USER = 'user-creator';
const BRAND_USER = 'user-brand';
const ADMIN_USER = 'user-admin';
const ORDER_ID = 'ord_1';

type DigestOpts = {
  unreadCount?: number;
  latestSender?: string | null;
  latestType?: OrderChatMessageType;
  latestText?: string | null;
  lastReadAt?: Date | null;
  order?: Record<string, unknown> | null;
  buyerThrows?: boolean;
};

function ctxWith(opts: DigestOpts = {}): EventContext {
  const order =
    'order' in opts
      ? opts.order
      : {
          id: ORDER_ID,
          packageNameSnapshot: 'Standard — 3 reels',
          brand: {
            id: 'brand-1',
            brandName: 'Acme Beauty',
            contactFullName: null,
            contactEmail: 'brand@example.com',
            contactPhone: null,
            userId: BRAND_USER,
          },
          agency: null,
          creator: {
            id: 'creator-1',
            displayName: 'Ananya R',
            contactEmail: 'creator@example.com',
            user: {
              id: CREATOR_USER,
              email: 'creator@example.com',
              name: 'Ananya',
              phone: null,
            },
          },
        };

  const unreadCount = opts.unreadCount ?? 2;

  return {
    frontendBaseUrl: 'https://app.gocollab.io',
    brandAccess: {
      resolveBuyerActorUserId: jest.fn(() =>
        opts.buyerThrows
          ? Promise.reject(new Error('no buyer'))
          : Promise.resolve(BRAND_USER),
      ),
      resolveBrandActorUserIdForProfile: jest.fn(() =>
        Promise.resolve(BRAND_USER),
      ),
    },
    prisma: {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      orderChatReadState: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            opts.lastReadAt === undefined
              ? null
              : { lastReadAt: opts.lastReadAt },
          ),
      },
      orderChatMessage: {
        count: jest.fn().mockResolvedValue(unreadCount),
        findFirst: jest.fn().mockResolvedValue(
          opts.latestSender === null
            ? null
            : {
                senderUserId: opts.latestSender ?? BRAND_USER,
                type: opts.latestType ?? OrderChatMessageType.TEXT,
                text: opts.latestText ?? 'Could you reshoot the opening line?',
              },
        ),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: BRAND_USER, email: 'brand@example.com' }),
      },
    },
  } as unknown as EventContext;
}

const forCreator = orderChatEvents['order-chat-message-for-creator'];
const forBrand = orderChatEvents['order-chat-message-for-brand'];

describe('chatOccurrenceKey', () => {
  // This is the whole burst-collapsing mechanism: messages sharing a key
  // collide on the delivery log's unique constraint, so only the first sends.
  it('gives every message in one window the same key', () => {
    const at = new Date('2026-10-28T10:00:00.000Z');
    const later = new Date(at.getTime() + CHAT_WINDOW_MS - 1);

    expect(chatOccurrenceKey(ORDER_ID, at)).toBe(
      chatOccurrenceKey(ORDER_ID, later),
    );
  });

  it('starts a new key in the next window', () => {
    const at = new Date('2026-10-28T10:00:00.000Z');
    const next = new Date(at.getTime() + CHAT_WINDOW_MS);

    expect(chatOccurrenceKey(ORDER_ID, at)).not.toBe(
      chatOccurrenceKey(ORDER_ID, next),
    );
  });

  it('keeps separate orders separate inside one window', () => {
    const at = new Date('2026-10-28T10:00:00.000Z');

    expect(chatOccurrenceKey('ord_1', at)).not.toBe(
      chatOccurrenceKey('ord_2', at),
    );
  });
});

describe('order chat events', () => {
  it('counts unread at send time rather than quoting one message', async () => {
    const recipient = await forCreator.resolve(
      ctxWith({ unreadCount: 3 }),
      ORDER_ID,
    );

    expect(recipient?.vars).toEqual(
      expect.objectContaining({
        unreadCount: 3,
        senderName: 'Acme Beauty',
        messagePreview: 'Could you reshoot the opening line?',
      }),
    );
  });

  // The window's cost is at its edge, and this is what pays it: by the time a
  // second window fires the recipient may have read everything.
  it('resolves to nobody once the thread has been read', async () => {
    const recipient = await forCreator.resolve(
      ctxWith({ unreadCount: 0 }),
      ORDER_ID,
    );

    expect(recipient).toBeNull();
  });

  it('points each side at its own messages page', async () => {
    const toCreator = await forCreator.resolve(ctxWith(), ORDER_ID);
    const toBrand = await forBrand.resolve(ctxWith(), ORDER_ID);

    expect(toCreator?.vars.actionUrl).toBe(
      `https://app.gocollab.io/creator/messages?orderId=${ORDER_ID}`,
    );
    expect(toBrand?.vars.actionUrl).toBe(
      `https://app.gocollab.io/brand/messages?orderId=${ORDER_ID}`,
    );
  });

  // Support writes into this same thread during a dispute. Naming the agent
  // would put a support account's name on a brand's lock screen.
  it('attributes a message from neither party to Support', async () => {
    const recipient = await forCreator.resolve(
      ctxWith({ latestSender: ADMIN_USER }),
      ORDER_ID,
    );

    expect(recipient?.vars.senderName).toBe('Support');
  });

  it('names the creator when the creator wrote last', async () => {
    const recipient = await forBrand.resolve(
      ctxWith({ latestSender: CREATOR_USER }),
      ORDER_ID,
    );

    expect(recipient?.vars.senderName).toBe('Ananya R');
  });

  it('describes a voice note rather than quoting an empty body', async () => {
    const recipient = await forCreator.resolve(
      ctxWith({
        latestType: OrderChatMessageType.VOICE,
        latestText: null,
      }),
      ORDER_ID,
    );

    expect(recipient?.vars.messagePreview).toBe('Voice message');
  });

  it('resolves to nobody when the order is gone', async () => {
    const recipient = await forCreator.resolve(
      ctxWith({ order: null }),
      ORDER_ID,
    );

    expect(recipient).toBeNull();
  });

  describe('stillRelevant', () => {
    it('keeps a delayed send while anything is unread', async () => {
      await expect(
        forCreator.stillRelevant(ctxWith({ unreadCount: 1 }), ORDER_ID),
      ).resolves.toBe(true);
    });

    it('stops a delayed send once the thread is read', async () => {
      await expect(
        forCreator.stillRelevant(ctxWith({ unreadCount: 0 }), ORDER_ID),
      ).resolves.toBe(false);
    });

    // null, not false: a missing order is "I cannot see it", which the log
    // must not record as restraint.
    it('answers null when the order is gone', async () => {
      await expect(
        forCreator.stillRelevant(ctxWith({ order: null }), ORDER_ID),
      ).resolves.toBeNull();
    });
  });
});
