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
   * distinguishes them — but only when it names a brand that is not the
   * caller's own.
   *
   * It used to be enough that the header was present at all. That is not the
   * same question: the header is remembered in localStorage per browser, not
   * per account, so a brand signing in where an agency last worked still sent
   * one. Their own page then answered 403 and told them their agency
   * connections could not be loaded, which was both wrong and alarming.
   */
  private async assertBrandItself(
    req: Request & { user: { id: string } },
  ): Promise<void> {
    const brandProfileId = readBrandProfileIdFromRequest(req);
    if (await this.links.isActingForAnotherBrand(req.user.id, brandProfileId)) {
      throw new ForbiddenException(
        'Managing your agency connections can only be done by the brand itself.',
      );
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // Submitting is the one place the endpoint could be asked, at volume,
  // whether an address belongs to an agency. Accepting is still required
  // before anything is granted, but rate limiting keeps it from being walked
  // through a list of addresses.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: "Request a link by naming the agency's sign-in email",
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
    await this.assertBrandItself(req);
    return this.links.requestLink({
      brandUserId: req.user.id,
      rawAgencyEmail: dto.agencyEmail,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Agencies managing this brand, plus pending requests',
  })
  @ApiOkResponse({ type: BrandAgencyLinksResponseDto })
  async list(@Req() req: Request & { user: { id: string } }) {
    await this.assertBrandItself(req);
    return this.links.listForBrand(req.user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw a pending request' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    await this.assertBrandItself(req);
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
    await this.assertBrandItself(req);
    return this.links.revokeLink({
      linkId: id,
      actorUserId: req.user.id,
      actor: 'BRAND',
      reason: dto.reason,
    });
  }
}
