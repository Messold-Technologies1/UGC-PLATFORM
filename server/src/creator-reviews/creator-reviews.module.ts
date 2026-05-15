import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreatorReviewsService } from './creator-reviews.service';

@Module({
  imports: [AuthModule],
  providers: [CreatorReviewsService],
  exports: [CreatorReviewsService],
})
export class CreatorReviewsModule {}
