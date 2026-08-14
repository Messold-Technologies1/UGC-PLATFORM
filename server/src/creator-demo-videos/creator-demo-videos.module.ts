import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AdminDemoVideoController } from './admin-demo-video.controller';
import { CreatorDemoVideosService } from './creator-demo-videos.service';

// The public "list active demo videos" endpoint lives on CreatorProfileController
// (creators/demo-intro-videos), declared ahead of its 'creators/:id' catch-all, so
// route matching is deterministic regardless of module registration order. See
// CreatorProfileModule, which imports this module for CreatorDemoVideosService.
@Module({
  imports: [forwardRef(() => AuthGuardsModule)],
  controllers: [AdminDemoVideoController],
  providers: [CreatorDemoVideosService],
  exports: [CreatorDemoVideosService],
})
export class CreatorDemoVideosModule {}
