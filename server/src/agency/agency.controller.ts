import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { PresignUploadResponseDto } from '../brand-profile/dto/presign-brand-logo-upload.dto';
import { AgencyService } from './agency.service';
import { CreateAgencyProfileDto } from './dto/create-agency-profile.dto';
import { UpdateAgencyProfileDto } from './dto/update-agency-profile.dto';
import { AgencyProfileResponseDto } from './dto/agency-profile-response.dto';
import { PresignAgencyLogoUploadDto } from './dto/presign-agency-logo-upload.dto';

@ApiTags('Agency')
@ApiBearerAuth()
@Controller('agency')
export class AgencyController {
  constructor(private readonly agencyService: AgencyService) {}

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create owned agency profile for the authenticated user (post-signup agency setup)',
  })
  @ApiCreatedResponse({ type: AgencyProfileResponseDto })
  async createMyAgencyProfile(
    @Body() dto: CreateAgencyProfileDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<AgencyProfileResponseDto> {
    return this.agencyService.createOwnedAgencyProfile(req.user.id, dto);
  }

  @Patch('profile')
  @RequiredWorkspace('AGENCY')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Update agency profile for the authenticated owner' })
  @ApiOkResponse({ type: AgencyProfileResponseDto })
  async updateMyAgencyProfile(
    @Body() dto: UpdateAgencyProfileDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<AgencyProfileResponseDto> {
    return this.agencyService.updateAgencyProfileForOwner(req.user.id, dto);
  }

  @Post('profile/uploads/presign')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Presign agency logo upload (before profile creation)' })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignAgencyLogoUpload(
    @Body() dto: PresignAgencyLogoUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PresignUploadResponseDto> {
    return this.agencyService.presignAgencyLogoUpload(req.user.id, dto);
  }

  @Get('profile/me')
  @RequiredWorkspace('AGENCY')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Get agency profile for the authenticated owner' })
  @ApiOkResponse({ type: AgencyProfileResponseDto })
  async getMyAgencyProfile(
    @Req() req: Request & { user: { id: string } },
  ): Promise<AgencyProfileResponseDto> {
    return this.agencyService.getAgencyProfileForOwner(req.user.id);
  }
}
