import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import type { IncomingMessage } from 'node:http';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  const captureRawBody = (
    req: IncomingMessage & { rawBody?: Buffer },
    _res: unknown,
    buf: Buffer,
  ) => {
    req.rawBody = buf;
  };

  // SNS posts JSON as text/plain — parse this route before the global JSON parser.
  app.use(
    '/api/webhooks/ses',
    express.text({
      type: () => true,
      limit: '1mb',
      verify: captureRawBody,
    }),
  );

  app.use(
    express.json({
      limit: '2mb',
      verify: captureRawBody,
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  const configuredOrigin = configService.get<string>('CORS_ORIGIN');
  const origin =
    !configuredOrigin || configuredOrigin.trim() === '*'
      ? true
      : configuredOrigin
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
  app.enableCors({ origin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // When Redis is configured, use the Redis-backed Socket.IO adapter so realtime
  // emits propagate across processes (e.g. a separate watermark worker → browser).
  const redisUrl = configService.get<string>('REDIS_URL');
  if (redisUrl) {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis(redisUrl);
    app.useWebSocketAdapter(redisIoAdapter);
  }

  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED') === 'true' ||
    configService.get<string>('NODE_ENV') !== 'production';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('UGC Platform API')
      .setDescription('API documentation for UGC Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Run onModuleDestroy hooks on SIGTERM/SIGINT (e.g. Railway redeploys) so the
  // BullMQ workers call worker.close() and deregister their blocking Redis
  // connections. Without this, every redeploy leaves a dead `bzpopmin` consumer
  // registered on Redis; those zombies accumulate and steal job notifications
  // from the live worker (BZPOPMIN serves the longest-blocked client first),
  // so newly enqueued jobs sit in `wait` and never get consumed.
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
}

/**
 * Keep a stray rejected promise from killing the process.
 *
 * Node's default since v15 is to treat an unhandled rejection as fatal, and
 * `start:prod` runs a bare `node dist/main.js` with no override. The queue
 * services fire their inline/watchdog fallbacks as `void this.run…(…)` — those
 * paths rethrow, so one failing Instagram sync or watermark run could take the
 * API down. Each call site now guards itself, but a global net matters more than
 * the individual guards: the next `void somePromise()` anyone writes is covered
 * without having to remember.
 *
 * Deliberately does not exit. A background job failing is not a reason to drop
 * in-flight HTTP requests, and the logged stack is what makes it debuggable.
 */
function installProcessSafetyNet(): void {
  const logger = new Logger('Process');

  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.error(`Unhandled promise rejection: ${err.message}`, err.stack);
  });

  // An uncaught *exception* leaves the process in an unknown state, so this only
  // logs it — the platform's restart is still the right outcome, but now there
  // is a line saying why.
  process.on('uncaughtException', (err: Error) => {
    logger.error(`Uncaught exception: ${err.message}`, err.stack);
  });
}

installProcessSafetyNet();

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
