import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RazorpayModule } from '../razorpay/razorpay.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, RazorpayModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

