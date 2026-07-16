import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
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
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { CreatePortfolioVideoDto } from './dto/create-portfolio-video.dto';
import {
  PresignPortfolioUploadDto,
  PresignPortfolioUploadResponseDto,
} from './dto/presign-portfolio-upload.dto';
import {
  AbortMultipartUploadDto,
  CompleteMultipartUploadDto,
  CompleteMultipartUploadResponseDto,
  CreateMultipartUploadDto,
  CreateMultipartUploadResponseDto,
  SignMultipartPartDto,
  SignMultipartPartResponseDto,
} from './dto/multipart-portfolio-upload.dto';
import { PortfolioVideoResponseDto } from './dto/portfolio-video-response.dto';
import { DeletePortfolioVideoQueryDto } from './dto/delete-portfolio-video-query.dto';
import { ListAdminPortfolioVideosQueryDto } from './dto/list-admin-portfolio-videos-query.dto';
import { UpdatePortfolioVideoDto } from './dto/update-portfolio-video.dto';
import { CreatePortfolioSectionDto } from './dto/create-portfolio-section.dto';
import { UpdatePortfolioSectionDto } from './dto/update-portfolio-section.dto';
import { PortfolioSectionResponseDto } from './dto/portfolio-section-response.dto';
import { AddSectionVideosDto } from './dto/add-section-videos.dto';
import { RemoveSectionVideoQueryDto } from './dto/remove-section-video.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { CreatorPortfolioService } from './creator-portfolio.service';

@ApiTags('Creator Portfolio')
@Controller('creator-portfolio')
export class CreatorPortfolioController {
  constructor(private readonly service: CreatorPortfolioService) {}

