import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { brandActorParams } from '../brand-access/brand-actor-params.util';
import { ListOrderChatMessagesQueryDto } from '../order-chat/dto/list-order-chat-messages-query.dto';
import { OrderChatMessagesResponseDto } from '../order-chat/dto/order-chat-messages-response.dto';
import { toOrderChatMessageDto } from '../order-chat/order-chat-message.mapper';
import { OrderChatService } from '../order-chat/order-chat.service';
import { ChatsService } from './chats.service';
import {
  BrandChatsListResponseDto,
  CreatorChatsListResponseDto,
} from './dto/chats-list-response.dto';
import { ListChatsQueryDto } from './dto/list-chats-query.dto';

@ApiTags('Chats')
@ApiBearerAuth()
@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(
    private readonly chats: ChatsService,
    private readonly orderChat: OrderChatService,
  ) {}

  @Get('creator')
  @RequiredWorkspace('CREATOR')
  @UseGuards(WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'List order chat threads for the authenticated creator (sorted by latest activity)',
  })
  @ApiOkResponse({ type: CreatorChatsListResponseDto })
  async listCreatorChats(
    @Query() query: ListChatsQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorChatsListResponseDto> {
    return this.chats.listChatsForCreator({
      creatorUserId: req.user.id,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('brand')
  @RequiredWorkspace('BRAND')
  @UseGuards(WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'List order chat threads for the active brand (brand or agency workspace; sorted by latest activity)',
  })
  @ApiOkResponse({ type: BrandChatsListResponseDto })
  async listBrandChats(
    @Query() query: ListChatsQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<BrandChatsListResponseDto> {
    return this.chats.listChatsForBrand({
      ...brandActorParams(req),
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':orderId/messages')
  @ApiOperation({
    summary:
      'List messages for an order chat (order participant only; same as GET /orders/:id/chat/messages)',
  })
  @ApiOkResponse({ type: OrderChatMessagesResponseDto })
  async listMessages(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Query() query: ListOrderChatMessagesQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<OrderChatMessagesResponseDto> {
    const { items, nextCursor } = await this.orderChat.listMessages({
      orderId,
      viewerUserId: req.user.id,
      limit: query.limit ?? 20,
      cursor: query.cursor,
      after: query.after,
    });

    return {
      items: items.map(toOrderChatMessageDto),
      nextCursor,
    };
  }
}
