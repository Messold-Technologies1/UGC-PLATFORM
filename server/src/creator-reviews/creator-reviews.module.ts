import { Module } from '@nestjs/common';
import { CreatorReviewsService } from './creator-reviews.service';

@Module({
  providers: [CreatorReviewsService],
  exports: [CreatorReviewsService],
})
export class CreatorReviewsModule {}
