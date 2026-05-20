import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { BrandProfileModule } from '../brand-profile/brand-profile.module';
import { StorageModule } from '../storage/storage.module';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';

@Module({
  imports: [forwardRef(() => AuthGuardsModule), BrandProfileModule, StorageModule],
  controllers: [AgencyController],
  providers: [AgencyService],
  exports: [AgencyService],
})
export class AgencyModule {}