  @Post('uploads/presign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create presigned S3 upload URL for portfolio media',
    description:
      'Creators upload for their own profile. Admins may pass creatorId to presign on behalf of a creator.',
  })
  @ApiCreatedResponse({ type: PresignPortfolioUploadResponseDto })
  async presign(
    @Body() dto: PresignPortfolioUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PresignPortfolioUploadResponseDto> {
    return this.service.presignUpload(req.user.id, dto, dto.creatorId);
  }

  @Post('uploads/multipart/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Begin a multipart S3 upload for large portfolio media',
    description:
      'Used for large videos so each part uploads against its own presigned URL, avoiding the single-PUT expiry. Follow with sign-part (per part) then complete.',
  })
  @ApiCreatedResponse({ type: CreateMultipartUploadResponseDto })
  async createMultipartUpload(
    @Body() dto: CreateMultipartUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreateMultipartUploadResponseDto> {
    return this.service.createMultipartUpload(req.user.id, dto);
  }

  @Post('uploads/multipart/sign-part')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Presign a single part of a multipart upload' })
  @ApiCreatedResponse({ type: SignMultipartPartResponseDto })
  async signMultipartPart(
    @Body() dto: SignMultipartPartDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<SignMultipartPartResponseDto> {
    return this.service.signMultipartPart(req.user.id, dto);
  }

  @Post('uploads/multipart/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Finalize a multipart upload once all parts are done' })
  @ApiCreatedResponse({ type: CompleteMultipartUploadResponseDto })
  async completeMultipartUpload(
    @Body() dto: CompleteMultipartUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CompleteMultipartUploadResponseDto> {
    return this.service.completeMultipartUpload(req.user.id, dto);
  }

  @Post('uploads/multipart/abort')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Multipart upload aborted' })
  @ApiOperation({ summary: 'Cancel a multipart upload and discard uploaded parts' })
  async abortMultipartUpload(
    @Body() dto: AbortMultipartUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.service.abortMultipartUpload(req.user.id, dto);
  }

  @Post('videos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: PortfolioVideoResponseDto })
  @ApiOperation({
    summary: 'Create a portfolio video entry',
    description:
      'Creators create for their own profile. Admins may pass creatorId to add a video for a creator.',
  })
  async createVideo(
    @Body() dto: CreatePortfolioVideoDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioVideoResponseDto> {
    return this.service.createVideo(req.user.id, dto, dto.creatorId);
  }

  @Get('videos/me')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PortfolioVideoResponseDto] })
  @ApiOperation({ summary: 'List the authenticated creator portfolio videos' })
  async listMyVideos(
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioVideoResponseDto[]> {
    return this.service.listMyVideos(req.user.id);
  }

  @Get('videos/admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PortfolioVideoResponseDto] })
  @ApiOperation({
    summary: 'List all portfolio videos (admin)',
    description:
      'Returns public and private portfolio videos. Optionally filter by creatorId query param.',
  })
  async listAllVideosForAdmin(
    @Query() query: ListAdminPortfolioVideosQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioVideoResponseDto[]> {
    return this.service.listAllVideosForAdmin(req.user.id, query.creatorId);
  }

  @Get('creators/:creatorId/videos')
  @ApiOkResponse({ type: [PortfolioVideoResponseDto] })
  @ApiOperation({
    summary: "List a creator's PUBLIC portfolio videos by creatorId",
  })
  async listByCreatorId(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<PortfolioVideoResponseDto[]> {
    return this.service.listPublicVideosByCreatorId(creatorId);
  }

  @Get('suggestions/industries')
  @ApiOkResponse({ type: [String] })
  @ApiOperation({ summary: 'List industry label suggestions' })
  async listIndustrySuggestions(): Promise<string[]> {
    return this.service.listIndustrySuggestions();
  }

  @Get('suggestions/tags')
  @ApiOkResponse({ type: [String] })
  @ApiOperation({ summary: 'List tag suggestions' })
  async listTagSuggestions(): Promise<string[]> {
    return this.service.listTagSuggestions();
  }

  @Get('suggestions/languages')
  @ApiOkResponse({ type: [String] })
  @ApiOperation({ summary: 'List language suggestions' })
  async listLanguageSuggestions(): Promise<string[]> {
    return this.service.listLanguageSuggestions();
  }

  @Patch('videos/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: PortfolioVideoResponseDto })
  @ApiOperation({
    summary: 'Update portfolio video metadata/visibility',
    description:
      'Creators update their own videos. Admins may pass creatorId when updating on behalf of a creator.',
  })
  async updateVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePortfolioVideoDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioVideoResponseDto> {
    return this.service.updateVideo(req.user.id, id, dto, dto.creatorId);
  }

  @Delete('videos/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiOperation({
    summary: 'Delete portfolio video entry',
    description:
      'Creators delete their own videos. Admins may pass creatorId as a query param when deleting on behalf of a creator.',
  })
  async deleteVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeletePortfolioVideoQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.service.deleteVideo(req.user.id, id, query.creatorId);
  }



  @Post('sections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: PortfolioSectionResponseDto })
  @ApiOperation({
    summary: 'Create a portfolio section',
    description:
      'Creates a named section to group portfolio videos. Max 10 sections per creator. Admins may pass creatorId.',
  })
  async createSection(
    @Body() dto: CreatePortfolioSectionDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioSectionResponseDto> {
    return this.service.createSection(req.user.id, dto, dto.creatorId);
  }

  @Get('sections/me')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PortfolioSectionResponseDto] })
  @ApiOperation({
    summary: 'List my portfolio sections with nested videos',
  })
  async listMySections(
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioSectionResponseDto[]> {
    return this.service.listMySections(req.user.id);
  }

  @Patch('sections/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: PortfolioSectionResponseDto })
  @ApiOperation({
    summary: 'Update a portfolio section',
    description:
      'Update section name and/or position. Admins may pass creatorId to act on behalf of a creator.',
  })
  async updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePortfolioSectionDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioSectionResponseDto> {
    return this.service.updateSection(req.user.id, id, dto, dto.creatorId);
  }

  @Delete('sections/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiOperation({
    summary: 'Delete a portfolio section',
    description:
      'Deletes the section and removes all video assignments. The videos themselves are not deleted. Admins may pass creatorId as a query param.',
  })
  async deleteSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeletePortfolioVideoQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.service.deleteSection(req.user.id, id, query.creatorId);
  }

  @Put('sections/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PortfolioSectionResponseDto] })
  @ApiOperation({
    summary: 'Bulk reorder portfolio sections',
    description:
      'Updates position values for all provided sections in a single transaction. Returns the full updated list.',
  })
  async reorderSections(
    @Body() dto: ReorderSectionsDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioSectionResponseDto[]> {
    return this.service.reorderSections(req.user.id, dto, dto.creatorId);
  }

  @Post('sections/:id/videos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: PortfolioSectionResponseDto })
  @ApiOperation({
    summary: 'Add videos to a portfolio section',
    description:
      'Adds one or more videos to the section. If a video is already in the section, its position is updated. Admins may pass creatorId.',
  })
  async addVideosToSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSectionVideosDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioSectionResponseDto> {
    return this.service.addVideosToSection(req.user.id, id, dto, dto.creatorId);
  }

  @Delete('sections/:sectionId/videos/:videoId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Removed' })
  @ApiOperation({
    summary: 'Remove a video from a portfolio section',
    description:
      'Removes the video assignment from the section. The video itself is not deleted. Admins may pass creatorId as a query param.',
  })
  async removeVideoFromSection(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Query() query: RemoveSectionVideoQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.service.removeVideoFromSection(
      req.user.id,
      sectionId,
      videoId,
      query.creatorId,
    );
  }
}
