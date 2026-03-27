import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreatorPortfolioController } from './creator-portfolio.controller';
import { CreatorPortfolioService } from './creator-portfolio.service';

@Module({
  imports: [AuthModule],
  controllers: [CreatorPortfolioController],
  providers: [CreatorPortfolioService],
})
export class CreatorPortfolioModule {}

