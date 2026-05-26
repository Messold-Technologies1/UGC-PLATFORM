import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { RazorpayModule } from '../razorpay/razorpay.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { OrdersModule } from '../orders/orders.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RazorpayModule, OrdersModule, RealtimeModule, MailModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}

