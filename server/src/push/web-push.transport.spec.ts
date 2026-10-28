import webpush, { WebPushError } from 'web-push';
import { PermanentPushError, WebPushTransport } from './web-push.transport';

jest.mock('web-push', () => ({
  __esModule: true,
  default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() },
  WebPushError: class WebPushError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public headers: unknown,
      public body: string,
      public endpoint: string,
    ) {
      super(message);
    }
  },
}));

const sendNotification = webpush.sendNotification as unknown as jest.Mock;

/** A VAPID keypair is fixed-length; the values themselves never matter here. */
const VALID_ENV: Record<string, string> = {
  VAPID_PUBLIC_KEY: 'B'.repeat(87),
  VAPID_PRIVATE_KEY: 'p'.repeat(43),
  VAPID_SUBJECT: 'mailto:ops@example.com',
};

function gone(statusCode: number): WebPushError {
  return new (
    WebPushError as unknown as new (...args: unknown[]) => WebPushError
  )('gone', statusCode, {}, '', 'https://push.example/x');
}

describe('WebPushTransport', () => {
  const payload = {
    title: 'New chat message',
    body: '3 new messages from Acme',
    url: 'https://app.example/creator/messages',
  };

  let prisma: {
    pushSubscription: {
      findMany: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
    };
  };

  function build(env: Record<string, string> = VALID_ENV): WebPushTransport {
    const config = { get: (key: string) => env[key] };
    return new WebPushTransport(config as never, prisma as never);
  }

  function subscription(id: string) {
    return {
      id,
      endpoint: `https://push.example/${id}`,
      p256dh: 'key',
      auth: 'auth',
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      pushSubscription: {
        findMany: jest.fn().mockResolvedValue([subscription('sub-1')]),
        delete: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    sendNotification.mockResolvedValue({ statusCode: 201 });
  });

  it('is not configured when any one of the three VAPID settings is missing', () => {
    expect(build({}).isConfigured()).toBe(false);
    expect(build({ ...VALID_ENV, VAPID_SUBJECT: '' }).isConfigured()).toBe(
      false,
    );
    expect(build().isConfigured()).toBe(true);
  });

  it('reports no recipients rather than failing when the user has no browsers', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([]);

    await expect(build().sendToUser('user-1', payload)).resolves.toEqual({
      delivered: 0,
      pruned: 0,
      failed: 0,
    });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('delivers to every one of a user’s browsers', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([
      subscription('sub-1'),
      subscription('sub-2'),
    ]);

    const result = await build().sendToUser('user-1', payload);

    expect(result.delivered).toBe(2);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(prisma.pushSubscription.update).toHaveBeenCalledTimes(2);
  });

  // The pruning contract: a 404/410 is the only signal a browser is gone, and
  // acting on it is the entire subscription lifecycle. A row kept past it is a
  // send that can only ever fail again.
  it.each([404, 410])(
    'deletes a subscription the push service reports %s for',
    async (status) => {
      sendNotification.mockRejectedValue(gone(status));

      const result = await build().sendToUser('user-1', payload);

      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
      expect(result).toEqual({ delivered: 0, pruned: 1, failed: 0 });
    },
  );

  it('does not throw when every browser was dead, because nothing is worth retrying', async () => {
    sendNotification.mockRejectedValue(gone(410));

    await expect(build().sendToUser('user-1', payload)).resolves.toEqual({
      delivered: 0,
      pruned: 1,
      failed: 0,
    });
  });

  it("does not let one device's outage cost the others", async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([
      subscription('sub-1'),
      subscription('sub-2'),
    ]);
    sendNotification
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValueOnce({ statusCode: 201 });

    // Delivered somewhere, so the notification happened: re-pushing to the
    // healthy device to retry the sick one would duplicate it.
    const result = await build().sendToUser('user-1', payload);

    expect(result).toEqual({ delivered: 1, pruned: 0, failed: 1 });
    expect(prisma.pushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { failureCount: { increment: 1 } },
    });
  });

  it('throws when nothing was delivered and the failure is worth retrying', async () => {
    sendNotification.mockRejectedValue(new Error('ETIMEDOUT'));

    await expect(build().sendToUser('user-1', payload)).rejects.toThrow(
      'ETIMEDOUT',
    );
  });

  it.each([400, 413])(
    'raises a permanent error for HTTP %s, which every retry would repeat',
    async (status) => {
      sendNotification.mockRejectedValue(gone(status));

      await expect(
        build().sendToUser('user-1', payload),
      ).rejects.toBeInstanceOf(PermanentPushError);
      expect(prisma.pushSubscription.delete).not.toHaveBeenCalled();
    },
  );

  it('refuses an oversized payload before calling the push service', async () => {
    await expect(
      build().sendToUser('user-1', { ...payload, body: 'x'.repeat(4_000) }),
    ).rejects.toBeInstanceOf(PermanentPushError);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('refuses to send at all when the keys are absent', async () => {
    await expect(
      build({}).sendToUser('user-1', payload),
    ).rejects.toBeInstanceOf(PermanentPushError);
  });
});
