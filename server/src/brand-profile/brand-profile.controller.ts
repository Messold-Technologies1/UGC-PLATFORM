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
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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

  @Get('profile/me')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary: 'Get brand profile for the authenticated user',
  })
  @ApiOkResponse({ type: BrandProfileResponseDto })
  async getMyBrandProfile(
    @Req() req: Request & { user: { id: string } },
  ): Promise<BrandProfileResponseDto> {
    return this.brandProfileService.getBrandProfileForCurrentUser(req.user.id);
  }
}
