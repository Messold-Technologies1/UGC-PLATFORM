import { Global, Module } from '@nestjs/common';
import { BrandAccessModule } from '../brand-access/brand-access.module';
import { NotificationRegistrySyncService } from './catalog/registry-sync.service';
import { NotificationDispatchService } from './dispatch/notification-dispatch.service';
import { NotificationEventsService } from './dispatch/notification-events.service';
import { NotificationStepService } from './dispatch/notification-step.service';
import { NotificationLogService } from './log/notification-log.service';
import { NotificationQueueService } from './queues/notification-queue.service';
import { NotificationTemplateRenderer } from './rendering/notification-template-renderer.service';

/**
 * The notification engine.
 *
 * Only NotificationEventsService (and NotificationLogService, for the delivery
 * webhooks) is exported: the catalog, renderer, queues and workers are internal,
 * so nothing outside this module knows that email or WhatsApp exist.
 *
 * P2 runs in shadow mode. Every decision is made and logged, but nothing
 * reaches a provider until NOTIFICATIONS_SENDING_ENABLED=true at cutover, so
 * this can be deployed alongside the existing notifiers and compared.
 */
@Global()
@Module({
  imports: [BrandAccessModule],
  providers: [
    NotificationRegistrySyncService,
    NotificationTemplateRenderer,
    NotificationLogService,
    NotificationDispatchService,
    NotificationStepService,
    NotificationQueueService,
    NotificationEventsService,
  ],
  exports: [NotificationEventsService, NotificationLogService],
})
export class NotificationsModule {}
