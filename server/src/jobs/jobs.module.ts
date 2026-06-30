import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WatermarkModule } from '../watermark/watermark.module';
import { JobsService } from './jobs.service';
import { WatermarkQueueService } from './watermark-queue.service';

@Module({
  imports: [ScheduleModule.forRoot(), WatermarkModule],
  providers: [JobsService, WatermarkQueueService],
  exports: [WatermarkQueueService],
})
export class JobsModule {}
