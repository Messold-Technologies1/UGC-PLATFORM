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
  Put,
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
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { CreateCreatorProfileDto } from './dto/create-creator-profile.dto';
import { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { CreatorsListResponseDto } from './dto/creators-list-response.dto';
import { CreatorProfileResponseDto } from './dto/creator-profile-response.dto';
import { CreatorProfileService } from './creator-profile.service';
import {
  PresignProfileImageUploadDto,
  PresignUploadResponseDto,
} from './dto/presign-profile-image-upload.dto';
import { CreatorSuggestionItemDto } from './dto/creator-suggestion-item.dto';
import { AddCreatorAddOnsDto } from './dto/add-creator-addons.dto';
import { CreatorPayoutDetailsService } from './creator-payout-details.service';
import { UpsertCreatorPayoutDetailsDto } from './dto/upsert-creator-payout-details.dto';
import { CreatorPayoutDetailsMaskedDto } from './dto/creator-payout-details-masked.dto';

@ApiTags('Creators')
@ApiBearerAuth()
@Controller('creators')
export class CreatorProfileController {
  constructor(
    private readonly creatorProfileService: CreatorProfileService,
    private readonly creatorPayoutDetailsService: CreatorPayoutDetailsService,
  ) {}

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create creator profile for the authenticated user',
  })
  @ApiCreatedResponse({ type: CreatorProfileResponseDto })
  async createProfile(
    @Body() dto: CreateCreatorProfileDto,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.createCreatorProfile(req.user.id, dto);
  }

  @Post('profile/uploads/presign')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a presigned URL for uploading creator profile image. Creator uploading their own Image',
  })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignProfileImageUpload(
    @Body() dto: PresignProfileImageUploadDto,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<PresignUploadResponseDto> {
    return this.creatorProfileService.presignProfileImageUpload(
      req.user.id,
      dto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List creators (paginated)' })
  @ApiOkResponse({ type: CreatorsListResponseDto })
  async listCreators(
    @Query() query: ListCreatorsQueryDto,
  ): Promise<CreatorsListResponseDto> {
    return this.creatorProfileService.listCreators(query);
  }

  @Get('suggestions/categories')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List creator category suggestions' })
  @ApiOkResponse({ type: () => [CreatorSuggestionItemDto] })
  async listCategorySuggestions(): Promise<CreatorSuggestionItemDto[]> {
    return this.creatorProfileService.listCategorySuggestions();
  }

  @Get('suggestions/persona-tags')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List creator persona tag suggestions' })
  @ApiOkResponse({ type: () => [CreatorSuggestionItemDto] })
  async listPersonaTagSuggestions(): Promise<CreatorSuggestionItemDto[]> {
    return this.creatorProfileService.listPersonaTagSuggestions();
  }

  @Get('suggestions/restrictions')
  @UseGuards(JwtAuthGuard)
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
    return this.creatorPayoutDetailsService.getMaskedForCurrentCreator(
      req.user.id,
    );
  }

  @Put('profile/me/payout-details')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save or update bank / UPI details for manual creator payouts',
  })
  @ApiOkResponse({ type: CreatorPayoutDetailsMaskedDto })
  async upsertMyPayoutDetails(
    @Body() dto: UpsertCreatorPayoutDetailsDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorPayoutDetailsMaskedDto> {
    return this.creatorPayoutDetailsService.upsertForCurrentCreator(
      req.user.id,
      dto,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get creator by creator profile id' })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async getCreator(
    @Param('id', ParseUUIDPipe) id: string,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.getCreatorById(req.user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Update creator profile (replace languages/categories/persona/restrictions/packages/addOns if provided)',
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
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Add or update add-ons for a creator profile (by name, append-only)',
  })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async addOrUpdateAddOns(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCreatorAddOnsDto,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.addOrUpdateAddOns(req.user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
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
