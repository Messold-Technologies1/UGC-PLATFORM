import type { ConnectionOptions } from 'bullmq';

/**
 * Redis options for BullMQ Queue + Worker.
 *
 * BullMQ requires `maxRetriesPerRequest: null` on the worker connection.
 * Pass the same options object to Queue and Worker — BullMQ opens a separate
 * connection for each; do not share one ioredis instance.
 */
export function buildBullmqConnection(redisUrl: string): ConnectionOptions {
  const opts: ConnectionOptions = {
    url: redisUrl,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
    retryStrategy: (times: number) => Math.min(times * 200, 5_000),
  };

  // Railway / Upstash use rediss://. Match Socket.IO (plain URL) but allow
  // managed certs that fail default TLS verification on blocking clients.
  if (redisUrl.startsWith('rediss://')) {
    (opts as ConnectionOptions & { tls?: { rejectUnauthorized: boolean } }).tls =
      { rejectUnauthorized: false };
  }

  return opts;
}
