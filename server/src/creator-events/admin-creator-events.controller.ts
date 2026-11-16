import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatorEventsService } from './creator-events.service';
import { AdminCreatorEventDto } from './dto/creator-event.dto';
import { HideCreatorEventDto } from './dto/hide-creator-event.dto';
import { ListAdminCreatorEventsQueryDto } from './dto/list-admin-creator-events-query.dto';

class PagedAdminEventsResponseDto {
  items!: AdminCreatorEventDto[];
  nextCursor!: string | null;
}

@ApiTags('Admin - Creator Events')
@ApiBearerAuth()
@Controller('admin/creator-events')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCreatorEventsController {
  constructor(private readonly service: CreatorEventsService) {}

  @Get()
  @ApiOperation({
    summary: 'List creator event posts for moderation, newest first',
  })
  @ApiOkResponse({ type: PagedAdminEventsResponseDto })
  async list(
    @Query() query: ListAdminCreatorEventsQueryDto,
  ): Promise<PagedAdminEventsResponseDto> {
    return this.service.listForAdmin(query);
  }

  @Post(':id/hide')
  @ApiOperation({
    summary: 'Hide a post',
    description:
      'Removes it from the brand feed at once. The creator keeps seeing it in their own list with a banner and the reason, so nothing disappears on them unexplained. Reversible; never deletes the row.',
  })
  @ApiOkResponse({ type: AdminCreatorEventDto })
  async hide(
    @Req() req: Request & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HideCreatorEventDto,
  ): Promise<AdminCreatorEventDto> {
    return this.service.hideEvent(req.user.id, id, dto.reason);
  }

  @Post(':id/unhide')
  @ApiOperation({ summary: 'Put a hidden post back in the feed' })
  @ApiOkResponse({ type: AdminCreatorEventDto })
  async unhide(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminCreatorEventDto> {
    return this.service.unhideEvent(id);
  }
}
