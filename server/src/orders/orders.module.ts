import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RazorpayModule } from '../razorpay/razorpay.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, RazorpayModule, RealtimeModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

