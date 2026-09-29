import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';

/**
 * Worker entry point.
 *
 * Same build and same modules as `main.ts`, started without an HTTP server:
 * this process exists to drain the notification and job queues, so the API's
 * request path never waits on SES, Meta or Handlebars.
 *
 * Deploy the two together and split them by environment:
 *
 *   API     node dist/main.js          BULLMQ_WORKER_ENABLED=false
 *   worker  node dist/main.worker.js   BULLMQ_WORKER_ENABLED=true
 *
 * With the flag unset both processes would consume, which is not wrong but
 * defeats the point of the split. Locally, run the API alone with the flag on
 * and everything works in one terminal.
 */
async function bootstrapWorker() {
  // `createApplicationContext` rather than `create`: no HTTP listener, no
  // controllers, no Swagger — just the providers and their lifecycle hooks,
  // which is what starts the BullMQ workers and the registry sync.
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();

  const logger = new Logger('Worker');
  logger.log(
    `notification worker started ` +
      `(sending ${
        process.env.NOTIFICATIONS_SENDING_ENABLED === 'true'
          ? 'ENABLED'
          : 'in shadow mode'
      })`,
  );

  // Close queues and workers cleanly so in-flight jobs are returned to the
  // queue rather than left stalled for the lock to expire.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      logger.log(`${signal} received, shutting the worker down`);
      void app.close().then(() => process.exit(0));
    });
  }
}

void bootstrapWorker();
