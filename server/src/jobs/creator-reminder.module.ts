import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CreatorReminderQueueService } from './creator-reminder-queue.service';
import { CreatorReminderService } from './creator-reminder.service';

/**
 * Event-driven creator "finish your profile" reminders (delayed jobs) plus the
 * low-frequency DB-truth backstop. Exports the queue service so the signup flow
 * can schedule a creator's reminders right after registration.
 *
 * Relies on ScheduleModule.forRoot() being registered app-wide (JobsModule) for
 * the @Cron backstop, and on the global MailModule for the notifier.
 */
@Module({
  imports: [PrismaModule],
  providers: [CreatorReminderService, CreatorReminderQueueService],
  exports: [CreatorReminderQueueService],
})
export class CreatorReminderModule {}
