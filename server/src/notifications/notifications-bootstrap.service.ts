import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationRegistrySyncService } from './catalog/registry-sync.service';
import { NotificationTemplateImportService } from './rendering/template-import.service';

/**
 * The one ordered boot sequence for the notification engine.
 *
 * Order matters and is not incidental: the template import links templates to
 * events by key and seeds a schedule row per event, so `NotificationEvent` has
 * to be populated first. Expressing that as two independent `onModuleInit`
 * hooks would leave it to provider registration order, which is invisible at
 * the call site and silently breaks if someone reorders the array.
 *
 * Failure policy differs between the two on purpose:
 *
 * - **Registry sync throws.** Without the event rows the admin UI is empty and
 *   the dispatcher cannot resolve anything, so a broken deploy should fail
 *   loudly rather than serve traffic in a state nobody can configure.
 * - **Template import only logs.** A malformed `.hbs` should not take the API
 *   down; the renderer still falls back to the files on disk, so sends keep
 *   working and the next deploy retries the import.
 */
@Injectable()
export class NotificationBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(NotificationBootstrapService.name);

  constructor(
    private readonly registrySync: NotificationRegistrySyncService,
    private readonly templateImport: NotificationTemplateImportService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registrySync.sync();

    try {
      await this.templateImport.run();
    } catch (err) {
      this.logger.error(
        'notification template import failed; the admin template list will be ' +
          'empty or stale until the next boot. Sending is unaffected — the ' +
          'renderer falls back to the bundled files on disk.',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
