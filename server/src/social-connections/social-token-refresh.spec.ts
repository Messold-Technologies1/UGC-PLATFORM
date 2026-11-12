import { SocialConnectionStatus, SocialPlatform } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';

import { encryptSecret } from './social-crypto.util';
import { SocialConnectionsService } from './social-connections.service';
import type { InstagramClient } from './instagram.client';
import type { PrismaService } from '../prisma/prisma.service';
import type { NotificationEventsService } from '../notifications/dispatch/notification-events.service';

/**
 * Instagram long-lived tokens die 60 days after issue and cannot be refreshed
 * once they have. Every connection that drops out of this sweep is a creator
 * who will have to reconnect by hand, so what the sweep selects is the whole
 * point of it.
 */

const ENC_KEY = 'a'.repeat(32);
const DAY_MS = 24 * 60 * 60_000;

function connection(
  overrides: Partial<{
    id: string;
    status: SocialConnectionStatus;
    tokenExpiresAt: Date | null;
    connectedAt: Date;
  }> = {},
): Record<string, unknown> {
  return {
    id: 'conn-1',
    platform: SocialPlatform.INSTAGRAM,
    status: SocialConnectionStatus.ACTIVE,
    accessToken: encryptSecret('old-token', ENC_KEY),
    // Default: two days from expiry, so inside the 7-day refresh window.
    tokenExpiresAt: new Date(Date.now() + 2 * DAY_MS),
    connectedAt: new Date(Date.now() - 58 * DAY_MS),
    ...overrides,
  };
}

function build(options: {
  due?: Record<string, unknown>[];
  configured?: boolean;
  encKey?: string | undefined;
  refresh?: jest.Mock;
}) {
  const findMany = jest.fn().mockResolvedValue(options.due ?? []);
  const update = jest.fn().mockResolvedValue({});
  const refreshToken =
    options.refresh ??
    jest.fn().mockResolvedValue({
      accessToken: 'new-token',
      expiresAt: new Date(Date.now() + 60 * DAY_MS),
    });

  const service = new SocialConnectionsService(
    { socialConnection: { findMany, update } } as unknown as PrismaService,
    {
      get: (key: string) =>
        key === 'SOCIAL_TOKEN_ENC_KEY'
          ? 'encKey' in options
            ? options.encKey
            : ENC_KEY
          : undefined,
    } as unknown as ConfigService,
    {
      isConfigured: () => options.configured ?? true,
      refreshToken,
    } as unknown as InstagramClient,
    {} as unknown as NotificationEventsService,
  );

  return { service, findMany, update, refreshToken };
}

/** The `where` the sweep queried with. */
function whereOf(findMany: jest.Mock): Record<string, unknown> {
  return (findMany.mock.calls[0] as [{ where: Record<string, unknown> }])[0]
    .where;
}

describe('refreshExpiringTokens', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('refreshes a connection inside the expiry window', async () => {
    const { service, refreshToken, update } = build({
      due: [connection()],
    });

    await expect(service.refreshExpiringTokens()).resolves.toBe(1);
    expect(refreshToken).toHaveBeenCalledWith('old-token');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('sweeps ERROR connections, not just ACTIVE ones', async () => {
    // ERROR means repeated SYNC failures — a rate limit, a 5xx — none of
    // which invalidate the token. Leaving them out turned a transient fault
    // into a dead connection 60 days later.
    const { service, findMany } = build({ due: [] });
    await service.refreshExpiringTokens();

    expect(whereOf(findMany).status).toEqual({
      in: [SocialConnectionStatus.ACTIVE, SocialConnectionStatus.ERROR],
    });
  });

  it('leaves EXPIRED and REVOKED connections out of the sweep', async () => {
    const { service, findMany } = build({ due: [] });
    await service.refreshExpiringTokens();

    const status = whereOf(findMany).status as {
      in: SocialConnectionStatus[];
    };
    expect(status.in).not.toContain(SocialConnectionStatus.EXPIRED);
    expect(status.in).not.toContain(SocialConnectionStatus.REVOKED);
  });

  it('includes connections whose expiry is unknown', async () => {
    // A null tokenExpiresAt does not mean the token is immortal; it means the
    // exchange never reported expires_in. These were never swept and died.
    const { service, findMany } = build({ due: [] });
    await service.refreshExpiringTokens();

    const or = whereOf(findMany).OR as Record<string, unknown>[];
    const nullBranch = or.find((clause) => clause.tokenExpiresAt === null);
    expect(nullBranch).toBeDefined();
  });

  it('refreshes an unknown-expiry connection once it is old enough', async () => {
    const { service, refreshToken } = build({
      due: [
        connection({
          tokenExpiresAt: null,
          connectedAt: new Date(Date.now() - 10 * DAY_MS),
        }),
      ],
    });

    await expect(service.refreshExpiringTokens()).resolves.toBe(1);
    expect(refreshToken).toHaveBeenCalled();
  });

  it('does not refresh a token Meta is too young to accept', async () => {
    // Meta refuses to refresh a long-lived token under 24h old.
    const { service, refreshToken } = build({
      due: [
        connection({
          tokenExpiresAt: null,
          connectedAt: new Date(Date.now() - 60_000),
        }),
      ],
    });

    await expect(service.refreshExpiringTokens()).resolves.toBe(0);
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('counts only tokens it actually refreshed', async () => {
    // A failed refresh used to be counted as a success, so the log read
    // "refreshed 1 token(s)" while the token quietly aged out.
    const { service, update } = build({
      due: [connection()],
      refresh: jest.fn().mockRejectedValue(new Error('Graph is down')),
    });

    await expect(service.refreshExpiringTokens()).resolves.toBe(0);
    expect(update).not.toHaveBeenCalled();
  });

  it('says so instead of returning a silent zero when unconfigured', async () => {
    const { service, findMany } = build({ due: [], configured: false });
    const warn = jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => {});

    await expect(service.refreshExpiringTokens()).resolves.toBe(0);
    expect(findMany).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('social token refresh skipped'),
    );
  });

  it('says so when the encryption key is missing', async () => {
    const { service, findMany } = build({ due: [], encKey: undefined });
    const warn = jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => {});

    await expect(service.refreshExpiringTokens()).resolves.toBe(0);
    expect(findMany).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('SOCIAL_TOKEN_ENC_KEY'),
    );
  });
});
