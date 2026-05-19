import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrandProfileModule } from '../brand-profile/brand-profile.module';
import { StorageModule } from '../storage/storage.module';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';

@Module({
  imports: [AuthModule, BrandProfileModule, StorageModule],
  controllers: [AgencyController],
  providers: [AgencyService],
  exports: [AgencyService],
})
export class AgencyModule {}
