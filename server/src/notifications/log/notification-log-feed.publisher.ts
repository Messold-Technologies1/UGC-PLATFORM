import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  NOTIFICATION_LOG_CHANNEL,
  type NotificationLogRow,
} from './notification-log-feed';

/**
 * Announces a delivery-log write to whoever is watching the admin page.
 *
 * Lives on the write side, so it runs in the worker. Publishing is fire and
 * forget in the strongest sense: a notification that was decided and recorded
 * must never fail because a screen nobody may be looking at missed an update,
 * so every error here is swallowed after one log line.
 *
 * Without REDIS_URL this is inert. That costs nothing, because without Redis
 * the engine queues nothing and there are no rows to announce.
 */
@Injectable()
export class NotificationLogFeedPublisher
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationLogFeedPublisher.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) return;

    // lazyConnect so construction cannot throw on a bad URL; the first publish
    // opens the socket. offlineQueue off: a backlog of stale rows helps nobody.
    this.client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => Math.min(times * 500, 10_000),
      ...(url.startsWith('rediss://')
        ? { tls: { rejectUnauthorized: false } }
        : {}),
    });
    this.client.on('error', (err: Error) => {
      this.logger.debug(`delivery-log feed publisher: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
    this.client = null;
  }

  publish(row: NotificationLogRow): void {
    const client = this.client;
    if (!client) return;
    void (async () => {
      try {
        if (client.status === 'wait') await client.connect();
        await client.publish(NOTIFICATION_LOG_CHANNEL, JSON.stringify(row));
      } catch (err) {
        this.logger.debug(
          `delivery-log feed publish skipped: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    })();
  }
}
