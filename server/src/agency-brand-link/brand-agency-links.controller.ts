import {
  Body,
  Controller,
  ForbiddenException,
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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { readBrandProfileIdFromRequest } from '../brand-access/brand-context.util';
import { AgencyBrandLinkService } from './agency-brand-link.service';
import {
  BrandAgencyLinksResponseDto,
  RequestAgencyLinkDto,
  RevokeAgencyLinkDto,
} from './dto/agency-brand-link.dto';

/**
 * The BRAND's side: redeem an agency's partner code, see who manages you, and
 * end a relationship.
 *
 * Every route here is barred to an agency acting inside this brand's workspace.
 * That matters because a brand may link several agencies at once — without the
 * check, one agency could connect a second, withdraw a rival's pending request,
 * or revoke a rival's access. A managing agency is a guest, not a key-holder.
 */
@ApiTags('Brand - Agency links')
@ApiBearerAuth()
// Sits under the brand profile family — /api/brands/profile/* — alongside
// GET profile/me and PATCH profile, which is where the client looks for it.
@Controller('brands/profile/agency-links')
@RequiredWorkspace('BRAND')
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
export class BrandAgencyLinksController {
  constructor(private readonly links: AgencyBrandLinkService) {}

  /**
   * An agency switched into this brand still presents the brand's JWT, so the
   * route guard cannot tell them apart. The active-brand header is what
   * distinguishes them: its presence means somebody is operating a brand that
   * is not their own account, which is exactly who must be refused here.
   */
  private assertBrandItself(req: Request): void {
    if (readBrandProfileIdFromRequest(req)) {
      throw new ForbiddenException(
        'Managing your agency connections can only be done by the brand itself.',
      );
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // Codes are short, so the submit endpoint is the one place guessing could be
  // attempted at volume. Accepting is still required, but rate limiting keeps
  // an agency's inbox from being used as an oracle.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: "Request a link by redeeming an agency's partner ID",
  })
  @ApiCreatedResponse({
    description: 'Request created and the agency notified',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Brand profile incomplete; body carries gaps[] and hints[]',
  })
  @ApiConflictResponse({ description: 'Already linked or already pending' })
  async request(
    @Body() dto: RequestAgencyLinkDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    this.assertBrandItself(req);
    return this.links.requestLink({
      brandUserId: req.user.id,
      rawPartnerId: dto.partnerId,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Agencies managing this brand, plus pending requests',
  })
  @ApiOkResponse({ type: BrandAgencyLinksResponseDto })
  async list(@Req() req: Request & { user: { id: string } }) {
    this.assertBrandItself(req);
    return this.links.listForBrand(req.user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw a pending request' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    this.assertBrandItself(req);
    return this.links.revokeLink({
      linkId: id,
      actorUserId: req.user.id,
      actor: 'BRAND',
    });
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "End an agency's access. The brand keeps every order and brief.",
  })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeAgencyLinkDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    this.assertBrandItself(req);
    return this.links.revokeLink({
      linkId: id,
      actorUserId: req.user.id,
      actor: 'BRAND',
      reason: dto.reason,
    });
  }
}
