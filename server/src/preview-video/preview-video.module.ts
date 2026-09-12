import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewVideoService } from './preview-video.service';
import { PreviewVideoQueueService } from './preview-video-queue.service';

/**
 * Creator card-preview pipeline: generates a faststart + downscaled rendition of
 * each creator's effective preview video so hover-to-play on discovery cards
 * starts quickly. StorageService is provided by the global StorageModule.
 *
 * Exports the queue so feature modules can `enqueue(creatorId)` after a source
 * video changes, and JobsModule can drive the reconcile backstop.
 */
@Module({
  imports: [PrismaModule],
  providers: [PreviewVideoService, PreviewVideoQueueService],
  exports: [PreviewVideoQueueService, PreviewVideoService],
})
export class PreviewVideoModule {}
