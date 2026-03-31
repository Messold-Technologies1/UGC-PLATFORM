import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveWorkspaceGuard } from '../auth/guards/active-workspace.guard';
import { CreateBrandProfileDto } from './dto/create-brand-profile.dto';
import {
  PresignBrandLogoUploadDto,
  PresignUploadResponseDto,
} from './dto/presign-brand-logo-upload.dto';
import { BrandProfileResponseDto } from './dto/brand-profile-response.dto';
import { BrandProfileService } from './brand-profile.service';

@ApiTags('Brands')
@ApiBearerAuth()
@Controller('brands')
export class BrandProfileController {
  constructor(private readonly brandProfileService: BrandProfileService) {}

  @Post('profile/uploads/presign')
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('BRAND'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a presigned URL for uploading brand logo (optional).',
  })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignBrandLogoUpload(
    @Body() dto: PresignBrandLogoUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PresignUploadResponseDto> {
    return this.brandProfileService.presignBrandLogoUpload(req.user.id, dto);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('BRAND'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create brand profile for the authenticated user',
  })
  @ApiCreatedResponse({ type: BrandProfileResponseDto })
  async createBrandProfile(
    @Body() dto: CreateBrandProfileDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<BrandProfileResponseDto> {
    return this.brandProfileService.createBrandProfile(req.user.id, dto);
  }
}

