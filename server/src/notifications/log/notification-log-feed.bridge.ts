import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  NOTIFICATION_LOG_ROOM,
  PaymentsGateway,
} from '../../realtime/payments.gateway';
import {
  NOTIFICATION_LOG_CHANNEL,
  NOTIFICATION_LOG_EVENT,
  type NotificationLogRow,
} from './notification-log-feed';

/**
 * The read side of the delivery-log feed: Redis in, Socket.IO out.
 *
 * Runs in every process, but only does anything where a Socket.IO server
 * exists. In the worker `gateway.server` is undefined — it boots without an
 * HTTP listener — so the emit is skipped there rather than throwing on every
 * message. That check is what lets one module serve both deployments.
 */
@Injectable()
export class NotificationLogFeedBridge
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationLogFeedBridge.name);
  private client: Redis | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: PaymentsGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) return;

    // A subscriber connection can issue nothing but (un)subscribe, so it has to
    // be its own client rather than a share of the publisher's.
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => Math.min(times * 500, 10_000),
      ...(url.startsWith('rediss://')
        ? { tls: { rejectUnauthorized: false } }
        : {}),
    });
    client.on('error', (err: Error) => {
      this.logger.debug(`delivery-log feed subscriber: ${err.message}`);
    });
    client.on('message', (channel, message) => {
      if (channel === NOTIFICATION_LOG_CHANNEL) this.relay(message);
    });

    this.client = client;
    try {
      await client.connect();
      // ioredis re-subscribes on reconnect, so this is a one-time call.
      await client.subscribe(NOTIFICATION_LOG_CHANNEL);
      this.logger.log('delivery-log feed: listening');
    } catch (err) {
      this.logger.warn(
        `delivery-log feed: could not subscribe — the admin page will still load, just without live rows (${
          err instanceof Error ? err.message : String(err)
        })`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
    this.client = null;
  }

  private relay(message: string): void {
    const server = this.gateway.server;
    if (!server) return;
    try {
      const row = JSON.parse(message) as NotificationLogRow;
      server.to(NOTIFICATION_LOG_ROOM).emit(NOTIFICATION_LOG_EVENT, row);
    } catch (err) {
      this.logger.warn(
        `delivery-log feed: unreadable message dropped (${
          err instanceof Error ? err.message : String(err)
        })`,
      );
    }
  }
}
