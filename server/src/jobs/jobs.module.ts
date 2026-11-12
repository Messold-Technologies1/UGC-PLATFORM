import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WatermarkModule } from '../watermark/watermark.module';
import { PreviewVideoModule } from '../preview-video/preview-video.module';
import { MediaNormalizeModule } from '../media-normalize/media-normalize.module';
import { JobsService } from './jobs.service';
import { WatermarkQueueService } from './watermark-queue.service';

/**
 * Whether @Cron jobs fire in THIS process.
 *
 * Both `main.ts` and `main.worker.ts` bootstrap AppModule, so registering the
 * scheduler unconditionally ran every cron twice — once in the API and once
 * in the worker. For most jobs that is wasted work; for the Instagram token
 * refresh it is a correctness bug, because the second process refreshes with
 * a token the first one just rotated and writes the loser back.
 *
 * Same contract the BullMQ split already uses (see ecosystem.config.js):
 * `false` in the API, `true` in the worker, and unset in local single-process
 * development, where crons should still run.
 */
const SCHEDULER_ENABLED =
  (process.env.BULLMQ_WORKER_ENABLED ?? 'true') !== 'false';

@Module({
  imports: [
    ...(SCHEDULER_ENABLED ? [ScheduleModule.forRoot()] : []),
    WatermarkModule,
    PreviewVideoModule,
    MediaNormalizeModule,
  ],
  providers: [JobsService, WatermarkQueueService],
  exports: [WatermarkQueueService],
})
export class JobsModule {}
