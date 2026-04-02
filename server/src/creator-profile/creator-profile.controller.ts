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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveWorkspaceGuard } from '../auth/guards/active-workspace.guard';
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

@ApiTags('Creators')
@ApiBearerAuth()
@Controller('creators')
export class CreatorProfileController {
  constructor(private readonly creatorProfileService: CreatorProfileService) {}

  @Post('profile')
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('CREATOR'))
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
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('CREATOR'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a presigned URL for uploading creator profile image. Creator uploading their own Image',
  })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignProfileImageUpload(
    @Body() dto: PresignProfileImageUploadDto,
    @Req()
    req: Request & { user: { id: string } },
  ): Promise<PresignUploadResponseDto> {
    return this.creatorProfileService.presignProfileImageUpload(req.user.id, dto);
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
  @UseGuards(JwtAuthGuard)
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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get creator by creator profile id' })
  @ApiOkResponse({ type: CreatorProfileResponseDto })
  async getCreator(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CreatorProfileResponseDto> {
    return this.creatorProfileService.getCreatorById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Update creator profile (replace languages/categories/persona/restrictions/packages if provided)',
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
