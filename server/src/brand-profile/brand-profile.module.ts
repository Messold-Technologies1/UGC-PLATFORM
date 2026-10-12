import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminBrandController } from './admin-brand.controller';
import { BrandProfileController } from './brand-profile.controller';
import { BrandProfileService } from './brand-profile.service';

@Module({
  imports: [forwardRef(() => AuthGuardsModule), forwardRef(() => WalletModule)],
  controllers: [BrandProfileController, AdminBrandController],
  providers: [BrandProfileService],
  exports: [BrandProfileService],
})
export class BrandProfileModule {}
