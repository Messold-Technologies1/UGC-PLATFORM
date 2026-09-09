import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RazorpayModule } from '../razorpay/razorpay.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { StorageModule } from '../storage/storage.module';
import { OrderChatModule } from '../order-chat/order-chat.module';
import { CreatorReviewsModule } from '../creator-reviews/creator-reviews.module';
import { JobsModule } from '../jobs/jobs.module';
import { CreatorPortfolioModule } from '../creator-portfolio/creator-portfolio.module';

@Module({
  imports: [
    AuthModule,
    RazorpayModule,
    RealtimeModule,
    StorageModule,
    OrderChatModule,
    CreatorReviewsModule,
    JobsModule,
    CreatorPortfolioModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
