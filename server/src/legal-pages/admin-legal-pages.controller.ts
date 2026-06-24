import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { LegalPagesService } from './legal-pages.service';
import {
  AdminLegalPageListResponseDto,
  AdminLegalPageDetailResponseDto,
  LegalPageDraftResponseDto,
  LegalPageResponseDto,
  LegalPageVersionListResponseDto,
  LegalPageVersionDetailResponseDto,
} from './dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { CreateLegalPageDto } from './dto/create-legal-page.dto';
import { RejectDraftDto } from './dto/reject-draft.dto';

@ApiTags('Admin - Legal Pages')
@ApiBearerAuth()
@Controller('admin/legal-pages')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminLegalPagesController {
  constructor(private readonly legalPagesService: LegalPagesService) {}

  // ─── Pages ───────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all legal pages with draft status' })
  @ApiOkResponse({ type: AdminLegalPageListResponseDto })
  async listPages(): Promise<AdminLegalPageListResponseDto> {
    return this.legalPagesService.getAllPages();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new legal page' })
  @ApiCreatedResponse({ type: AdminLegalPageDetailResponseDto })
  async createPage(
    @Body() dto: CreateLegalPageDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<AdminLegalPageDetailResponseDto> {
    return this.legalPagesService.createPage(dto, req.user.id);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get legal page detail (live sections + active draft)',
  })
  @ApiParam({ name: 'slug', example: 'privacy-policy' })
  @ApiOkResponse({ type: AdminLegalPageDetailResponseDto })
  async getPageDetail(
    @Param('slug') slug: string,
  ): Promise<AdminLegalPageDetailResponseDto> {
    return this.legalPagesService.getPageForAdmin(slug);
  }

  // ─── Draft Lifecycle ─────────────────────────────────────────

  @Put(':slug/draft')
  @ApiOperation({
    summary: 'Save (create or update) a draft for a legal page',
  })
  @ApiParam({ name: 'slug', example: 'privacy-policy' })
  @ApiOkResponse({ type: LegalPageDraftResponseDto })
  async saveDraft(
    @Param('slug') slug: string,
    @Body() dto: SaveDraftDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<LegalPageDraftResponseDto> {
    return this.legalPagesService.saveDraft(slug, dto, req.user.id);
  }

  @Post(':slug/submit-review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a draft for review (DRAFT → IN_REVIEW)' })
  @ApiParam({ name: 'slug', example: 'privacy-policy' })
  @ApiOkResponse({ type: LegalPageDraftResponseDto })
  async submitForReview(
    @Param('slug') slug: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<LegalPageDraftResponseDto> {
    return this.legalPagesService.submitForReview(slug, req.user.id);
  }

  @Post(':slug/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Publish a reviewed draft (IN_REVIEW → live). Snapshots current live state to version history.',
  })
  @ApiParam({ name: 'slug', example: 'privacy-policy' })
  @ApiOkResponse({ type: AdminLegalPageDetailResponseDto })
  async publishDraft(
    @Param('slug') slug: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<AdminLegalPageDetailResponseDto> {
    return this.legalPagesService.publishDraft(slug, req.user.id);
  }

  @Post(':slug/reject-draft')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reject a draft back to DRAFT status with optional reviewer feedback',
  })
  @ApiParam({ name: 'slug', example: 'privacy-policy' })
  @ApiOkResponse({ type: LegalPageDraftResponseDto })
  async rejectDraft(
    @Param('slug') slug: string,
    @Body() dto: RejectDraftDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<LegalPageDraftResponseDto> {
    return this.legalPagesService.rejectDraft(slug, dto, req.user.id);
  }

  @Delete(':slug/draft')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Discard (delete) the active draft' })
  @ApiParam({ name: 'slug', example: 'privacy-policy' })
  @ApiNoContentResponse()
  async discardDraft(
    @Param('slug') slug: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    return this.legalPagesService.discardDraft(slug, req.user.id);
  }

  // ─── Draft Preview ───────────────────────────────────────────

  @Get(':slug/preview')
  @ApiOperation({
    summary: 'Preview draft as it would appear on the public page',
  })
  @ApiParam({ name: 'slug', example: 'privacy-policy' })
  @ApiOkResponse({ type: LegalPageResponseDto })
  async getDraftPreview(
    @Param('slug') slug: string,
  ): Promise<LegalPageResponseDto> {
    return this.legalPagesService.getDraftPreview(slug);
  }

  // ─── Version History ─────────────────────────────────────────

  @Get(':slug/versions')
  @ApiOperation({ summary: 'List past published versions of a legal page' })
  @ApiParam({ name: 'slug', example: 'privacy-policy' })
  @ApiOkResponse({ type: LegalPageVersionListResponseDto })
  async getVersionHistory(
    @Param('slug') slug: string,
  ): Promise<LegalPageVersionListResponseDto> {
    return this.legalPagesService.getVersionHistory(slug);
  }

  @Get('versions/:versionId')
  @ApiOperation({ summary: 'Get a single version snapshot by ID' })
  @ApiOkResponse({ type: LegalPageVersionDetailResponseDto })
  async getVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<LegalPageVersionDetailResponseDto> {
    return this.legalPagesService.getVersion(versionId);
  }
}
