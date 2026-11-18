import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { CreatorEventsService } from './creator-events.service';
import { CreateCreatorEventDto } from './dto/create-creator-event.dto';
import { UpdateCreatorEventDto } from './dto/update-creator-event.dto';
import { ListCreatorEventsQueryDto } from './dto/list-creator-events-query.dto';
import { CreatorEventDto, FeedCreatorEventDto } from './dto/creator-event.dto';

class PagedCreatorEventsResponseDto {
  items!: CreatorEventDto[];
  nextCursor!: string | null;
}

class PagedFeedResponseDto {
  items!: FeedCreatorEventDto[];
  nextCursor!: string | null;
}

@ApiTags('Creator Events')
@ApiBearerAuth()
@Controller('creator-events')
export class CreatorEventsController {
  constructor(private readonly service: CreatorEventsService) {}

  @Get('me')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary: "List the authenticated creator's own event posts",
    description:
      'Includes posts an admin has hidden, flagged with `hidden` and the reason. A post the creator deleted is excluded.',
  })
  @ApiOkResponse({ type: PagedCreatorEventsResponseDto })
  async listMine(
    @Req() req: Request & { user: { id: string } },
    @Query() query: ListCreatorEventsQueryDto,
  ): Promise<PagedCreatorEventsResponseDto> {
    return this.service.listMyEvents(req.user.id, query);
  }

  @Get('me/quota')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Posts published in the last 24 hours' })
  async myQuota(
    @Req() req: Request & { user: { id: string } },
  ): Promise<{ postedToday: number }> {
    return { postedToday: await this.service.countRecentPosts(req.user.id) };
  }

  @Post()
  // Per-IP, on top of the global throttler. The per-creator ceiling that
  // actually governs the feed lives in the service.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Publish an event post' })
  @ApiCreatedResponse({ type: CreatorEventDto })
  async create(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateCreatorEventDto,
  ): Promise<CreatorEventDto> {
    return this.service.createEvent(req.user.id, dto);
  }

  @Patch(':id')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary: 'Edit one of your own posts',
    description:
      "Someone else's post returns 404, not 403 — a 403 would confirm the id exists.",
  })
  @ApiOkResponse({ type: CreatorEventDto })
  async update(
    @Req() req: Request & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreatorEventDto,
  ): Promise<CreatorEventDto> {
    return this.service.updateEvent(req.user.id, id, dto);
  }

  @Delete(':id')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one of your own posts' })
  @ApiNoContentResponse()
  async remove(
    @Req() req: Request & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.deleteEvent(req.user.id, id);
  }

  @Get('feed')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary: 'The brand events feed — every listed creator, newest first',
    description:
      'Agencies reach this through the same BRAND workspace as wishlists and briefs. Hidden, deleted and unlisted creators’ posts are excluded.',
  })
  @ApiOkResponse({ type: PagedFeedResponseDto })
  async feed(
    @Query() query: ListCreatorEventsQueryDto,
  ): Promise<PagedFeedResponseDto> {
    return this.service.listFeed(query);
  }
}
