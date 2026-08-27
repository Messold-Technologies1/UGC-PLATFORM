import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SocialConnectionsModule } from '../social-connections/social-connections.module';
import { CreatorPortfolioController } from './creator-portfolio.controller';
import { CreatorPortfolioService } from './creator-portfolio.service';
import { InstagramMirrorService } from './instagram-mirror.service';
import { InstagramMirrorQueueService } from './instagram-mirror-queue.service';

/**
 * Creator portfolio videos: uploads, replacement, and importing reels from a
 * connected Instagram account.
 *
 * Imports SocialConnectionsModule for the reel cache — the import endpoint
 * reads it to authorize an id, and the mirror re-reads it when a signed CDN URL
 * has aged out — and RealtimeModule so a finished mirror can push the row's new
 * state to whoever is watching the grid.
 */
@Module({
  imports: [
    forwardRef(() => AuthGuardsModule),
    forwardRef(() => SocialConnectionsModule),
    RealtimeModule,
  ],
  controllers: [CreatorPortfolioController],
  providers: [
    CreatorPortfolioService,
    InstagramMirrorService,
    InstagramMirrorQueueService,
  ],
  exports: [CreatorPortfolioService],
})
export class CreatorPortfolioModule {}
