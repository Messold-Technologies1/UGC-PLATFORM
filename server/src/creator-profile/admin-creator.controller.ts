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
import { CreatorsListResponseDto } from './dto/creators-list-response.dto';
import {
  PendingApprovalsQueryDto,
  RejectCreatorProfileDto,
} from './dto/admin-creator-approval.dto';
import { CreatorProfileService } from './creator-profile.service';

@ApiTags('Admin - Creators')
@ApiBearerAuth()
@Controller('admin/creators')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCreatorController {
  constructor(private readonly creatorProfileService: CreatorProfileService) {}

  @Get('pending-approvals')
  @ApiOperation({
    summary: 'List creator profiles awaiting approval (oldest first)',
  })
  @ApiOkResponse({ type: CreatorsListResponseDto })
  async listPendingApprovals(
    @Query() query: PendingApprovalsQueryDto,
  ): Promise<CreatorsListResponseDto> {
    return this.creatorProfileService.listPendingCreatorApprovals(query);
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
}
