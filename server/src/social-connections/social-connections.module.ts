import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { InstagramClient } from './instagram.client';
import { SocialConnectionsController } from './social-connections.controller';
import { SocialConnectionsService } from './social-connections.service';
import { SocialMetricsCron } from './social-metrics.cron';
import { SocialMetricsQueueService } from './social-metrics-queue.service';

/**
 * Social account connections (Instagram now; YouTube/Reddit reserved). Owns the
 * OAuth connect/callback endpoints, the BullMQ metrics worker, and the daily
 * sync / reconcile / token-refresh crons. Relies on the app-wide
 * ScheduleModule.forRoot() registered in JobsModule for @Cron discovery.
 */
@Module({
  imports: [forwardRef(() => AuthGuardsModule)],
  controllers: [SocialConnectionsController],
  providers: [
    InstagramClient,
    SocialConnectionsService,
    SocialMetricsQueueService,
    SocialMetricsCron,
  ],
  exports: [SocialConnectionsService],
})
export class SocialConnectionsModule {}
