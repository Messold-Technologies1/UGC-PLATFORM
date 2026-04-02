import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrandProfileController } from './brand-profile.controller';
import { BrandProfileService } from './brand-profile.service';

@Module({
  imports: [AuthModule],
  controllers: [BrandProfileController],
  providers: [BrandProfileService],
})
export class BrandProfileModule {}

