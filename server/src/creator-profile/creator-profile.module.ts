import { Module } from '@nestjs/common';
import { CreatorProfileController } from './creator-profile.controller';
import { AdminCreatorController } from './admin-creator.controller';
import { CreatorProfileService } from './creator-profile.service';
import { CreatorPayoutDetailsService } from './creator-payout-details.service';
import { CreatorPackageModule } from '../creator-package/creator-package.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CreatorPackageModule, AuthModule],
  controllers: [CreatorProfileController, AdminCreatorController],
  providers: [CreatorProfileService, CreatorPayoutDetailsService],
})
export class CreatorProfileModule {}
