import { Module, forwardRef } from '@nestjs/common';
import { CreatorProfileController } from './creator-profile.controller';
import { AdminCreatorController } from './admin-creator.controller';
import { CreatorProfileService } from './creator-profile.service';
import { CreatorPayoutDetailsService } from './creator-payout-details.service';
import { CreatorUnavailabilityService } from './creator-unavailability.service';
import { CreatorPackageModule } from '../creator-package/creator-package.module';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CreatorReviewsModule } from '../creator-reviews/creator-reviews.module';
import { CreatorDemoVideosModule } from '../creator-demo-videos/creator-demo-videos.module';
import { AiModule } from '../ai/ai.module';
import { CreatorBioGeneratorService } from './creator-bio-generator.service';

@Module({
  imports: [
    CreatorPackageModule,
    forwardRef(() => AuthGuardsModule),
    CreatorReviewsModule,
    CreatorDemoVideosModule,
    AiModule,
  ],
  controllers: [CreatorProfileController, AdminCreatorController],
  providers: [
    CreatorProfileService,
    CreatorPayoutDetailsService,
    CreatorUnavailabilityService,
    CreatorBioGeneratorService,
  ],
  exports: [CreatorProfileService],
})
export class CreatorProfileModule {}
