import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { SendPhoneOtpDto } from '../auth/dto/send-phone-otp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { CreateBrandProfileDto } from '../brand-profile/dto/create-brand-profile.dto';
import { BrandProfileResponseDto } from '../brand-profile/dto/brand-profile-response.dto';
import { PresignUploadResponseDto } from '../brand-profile/dto/presign-brand-logo-upload.dto';
import { AgencyService } from './agency.service';
import { CreateAgencyProfileDto } from './dto/create-agency-profile.dto';
import { AgencyProfileResponseDto } from './dto/agency-profile-response.dto';
import { AgencyBrandSummaryDto } from './dto/agency-brand-summary.dto';
import { SwitchAgencyBrandDto } from './dto/switch-agency-brand.dto';
import { SwitchAgencyBrandResponseDto } from './dto/switch-agency-brand-response.dto';
import { PresignAgencyLogoUploadDto } from './dto/presign-agency-logo-upload.dto';

@ApiTags('Agency')
@ApiBearerAuth()
@Controller('agency')
export class AgencyController {
  constructor(private readonly agencyService: AgencyService) {}

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

  @Post('profile/contact-phone/send-otp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Send SMS OTP to verify optional agency contact phone before profile creation',
  })
  @ApiNoContentResponse({ description: 'OTP sent' })
  async sendContactPhoneOtp(
    @Body() dto: SendPhoneOtpDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.agencyService.sendContactPhoneOtp(req.user.id, dto.phone);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create agency profile for the authenticated user' })
  @ApiCreatedResponse({ type: AgencyProfileResponseDto })
  async createAgencyProfile(
    @Body() dto: CreateAgencyProfileDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<AgencyProfileResponseDto> {
    return this.agencyService.createAgencyProfile(req.user.id, dto);
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

  @Get('brands')
  @RequiredWorkspace('AGENCY')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'List brands managed by this agency' })
  @ApiOkResponse({ type: AgencyBrandSummaryDto, isArray: true })
  async listAgencyBrands(
    @Req() req: Request & { user: { id: string } },
  ): Promise<AgencyBrandSummaryDto[]> {
    return this.agencyService.listBrandsForAgency(req.user.id);
  }

  @Post('brands')
  @RequiredWorkspace('AGENCY')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a brand profile under this agency' })
  @ApiCreatedResponse({ type: BrandProfileResponseDto })
  async createAgencyBrand(
    @Body() dto: CreateBrandProfileDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<BrandProfileResponseDto> {
    return this.agencyService.createBrandUnderAgency({
      ownerUserId: req.user.id,
      dto,
    });
  }

  @Post('brands/switch')
  @RequiredWorkspace('AGENCY')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set the active brand for this agency session' })
  @ApiOkResponse({ type: SwitchAgencyBrandResponseDto })
  async switchActiveBrand(
    @Body() dto: SwitchAgencyBrandDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<SwitchAgencyBrandResponseDto> {
    return this.agencyService.switchActiveBrand({
      ownerUserId: req.user.id,
      brandProfileId: dto.brandProfileId,
    });
  }
}
