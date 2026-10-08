import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  NotificationPreferencesDto,
  UpdateNotificationPreferencesDto,
} from './dto/notification-preferences.dto';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('Notification preferences')
@ApiBearerAuth()
@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      "Notification opt-ins for the authenticated account's own workspace",
  })
  @ApiOkResponse({ type: NotificationPreferencesDto })
  async getMine(
    @Req() req: Request & { user: { id: string } },
  ): Promise<NotificationPreferencesDto> {
    return this.service.getForUser(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Turn email or WhatsApp notifications on or off' })
  @ApiOkResponse({ type: NotificationPreferencesDto })
  async updateMine(
    @Body() dto: UpdateNotificationPreferencesDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<NotificationPreferencesDto> {
    return this.service.updateForUser(req.user.id, dto);
  }
}
