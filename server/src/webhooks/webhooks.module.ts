import { Module } from '@nestjs/common';
import { RazorpayModule } from '../razorpay/razorpay.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { OrdersModule } from '../orders/orders.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RazorpayModule, OrdersModule, RealtimeModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}

