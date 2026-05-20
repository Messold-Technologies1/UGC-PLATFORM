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
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { UpdateBrandProfileDto } from './dto/update-brand-profile.dto';
import {
  PresignBrandLogoUploadDto,
  PresignUploadResponseDto,
} from './dto/presign-brand-logo-upload.dto';
import { PresignBrandPronunciationUploadDto } from './dto/presign-brand-pronunciation-upload.dto';
import { BrandProfileResponseDto } from './dto/brand-profile-response.dto';
import { readBrandProfileIdFromRequest } from '../brand-access/brand-context.util';
import { BrandProfileService } from './brand-profile.service';
import { BrandCategoryOptionsResponseDto } from './dto/brand-category-options-response.dto';

@ApiTags('Brands')
@ApiBearerAuth()
@Controller('brands')
export class BrandProfileController {
  constructor(private readonly brandProfileService: BrandProfileService) {}

  @Get('profile/brand-category-options')
  @ApiOperation({
    summary:
      'List allowed brand categories (prefilled options for brand profile creation)',
  })
  @ApiOkResponse({ type: BrandCategoryOptionsResponseDto })
  getBrandCategoryOptions(): BrandCategoryOptionsResponseDto {
    return this.brandProfileService.getBrandCategoryOptions();
  }

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

  @Post('profile/uploads/presign-pronunciation')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a presigned URL for uploading brand pronunciation audio (optional).',
  })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignBrandPronunciationUpload(
    @Body() dto: PresignBrandPronunciationUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PresignUploadResponseDto> {
    return this.brandProfileService.presignBrandPronunciationUpload(
      req.user.id,
      dto,
    );
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
    return this.brandProfileService.getBrandProfileForActor({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
    });
  }

  @Patch('profile')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update brand profile for the authenticated user' })
  @ApiOkResponse({ type: BrandProfileResponseDto })
  async updateMyBrandProfile(
    @Body() dto: UpdateBrandProfileDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<BrandProfileResponseDto> {
    return this.brandProfileService.updateBrandProfileForActor({
      actorUserId: req.user.id,
      dto,
      brandProfileId: readBrandProfileIdFromRequest(req),
    });
  }
}
