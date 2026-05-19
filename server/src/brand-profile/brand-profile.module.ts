import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminBrandController } from './admin-brand.controller';
import { BrandProfileController } from './brand-profile.controller';
import { BrandProfileService } from './brand-profile.service';

@Module({
  imports: [AuthModule],
  controllers: [BrandProfileController, AdminBrandController],
  providers: [BrandProfileService],
  exports: [BrandProfileService],
})
export class BrandProfileModule {}

