import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { PushController } from './push.controller';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { WebPushTransport } from './web-push.transport';

/**
 * Browser push: the subscription store, and the transport that posts to it.
 *
 * Exports WebPushTransport so the notification engine can deliver the PUSH
 * channel through it, the same way it reaches SES and the WhatsApp Cloud API.
 * Nothing here knows the engine exists — the dependency runs one way, so this
 * module stays usable on its own.
 */
@Module({
  // JwtAuthGuard pulls JwtService and AuthService from here, as the
  // notification-preferences module does.
  imports: [forwardRef(() => AuthGuardsModule)],
  controllers: [PushController],
  providers: [PushSubscriptionsService, WebPushTransport],
  exports: [WebPushTransport, PushSubscriptionsService],
})
export class PushModule {}
