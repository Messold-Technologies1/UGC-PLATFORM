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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgencyBrandLinkService } from './agency-brand-link.service';
import { RevokeAgencyLinkDto } from './dto/agency-brand-link.dto';

/**
 * Support oversight.
 *
 * Read-mostly by design, with force-unlink as the one escape hatch — for a
 * brand that has lost access to its own account, or a relationship that has
 * gone wrong. Admins deliberately cannot CREATE a link: brand consent (the
 * brand redeeming the code) and agency consent (accepting it) are the whole
 * safety property, and an admin-made link would bypass both.
 */
@ApiTags('Admin - Agency brand links')
@ApiBearerAuth()
@Controller('admin/agency-brand-links')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAgencyBrandLinksController {
  constructor(private readonly links: AgencyBrandLinkService) {}

  @Get()
  @ApiOperation({ summary: 'Which agencies manage which brands' })
  async list(
    @Query('agencyId') agencyId?: string,
    @Query('brandId') brandId?: string,
  ) {
    return this.links.adminList({ agencyId, brandId });
  }

  @Post(':id/force-unlink')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End a link on behalf of either side' })
  async forceUnlink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeAgencyLinkDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.links.revokeLink({
      linkId: id,
      actorUserId: req.user.id,
      actor: 'ADMIN',
      reason: dto?.reason,
    });
  }
}
