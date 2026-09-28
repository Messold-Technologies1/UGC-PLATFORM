import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { BrandAccessModule } from '../brand-access/brand-access.module';
import { NotificationRegistrySyncService } from './catalog/registry-sync.service';
import { NotificationDispatchService } from './dispatch/notification-dispatch.service';
import { NotificationEventsService } from './dispatch/notification-events.service';
import { NotificationStepService } from './dispatch/notification-step.service';
import { NotificationSweepService } from './dispatch/notification-sweep.service';
import { NotificationBackstopService } from './dispatch/notification-backstop.service';
import { NotificationLogService } from './log/notification-log.service';
import { NotificationQueueService } from './queues/notification-queue.service';
import { NotificationTemplateRenderer } from './rendering/notification-template-renderer.service';
import { TemplateValidatorService } from './rendering/template-validator.service';
import { NotificationsAdminController } from './admin/notifications-admin.controller';
import { NotificationsAdminService } from './admin/notifications-admin.service';

/**
 * The notification engine.
 *
 * Only NotificationEventsService (and NotificationLogService, for the delivery
 * webhooks) is exported: the catalog, renderer, queues and workers are internal,
 * so nothing outside this module knows that email or WhatsApp exist.
 *
 * Relies on ScheduleModule.forRoot() being registered app-wide (JobsModule)
 * for @Cron discovery and SchedulerRegistry, the same way the creator-reminder
 * and social-connection modules do.
 *
 * P2 runs in shadow mode. Every decision is made and logged, but nothing
 * reaches a provider until NOTIFICATIONS_SENDING_ENABLED=true at cutover, so
 * this can be deployed alongside the existing notifiers and compared.
 */
@Global()
@Module({
  // AuthGuardsModule supplies JwtAuthGuard and AdminGuard for the admin
  // controller; forwardRef mirrors how the other admin modules take it.
  imports: [BrandAccessModule, forwardRef(() => AuthGuardsModule)],
  controllers: [NotificationsAdminController],
  providers: [
    NotificationRegistrySyncService,
    NotificationTemplateRenderer,
    TemplateValidatorService,
    NotificationsAdminService,
    NotificationLogService,
    NotificationDispatchService,
    NotificationStepService,
    NotificationSweepService,
    NotificationBackstopService,
    NotificationQueueService,
    NotificationEventsService,
  ],
  exports: [NotificationEventsService, NotificationLogService],
})
export class NotificationsModule {}
