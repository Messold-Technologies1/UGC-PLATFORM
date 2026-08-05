import type { ConnectionOptions } from 'bullmq';

/**
 * Redis options for BullMQ Queue + Worker.
 *
 * BullMQ requires `maxRetriesPerRequest: null` on the worker connection.
 * Pass the same options object to Queue and Worker — BullMQ opens a separate
 * connection for each; do not share one ioredis instance.
 *
 * The worker waits for jobs on a long-lived *blocking* connection. On managed
 * Redis (Railway private networking, cloud proxies) an idle socket can be
 * silently dropped, after which the worker stops consuming and jobs pile up in
 * `wait`. TCP keep-alive probes keep that idle socket alive so the network path
 * can't quietly kill it, and also surface a half-open connection so ioredis
 * reconnects instead of hanging deaf.
 */
export function buildBullmqConnection(redisUrl: string): ConnectionOptions {
  const opts: ConnectionOptions = {
    url: redisUrl,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
    // Send a TCP keep-alive probe after 30s idle so managed Redis / the network
    // path doesn't drop the worker's blocking connection.
    keepAlive: 30_000,
    noDelay: true,
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
