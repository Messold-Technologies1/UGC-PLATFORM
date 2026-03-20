import { Module } from '@nestjs/common';
import { CreatorProfileController } from './creator-profile.controller';
import { CreatorProfileService } from './creator-profile.service';
import { CreatorPackageModule } from '../creator-package/creator-package.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CreatorPackageModule, AuthModule],
  controllers: [CreatorProfileController],
  providers: [CreatorProfileService],
})
export class CreatorProfileModule {}
