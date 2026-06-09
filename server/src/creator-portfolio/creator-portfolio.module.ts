import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CreatorPortfolioController } from './creator-portfolio.controller';
import { CreatorPortfolioService } from './creator-portfolio.service';

@Module({
  imports: [forwardRef(() => AuthGuardsModule)],
  controllers: [CreatorPortfolioController],
  providers: [CreatorPortfolioService],
  exports: [CreatorPortfolioService],
})
export class CreatorPortfolioModule {}

