/**
 * Imports the bundled `.hbs` templates into the database by hand.
 *
 * The app already does this on every boot (NotificationBootstrapService), so
 * the normal way to get templates in is to deploy. This script exists for the
 * cases where that is not what you want:
 *
 *   - forcing a re-import without restarting the API
 *   - pointing at a database the running app is not pointed at
 *   - seeing the counts rather than hunting for a log line
 *
 * Usage (from server/, in the deployed container):
 *   npm run notifications:import-templates
 *
 * It replaces `prisma:seed:notification-templates`, which ran through
 * `ts-node` — a devDependency that a production install prunes, so in a
 * deployed container it failed with:
 *
 *     Error: Cannot find module 'ts-node/register/transpile-only'
 *
 * This runs from `dist` with plain node, the same way the backfill scripts do.
 *
 * It boots Config + Prisma and the one import service, not the whole
 * NotificationsModule: the queues, mail and WhatsApp providers are not needed
 * to copy files into a table, and booting them would make this fail on
 * unrelated configuration.
 *
 * Idempotent, and it never overwrites a template an admin has edited.
 *
 * Env: DATABASE_URL / DIRECT_URL, the usual app database variables.
 */
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationTemplateImportService } from '../notifications/rendering/template-import.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  providers: [NotificationTemplateImportService],
})
class ImportTemplatesModule {}

async function main(): Promise<void> {
  const logger = new Logger('import-notification-templates');
  const app = await NestFactory.createApplicationContext(
    ImportTemplatesModule,
    { bufferLogs: false },
  );

  try {
    const result = await app.get(NotificationTemplateImportService).run();
    logger.log(
      `done: ${result.templates} template(s) written, ` +
        `${result.linked} event link(s), ${result.schedules} schedule row(s)`,
    );
    if (result.linked === 0 && result.schedules === 0) {
      logger.warn(
        'no events were linked. If NotificationEvent is empty, boot the app ' +
          'once so the registry sync creates the rows, then run this again.',
      );
    }
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  new Logger('import-notification-templates').error(
    err instanceof Error ? err.message : String(err),
    err instanceof Error ? err.stack : undefined,
  );
  process.exitCode = 1;
});
