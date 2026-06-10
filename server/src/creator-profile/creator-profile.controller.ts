import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { CreatorsPublicListResponseDto } from './dto/creators-public-list-response.dto';
import { CreatorProfileResponseDto } from './dto/creator-profile-response.dto';
import { CreatorProfileService } from './creator-profile.service';
import {
  PresignProfileIntroVideoUploadDto,
  PresignUploadResponseDto,
} from './dto/presign-profile-intro-video-upload.dto';
import {
  PresignProfileImageUploadDto,
  PresignProfileImageUploadResponseDto,
} from './dto/presign-profile-image-upload.dto';
import { CreatorSuggestionItemDto } from './dto/creator-suggestion-item.dto';
import { CreatorFacetOptionsResponseDto } from './dto/creator-facet-options-response.dto';
import { CreatorLanguageOptionsResponseDto } from './dto/creator-language-options-response.dto';
import { CreatorAddOnOptionsResponseDto } from './dto/creator-addon-options-response.dto';
import { AddCreatorAddOnsDto } from './dto/add-creator-addons.dto';
import { CreatorPayoutDetailsService } from './creator-payout-details.service';
import { UpsertCreatorPayoutDetailsDto } from './dto/upsert-creator-payout-details.dto';
import { CreatorPayoutDetailsMaskedDto } from './dto/creator-payout-details-masked.dto';
import { SuggestedCreatorsResponseDto } from './dto/suggested-creators-response.dto';
import { CreatorReviewsService } from '../creator-reviews/creator-reviews.service';
import { ListCreatorRatingReviewsQueryDto } from '../creator-reviews/dto/list-creator-rating-reviews-query.dto';
import { ListCreatorRatingReviewsResponseDto } from '../creator-reviews/dto/list-creator-rating-reviews-response.dto';

@ApiTags('Creators')
@ApiBearerAuth()
@Controller('creators')
export class CreatorProfileController {
  constructor(
    private readonly creatorProfileService: CreatorProfileService,
    private readonly creatorPayoutDetailsService: CreatorPayoutDetailsService,
    private readonly creatorReviewsService: CreatorReviewsService,
  ) {}

