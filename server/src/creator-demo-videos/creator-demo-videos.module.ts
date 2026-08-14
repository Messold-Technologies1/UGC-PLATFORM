import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AdminDemoVideoController } from './admin-demo-video.controller';
import { DemoVideoController } from './demo-video.controller';
import { CreatorDemoVideosService } from './creator-demo-videos.service';

@Module({
  imports: [forwardRef(() => AuthGuardsModule)],
  controllers: [AdminDemoVideoController, DemoVideoController],
  providers: [CreatorDemoVideosService],
  exports: [CreatorDemoVideosService],
})
export class CreatorDemoVideosModule {}
