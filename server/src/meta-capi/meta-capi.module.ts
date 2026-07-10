import { Global, Module } from '@nestjs/common';
import { MetaCapiService } from './meta-capi.service';

/**
 * Global so any service (e.g. creator approval) can inject MetaCapiService
 * without wiring imports. Depends only on the global ConfigModule.
 */
@Global()
@Module({
  providers: [MetaCapiService],
  exports: [MetaCapiService],
})
export class MetaCapiModule {}
