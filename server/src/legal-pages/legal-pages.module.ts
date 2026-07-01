import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { LegalPagesController } from './legal-pages.controller';
import { AdminLegalPagesController } from './admin-legal-pages.controller';
import { LegalPagesService } from './legal-pages.service';

@Module({
  imports: [forwardRef(() => AuthGuardsModule)],
  controllers: [LegalPagesController, AdminLegalPagesController],
  providers: [LegalPagesService],
  exports: [LegalPagesService],
})
export class LegalPagesModule {}
