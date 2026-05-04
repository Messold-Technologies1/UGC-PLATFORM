import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderChatService } from './order-chat.service';
import { ListOrderChatMessagesQueryDto } from './dto/list-order-chat-messages-query.dto';
import { OrderChatMessagesResponseDto } from './dto/order-chat-messages-response.dto';
import { SendOrderChatMessageDto } from './dto/send-order-chat-message.dto';
import { OrderChatMessageDto } from './dto/order-chat-message.dto';
import { MarkOrderChatReadDto } from './dto/mark-order-chat-read.dto';
import { OrderChatStateDto } from './dto/order-chat-state.dto';
import { OrderChatReadReceiptDto } from './dto/order-chat-read-receipt.dto';

@ApiTags('Order Chat')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderChatController {
  constructor(private readonly chat: OrderChatService) {}

  @Get(':id/chat/messages')
  @ApiOperation({ summary: 'List order chat messages (order participant only)' })
  @ApiOkResponse({ type: OrderChatMessagesResponseDto })
  async listMessages(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Query() query: ListOrderChatMessagesQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<OrderChatMessagesResponseDto> {
    const { items, nextCursor } = await this.chat.listMessages({
      orderId,
      viewerUserId: req.user.id,
      limit: query.limit ?? 20,
      cursor: query.cursor,
      after: query.after,
    });

    return {
      items: items.map((m) => ({
        id: m.id,
        orderId: m.orderId,
        senderUserId: m.senderUserId,
        text: m.text,
        clientMessageId: m.clientMessageId,
        createdAt: m.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }

  @Post(':id/chat/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message in an order chat (order participant only)' })
  @ApiCreatedResponse({ type: OrderChatMessageDto })
  async sendMessage(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: SendOrderChatMessageDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<OrderChatMessageDto> {
    const m = await this.chat.sendMessage({
      orderId,
      senderUserId: req.user.id,
      text: dto.text,
      clientMessageId: dto.clientMessageId,
    });
    return {
      id: m.id,
      orderId: m.orderId,
      senderUserId: m.senderUserId,
      text: m.text,
      clientMessageId: m.clientMessageId,
      createdAt: m.createdAt.toISOString(),
    };
  }

  @Post(':id/chat/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages as read up to lastReadMessageId (order participant only)' })
  @ApiOkResponse({ type: OrderChatReadReceiptDto })
  async markRead(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: MarkOrderChatReadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<OrderChatReadReceiptDto> {
    const row = await this.chat.markRead({
      orderId,
      viewerUserId: req.user.id,
      lastReadMessageId: dto.lastReadMessageId,
    });
    return {
      orderId: row.orderId,
      userId: row.userId,
      lastReadMessageId: row.lastReadMessageId,
      lastReadAt: row.lastReadAt ? row.lastReadAt.toISOString() : null,
    };
  }

  @Get(':id/chat/state')
  @ApiOperation({ summary: 'Get read state for an order chat (order participant only)' })
  @ApiOkResponse({ type: OrderChatStateDto })
  async getState(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<OrderChatStateDto> {
    const state = await this.chat.getState({ orderId, viewerUserId: req.user.id });
    return {
      orderId: state.orderId,
      brandUserId: state.brandUserId,
      creatorUserId: state.creatorUserId,
      brandLastReadMessageId: state.brandLastReadMessageId,
      brandLastReadAt: state.brandLastReadAt?.toISOString(),
      creatorLastReadMessageId: state.creatorLastReadMessageId,
      creatorLastReadAt: state.creatorLastReadAt?.toISOString(),
    };
  }
}

