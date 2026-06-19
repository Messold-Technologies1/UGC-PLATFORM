import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreatorProfileResponseDto } from './dto/creator-profile-response.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { PendingCreatorsListResponseDto } from './dto/pending-creators-list-response.dto';
import { RejectedCreatorsListResponseDto } from './dto/rejected-creators-list-response.dto';
import {
  PendingApprovalsQueryDto,
  RejectCreatorProfileDto,
} from './dto/admin-creator-approval.dto';
import {
  AdminCreatorsListQueryDto,
  AdminCreatorsListResponseDto,
  AdminCreatorSegmentCountsDto,
} from './dto/admin-creator-list.dto';
import { CreatorProfileService } from './creator-profile.service';
import { CreatorPayoutDetailsService } from './creator-payout-details.service';
import { AdminCreatorPayoutDetailsDto } from './dto/admin-creator-payout-details.dto';

@ApiTags('Admin - Creators')
@ApiBearerAuth()
@Controller('admin/creators')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCreatorController {
  constructor(
    private readonly creatorProfileService: CreatorProfileService,
    private readonly creatorPayoutDetailsService: CreatorPayoutDetailsService,
  ) {}

  @Get('segment-counts')
  @ApiOperation({ summary: 'Counts for each admin creator list segment' })
  @ApiOkResponse({ type: AdminCreatorSegmentCountsDto })
  async getSegmentCounts(): Promise<AdminCreatorSegmentCountsDto> {
    return this.creatorProfileService.getAdminCreatorSegmentCounts();
  }

  @Get()
  @ApiOperation({
    summary:
      'List creators for admin (segment: approved, non_approved, incomplete, listed)',
  })
  @ApiOkResponse({ type: AdminCreatorsListResponseDto })
  async listCreators(
    @Query() query: AdminCreatorsListQueryDto,
  ): Promise<AdminCreatorsListResponseDto> {
    return this.creatorProfileService.listAdminCreators(query);
  }

  @Get('pending-approvals')
  @ApiOperation({
    summary: 'List creator profiles awaiting approval (oldest first)',
  })
  @ApiOkResponse({ type: PendingCreatorsListResponseDto })
  async listPendingApprovals(
    @Query() query: PendingApprovalsQueryDto,
  ): Promise<PendingCreatorsListResponseDto> {
    return this.creatorProfileService.listPendingCreatorApprovals(query);
  }

  @Get('rejected-approvals')
  @ApiOperation({
    summary: 'List rejected creator profiles (most recently rejected first)',
  })
  @ApiOkResponse({ type: RejectedCreatorsListResponseDto })
  async listRejectedApprovals(
    @Query() query: PendingApprovalsQueryDto,
  ): Promise<RejectedCreatorsListResponseDto> {
    return this.creatorProfileService.listRejectedCreatorApprovals(query);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a creator profile' })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async approveCreator(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.approveCreatorProfile(req.user.id, id);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a creator profile' })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async rejectCreator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCreatorProfileDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.rejectCreatorProfile(
      req.user.id,
      id,
      dto.rejectionReason,
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Update a creator profile as admin (same body as PATCH /creators/:id for the profile owner)',
  })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async updateCreator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreatorProfileDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.updateCreatorProfile(
      req.user.id,
      id,
      dto,
    );
  }

  @Get(':id/payout-details')
  @ApiOperation({
    summary:
      'Full bank / UPI details for manual payouts (admin only; not exposed to brands or creators via this field)',
  })
  @ApiOkResponse({ type: AdminCreatorPayoutDetailsDto })
  async getCreatorPayoutDetails(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminCreatorPayoutDetailsDto> {
    return this.creatorPayoutDetailsService.getFullForAdmin(id);
  }
}
