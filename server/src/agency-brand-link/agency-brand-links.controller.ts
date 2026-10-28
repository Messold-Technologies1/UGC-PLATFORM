import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { AgencyBrandLinkService } from './agency-brand-link.service';
import {
  AgencyBrandLinkItemDto,
  RevokeAgencyLinkDto,
} from './dto/agency-brand-link.dto';

/**
 * The AGENCY's side: hold the partner code, answer incoming requests, and see
 * which brands are managed.
 *
 * The agency approves here — brands do the asking — so these are the routes
 * that actually grant access.
 */
@ApiTags('Agency - Brand links')
@ApiBearerAuth()
@Controller('agency')
@RequiredWorkspace('AGENCY')
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
export class AgencyBrandLinksController {
  constructor(private readonly links: AgencyBrandLinkService) {}

  @Get('brand-links')
  @ApiOperation({
    summary: 'Brands managed, plus requests awaiting this agency',
  })
  @ApiOkResponse({ type: AgencyBrandLinkItemDto, isArray: true })
  async list(@Req() req: Request & { user: { id: string } }) {
    return this.links.listForAgency(req.user.id);
  }

  @Post('brand-links/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept a brand's request and start managing them" })
  @ApiConflictResponse({ description: 'No longer pending' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.links.acceptLink({ agencyUserId: req.user.id, linkId: id });
  }

  @Post('brand-links/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Decline a request. The brand may ask again later.',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.links.rejectLink({ agencyUserId: req.user.id, linkId: id });
  }

  @Delete('brand-links/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop managing a brand' })
  async leave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeAgencyLinkDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.links.revokeLink({
      linkId: id,
      actorUserId: req.user.id,
      actor: 'AGENCY',
      reason: dto?.reason,
    });
  }

  @Get('brand-links/:brandId/spend-report')
  @ApiOperation({
    summary: 'What this agency has spent inside one brand, for reconciliation',
    description:
      'Refunds and completion credits always land in the brand wallet, even ' +
      'for an order the agency paid by card, so this is how an agency settles ' +
      'up with the brand off-platform.',
  })
  async spendReport(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.links.spendReport({ agencyUserId: req.user.id, brandId });
  }
}
