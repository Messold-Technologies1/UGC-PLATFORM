import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewVideoModule } from '../preview-video/preview-video.module';
import { MediaNormalizeService } from './media-normalize.service';
import { MediaNormalizeQueueService } from './media-normalize-queue.service';

/**
 * Normalizes creator videos (portfolio + intro) to web-safe H.264/AAC MP4 so
 * every browser can play them. StorageService is global; PreviewVideoModule is
 * imported so a normalized source re-triggers the card preview.
 *
 * Exports the queue so feature modules enqueue on upload/replace and JobsModule
 * drives the reconcile backstop.
 */
@Module({
  imports: [PrismaModule, PreviewVideoModule],
  providers: [MediaNormalizeService, MediaNormalizeQueueService],
  exports: [MediaNormalizeQueueService, MediaNormalizeService],
})
export class MediaNormalizeModule {}
