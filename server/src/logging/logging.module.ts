import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';

/**
 * Centralised structured (pino) logging.
 *
 * - Every HTTP request/response is logged automatically as one JSON line with a
 *   request id, method, url, status and latency — so every backend API is
 *   covered without per-endpoint code.
 * - Secrets are stripped two ways (belt and suspenders): the custom `req`
 *   serializer never emits the raw header bag, and `redact` censors any
 *   auth/cookie header that slips through plus common secret body fields.
 * - JSON in production (ready for a Railway log drain → Better Stack / Axiom /
 *   Loki, which keep and index old logs); pretty-printed locally.
 * - `LOG_LEVEL` env overrides the level (default `info`, `debug` in dev).
 *
 * Because this is passed to `app.useLogger(...)` in main.ts, every existing
 * NestJS `Logger` call (including the `[admin-action]` audit lines) is emitted
 * as structured pino JSON too — no rewrites needed.
 */

const isProduction = process.env.NODE_ENV === 'production';

/** A request id: honour an upstream/proxy id, else mint one per request. */
function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const existing =
    (req.headers['x-request-id'] as string | undefined) ??
    (req.headers['x-correlation-id'] as string | undefined);
  const id = existing?.trim() || randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
        timestamp: pino.stdTimeFunctions.isoTime,
        // Emit the level as text ("info" / "warn" / "error") instead of pino's
        // default numeric code (30 / 40 / 50), so it reads plainly in
        // CloudWatch / Better Stack / any log viewer.
        formatters: {
          level: (label) => ({ level: label }),
        },
        genReqId: resolveRequestId,
        // Pretty output locally; raw JSON in prod so a log drain can index it.
        transport: isProduction
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname,req,res',
              },
            },
        // Don't spam the logs with health checks / swagger / favicon pings.
        autoLogging: {
          ignore: (req: IncomingMessage) => {
            const url = req.url ?? '';
            return (
              url === '/' ||
              url.startsWith('/api/health') ||
              url.startsWith('/docs') ||
              url.startsWith('/favicon')
            );
          },
        },
        // 5xx -> error, 4xx -> warn, everything else -> info.
        customLogLevel: (
          _req: IncomingMessage,
          res: ServerResponse,
          err?: Error,
        ) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
          `${req.method} ${req.url} ${res.statusCode}`,
        customErrorMessage: (
          req: IncomingMessage,
          res: ServerResponse,
          err: Error,
        ) => `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,
        // Lean, secret-free serializers: never dump the full header bag.
        serializers: {
          req: (req: {
            id?: string;
            method?: string;
            url?: string;
            headers?: Record<string, string | string[] | undefined>;
            remoteAddress?: string;
          }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            userAgent: req.headers?.['user-agent'],
            referer: req.headers?.referer,
            remoteAddress: req.remoteAddress,
          }),
          res: (res: { statusCode?: number }) => ({
            statusCode: res.statusCode,
          }),
        },
        // Backstop: censor secrets anywhere they might still appear.
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.headers["x-razorpay-signature"]',
            'res.headers["set-cookie"]',
            '*.password',
            '*.passwordHash',
            '*.accessToken',
            '*.refreshToken',
            '*.token',
          ],
          censor: '[redacted]',
          remove: false,
        },
      },
    }),
  ],
})
export class LoggingModule {}
