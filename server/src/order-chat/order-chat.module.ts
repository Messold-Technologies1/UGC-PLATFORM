import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrderChatController } from './order-chat.controller';
import { ChatGateway } from './chat.gateway';
import { OrderChatRealtimeNotifier } from './order-chat-realtime.notifier';
import { OrderChatService } from './order-chat.service';

@Module({
  imports: [AuthModule],
  controllers: [OrderChatController],
  providers: [OrderChatService, ChatGateway, OrderChatRealtimeNotifier],
  exports: [OrderChatService],
})
export class OrderChatModule {}

