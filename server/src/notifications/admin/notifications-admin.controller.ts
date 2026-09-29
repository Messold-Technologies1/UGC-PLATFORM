import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { NotificationChannel } from '@prisma/client';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationsAdminService } from './notifications-admin.service';
import {
  BackfillDto,
  DeriveTextDto,
  PreviewDraftDto,
  PreviewTemplateDto,
  ReplaceScheduleDto,
  SaveTemplateDto,
  UpdateEventDto,
} from './dto/notifications-admin.dto';

type AuthedRequest = Request & { user: { id: string } };

@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
export class NotificationsAdminController {
  constructor(private readonly service: NotificationsAdminService) {}

  // ---- events ----

  @Get('events')
  @ApiOperation({
    summary: 'List notification events with their templates and schedule',
  })
  listEvents() {
    return this.service.listEvents();
  }

  @Get('events/:key')
  @ApiOperation({
    summary: 'Event detail including the variables its templates may use',
  })
  @ApiParam({ name: 'key', example: 'order-brief-submitted-for-creator' })
  getEvent(@Param('key') key: string) {
    return this.service.getEvent(key);
  }

  @Patch('events/:key')
  @ApiOperation({
    summary: 'Toggle an event, or change which templates it uses',
  })
  updateEvent(@Param('key') key: string, @Body() dto: UpdateEventDto) {
    return this.service.updateEvent(key, dto);
  }

  @Put('events/:key/schedule')
  @ApiOperation({
    summary: 'Replace the whole schedule for an event',
    description:
      'Replaces every row in one transaction, so re-timing a row cannot collide with its neighbour mid-save.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'A row with an offset was sent for an event that has no relevance check, so a delayed send would notify people who have already acted.',
  })
  replaceSchedule(@Param('key') key: string, @Body() dto: ReplaceScheduleDto) {
    return this.service.replaceSchedule(key, dto);
  }

  @Post('events/:key/backfill')
  @ApiOperation({
    summary:
      'Apply a newly added row to entities that already fired this event',
    description:
      'New rows only affect future events. This applies one to the recent past, using the delivery log as the record of what fired.',
  })
  backfill(@Param('key') key: string, @Body() dto: BackfillDto) {
    return this.service.backfill(key, dto);
  }

  @Post('events/:key/sweep')
  @ApiOperation({
    summary: 'Send this event to entities it was never emitted for',
    description:
      'For events with no moment to emit from — a profile that simply sits unfinished. Pass dryRun to get the count without sending.',
  })
  sweep(@Param('key') key: string, @Query('dryRun') dryRun?: string) {
    return this.service.sweepPopulation(key, dryRun === 'true');
  }

  // ---- templates ----

  @Get('templates')
  @ApiOperation({ summary: 'List email templates' })
  listTemplates() {
    return this.service.listTemplates();
  }

  @Get('templates/catalog')
  @ApiOperation({
    summary: 'Event keys and their variables, for the editor picker',
  })
  catalog() {
    return this.service.catalogKeys();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Template content' })
  getTemplate(@Param('id') id: string) {
    return this.service.getTemplate(id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a template' })
  @ApiUnprocessableEntityResponse({
    description:
      'Validation failed; the body lists each issue with its part and kind.',
  })
  createTemplate(@Body() dto: SaveTemplateDto, @Req() req: AuthedRequest) {
    return this.service.saveTemplate(dto, req.user.id);
  }

  @Put('templates/:id')
  @ApiOperation({
    summary: 'Save a template',
    description:
      'Validates before writing, snapshots the previous content as a version, and bumps the version so the edit is live without a restart.',
  })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  saveTemplate(
    @Param('id') id: string,
    @Body() dto: SaveTemplateDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.saveTemplate(dto, req.user.id, id);
  }

  @Post('templates/:id/preview')
  @ApiOperation({
    summary: 'Render a template against the event’s example values',
  })
  @ApiOkResponse({
    description: 'Rendered subject, html and text plus the context used.',
  })
  preview(@Param('id') id: string, @Body() dto: PreviewTemplateDto) {
    return this.service.preview(id, dto.eventKey, {
      subjectHbs: dto.subjectHbs,
      htmlHbs: dto.htmlHbs,
      textHbs: dto.textHbs,
    });
  }

  @Post('templates/preview')
  @ApiOperation({
    summary: 'Render draft content for a template that has no row yet',
    description:
      'Same rendering as the saved preview, for the create form. Variables ' +
      'resolve from the name being typed.',
  })
  previewDraft(@Body() dto: PreviewDraftDto) {
    return this.service.previewDraft(
      dto.name,
      {
        subjectHbs: dto.subjectHbs,
        htmlHbs: dto.htmlHbs,
        textHbs: dto.textHbs,
      },
      dto.eventKey,
    );
  }

  @Post('templates/derive-text')
  @ApiOperation({
    summary: 'Plain-text template implied by a block of HTML',
    description:
      'Used by the editor to keep the plain-text part in step with the HTML, ' +
      'including for a template that does not exist yet.',
  })
  deriveText(@Body() dto: DeriveTextDto) {
    return this.service.deriveText(dto.htmlHbs);
  }

  @Get('templates/:id/versions')
  @ApiOperation({ summary: 'Version history' })
  listVersions(@Param('id') id: string) {
    return this.service.listVersions(id);
  }

  @Post('templates/:id/revert/:version')
  @ApiOperation({
    summary: 'Restore a previous version',
    description:
      'Goes through the same validation as a save, since the event’s variables may have changed since.',
  })
  revert(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() req: AuthedRequest,
  ) {
    return this.service.revert(id, version, req.user.id);
  }

  // ---- logs ----

  @Get('logs')
  @ApiOperation({
    summary: 'Delivery log',
    description:
      'Every send and every deliberate skip, so "did they get it, and if not why" is answerable here.',
  })
  listLogs(
    @Query('eventKey') eventKey?: string,
    @Query('recipientUserId') recipientUserId?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: NotificationChannel,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.listLogs({
      eventKey,
      recipientUserId,
      status,
      channel,
      take: take ? Number(take) : undefined,
      cursor,
    });
  }
}
