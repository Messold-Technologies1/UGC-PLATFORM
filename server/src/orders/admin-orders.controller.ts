import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminRejectOrderDto } from './dto/admin-reject-order.dto';
import { OrdersService } from './orders.service';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { AdminOrdersListResponseDto } from './dto/admin-orders-list-response.dto';
import { AdminOrderDetailsResponseDto } from './dto/admin-order-details-response.dto';
import { OrderChatService } from '../order-chat/order-chat.service';
import { ListOrderChatMessagesQueryDto } from '../order-chat/dto/list-order-chat-messages-query.dto';
import { OrderChatMessagesResponseDto } from '../order-chat/dto/order-chat-messages-response.dto';
import { OrderChatStateDto } from '../order-chat/dto/order-chat-state.dto';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly chat: OrderChatService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all orders (creator + brand snapshot per row)',
  })
  @ApiOkResponse({ type: AdminOrdersListResponseDto })
  async listOrders(
    @Query() query: ListOrdersQueryDto,
  ): Promise<AdminOrdersListResponseDto> {
    return this.orders.listOrdersForAdmin({
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order details (admin; excludes brief payload)',
  })
  @ApiOkResponse({ type: AdminOrderDetailsResponseDto })
  async getOrderDetails(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminOrderDetailsResponseDto> {
    return this.orders.getOrderDetailsForAdmin({ orderId: id });
  }

  @Post(':id/mark-creator-paid')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Mark creator as paid manually (after bank transfer from company account)',
  })
  @ApiNoContentResponse()
  async markCreatorPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.orders.adminMarkCreatorPaymentDone({
      orderId: id,
      adminUserId: req.user.id,
    });
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Mark order REJECTED (refund path); resolves open disputes as RESOLVED_REFUNDED',
  })
  @ApiNoContentResponse()
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminRejectOrderDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.orders.adminRejectOrder({
      orderId: id,
      adminUserId: req.user.id,
      resolutionNotes: dto.resolutionNotes,
    });
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Trigger Razorpay refund (order must be REJECTED); sets REFUNDED on success',
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        refundId: { type: 'string' },
        refundStatus: { type: 'string' },
      },
    },
  })
  async refund(@Param('id', ParseUUIDPipe) id: string): Promise<{
    refundId: string;
    refundStatus: string;
  }> {
    return this.orders.adminTriggerRefund({ orderId: id });
  }

  @Get(':id/chat/messages')
  @ApiOperation({ summary: 'List order chat messages (admin; read-only)' })
  @ApiOkResponse({ type: OrderChatMessagesResponseDto })
  async listOrderChatMessages(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Query() query: ListOrderChatMessagesQueryDto,
  ): Promise<OrderChatMessagesResponseDto> {
    const { items, nextCursor } = await this.chat.listMessagesForAdmin({
      orderId,
      limit: query.limit ?? 20,
      cursor: query.cursor,
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

  @Get(':id/chat/state')
  @ApiOperation({ summary: 'Get order chat read state (admin; read-only)' })
  @ApiOkResponse({ type: OrderChatStateDto })
  async getOrderChatState(
    @Param('id', ParseUUIDPipe) orderId: string,
  ): Promise<OrderChatStateDto> {
    const state = await this.chat.getStateForAdmin({ orderId });
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
