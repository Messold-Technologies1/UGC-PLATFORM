import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WatermarkModule } from '../watermark/watermark.module';
import { PreviewVideoModule } from '../preview-video/preview-video.module';
import { MediaNormalizeModule } from '../media-normalize/media-normalize.module';
import { JobsService } from './jobs.service';
import { WatermarkQueueService } from './watermark-queue.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    WatermarkModule,
    PreviewVideoModule,
    MediaNormalizeModule,
  ],
  providers: [JobsService, WatermarkQueueService],
  exports: [WatermarkQueueService],
})
export class JobsModule {}
