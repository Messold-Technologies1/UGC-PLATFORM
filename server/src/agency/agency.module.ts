import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { StorageModule } from '../storage/storage.module';
import { AdminAgencyController } from './admin-agency.controller';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';

@Module({
  imports: [forwardRef(() => AuthGuardsModule), StorageModule],
  controllers: [AgencyController, AdminAgencyController],
  providers: [AgencyService],
  exports: [AgencyService],
})
export class AgencyModule {}