  @Post('profile/uploads/presign-intro-video')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Presigned URL for creator intro video upload',
    description:
      'Returns a presigned PUT upload; key is under creator-profile/<id>/intro/. Pass creatorProfileId when acting as admin (JWT user has no creator row). Owners may omit it and their profile is resolved from the JWT.',
  })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignProfileIntroVideoUpload(
    @Body() dto: PresignProfileIntroVideoUploadDto,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<PresignUploadResponseDto> {
    return this.creatorProfileService.presignProfileIntroVideoUpload(req.user.id, dto);
  }

  @Post('profile/uploads/presign-profile-image')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Presigned URL for creator profile image upload',
    description:
      'Returns a presigned PUT upload; key is under creator-profile/<id>/profile-image/. Pass creatorProfileId when acting as admin (JWT user has no creator row). Owners may omit it and their profile is resolved from the JWT.',
  })
  @ApiCreatedResponse({ type: PresignProfileImageUploadResponseDto })
  async presignProfileImageUpload(
    @Body() dto: PresignProfileImageUploadDto,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<PresignProfileImageUploadResponseDto> {
    return this.creatorProfileService.presignProfileImageUpload(req.user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List creators (paginated)',
    description:
      'Discovery list for brands and guests: does not include phone numbers or Instagram URLs. Use admin pending-approvals or creator detail as admin/owner for those fields.',
  })
  @ApiOkResponse({ type: CreatorsPublicListResponseDto })
  async listCreators(
    @Query() query: ListCreatorsQueryDto,
  ): Promise<CreatorsPublicListResponseDto> {
    return this.creatorProfileService.listCreators(query);
  }

  @Get('facet-options')
  @ApiOperation({
    summary: 'List predefined creator facet options (catalog)',
  })
  @ApiOkResponse({ type: CreatorFacetOptionsResponseDto })
  async listFacetOptions(): Promise<CreatorFacetOptionsResponseDto> {
    return this.creatorProfileService.listFacetOptions();
  }

  @Get('facet-options/languages')
  @ApiOperation({
    summary: 'List creator language facet options (catalog)',
    description:
      'Returns CreatorFacetOption rows with dimension LANGUAGE (slug, label, sortOrder), for profile language pickers and filters.',
  })
  @ApiOkResponse({ type: CreatorLanguageOptionsResponseDto })
  async listCreatorLanguageOptions(): Promise<CreatorLanguageOptionsResponseDto> {
    return this.creatorProfileService.listCreatorLanguageOptions();
  }

  @Get('add-on-options')
  @ApiOperation({
    summary: 'List predefined creator add-on options (catalog)',
  })
  @ApiOkResponse({ type: CreatorAddOnOptionsResponseDto })
  async listAddOnOptions(): Promise<CreatorAddOnOptionsResponseDto> {
    return this.creatorProfileService.listAddOnOptions();
  }

  @Get('suggestions/categories')
  @ApiOperation({
    summary: 'List category experience facet options (catalog)',
    description:
      'Returns CreatorFacetOption rows for dimension CATEGORY_EXPERIENCE (same slugs as facetSelections).',
  })
  @ApiOkResponse({ type: () => [CreatorSuggestionItemDto] })
  async listCategorySuggestions(): Promise<CreatorSuggestionItemDto[]> {
    return this.creatorProfileService.listCategorySuggestions();
  }



  @Get('suggestions/restrictions')
  @ApiOperation({ summary: 'List creator restriction suggestions' })
  @ApiOkResponse({ type: () => [CreatorSuggestionItemDto] })
  async listRestrictionSuggestions(): Promise<CreatorSuggestionItemDto[]> {
    return this.creatorProfileService.listRestrictionSuggestions();
  }

  @Get('profile/me')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary: 'Get creator profile for the authenticated user',
  })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async getMyCreatorProfile(
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.getCreatorProfileForCurrentUser(
      req.user.id,
    );
  }

  @Get('profile/me/payout-details')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'Get payout details for manual transfers (masked; full account/UPI only visible to admins)',
  })
  @ApiOkResponse({ type: CreatorPayoutDetailsMaskedDto })
  async getMyPayoutDetails(
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorPayoutDetailsMaskedDto> {
    return this.creatorPayoutDetailsService.getMaskedForCurrentCreator(req.user.id);
  }

  @Patch('profile/me/payout-details')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Partially update bank / UPI details for manual creator payouts (only provided fields are changed)',
  })
  @ApiOkResponse({ type: CreatorPayoutDetailsMaskedDto })
  async patchMyPayoutDetails(
    @Body() dto: UpsertCreatorPayoutDetailsDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorPayoutDetailsMaskedDto> {
    return this.creatorPayoutDetailsService.upsertForCurrentCreator(req.user.id, dto);
  }

  @Get(':id/rating-reviews')
  @ApiOperation({
    summary: 'List brand ratings and reviews for a creator (paginated)',
  })
  @ApiOkResponse({ type: ListCreatorRatingReviewsResponseDto })
  async listCreatorRatingReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListCreatorRatingReviewsQueryDto,
  ): Promise<ListCreatorRatingReviewsResponseDto> {
    return this.creatorReviewsService.listForCreator({
      creatorId: id,
      query,
    });
  }

  @Get(':id/suggested')
  @ApiOperation({
    summary: 'Suggested creators for a profile page (same content category)',
    description:
      'Public discovery helper for brand (or guest) creator profile pages: returns up to five other approved creators sharing at least one CONTENT_CATEGORY facet with the anchor. Only available when the anchor creator is approved (404 otherwise). No authentication required.',
  })
  @ApiOkResponse({ type: () => SuggestedCreatorsResponseDto })
  async listSuggestedCreators(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuggestedCreatorsResponseDto> {
    return this.creatorProfileService.listSuggestedCreators(id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get creator by creator profile id (public)',
    description:
      'Public discovery endpoint. Phone, verification flag, and Instagram URL are only present for the profile owner and admins; anonymous and other authenticated viewers do not receive those properties.',
  })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async getCreator(
    @Param('id', ParseUUIDPipe) id: string,
    @Req()
    req: Request & { user?: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.getCreatorById(req.user?.id ?? null, id);
  }

  @Patch(':id')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'Update creator profile (replace languages/facets/persona/restrictions/packages/addOns if provided)',
  })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async updateCreator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreatorProfileDto,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.updateCreatorProfile(
      req.user.id,
      id,
      dto,
    );
  }

  @Patch(':id/add-ons')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary: 'Add or update add-ons for a creator profile (by name, append-only)',
  })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async addOrUpdateAddOns(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCreatorAddOnsDto,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.addOrUpdateAddOns(
      req.user.id,
      id,
      dto,
    );
  }

  @Delete(':id')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiOperation({ summary: 'Delete creator profile' })
  async deleteCreator(
    @Param('id', ParseUUIDPipe) id: string,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.creatorProfileService.deleteCreatorProfile(req.user.id, id);
  }
}