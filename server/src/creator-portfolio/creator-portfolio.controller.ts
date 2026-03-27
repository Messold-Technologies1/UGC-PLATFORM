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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePortfolioVideoDto } from './dto/create-portfolio-video.dto';
import {
  PresignPortfolioUploadDto,
  PresignPortfolioUploadResponseDto,
} from './dto/presign-portfolio-upload.dto';
import { PortfolioVideoResponseDto } from './dto/portfolio-video-response.dto';
import { UpdatePortfolioVideoDto } from './dto/update-portfolio-video.dto';
import { CreatorPortfolioService } from './creator-portfolio.service';

@ApiTags('Creator Portfolio')
@Controller('creator-portfolio')
export class CreatorPortfolioController {
  constructor(private readonly service: CreatorPortfolioService) {}

  @Post('uploads/presign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create presigned S3 upload URL for portfolio media' })
  @ApiCreatedResponse({ type: PresignPortfolioUploadResponseDto })
  async presign(
    @Body() dto: PresignPortfolioUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PresignPortfolioUploadResponseDto> {
    return this.service.presignUpload(req.user.id, dto);
  }

  @Post('videos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: PortfolioVideoResponseDto })
  @ApiOperation({ summary: 'Create a portfolio video entry' })
  async createVideo(
    @Body() dto: CreatePortfolioVideoDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioVideoResponseDto> {
    return this.service.createVideo(req.user.id, dto);
  }

  @Get('videos/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PortfolioVideoResponseDto] })
  @ApiOperation({ summary: 'List the authenticated creator portfolio videos' })
  async listMyVideos(
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioVideoResponseDto[]> {
    return this.service.listMyVideos(req.user.id);
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
  @ApiOperation({ summary: 'Update portfolio video metadata/visibility' })
  async updateVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePortfolioVideoDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioVideoResponseDto> {
    return this.service.updateVideo(req.user.id, id, dto);
  }

  @Delete('videos/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiOperation({ summary: 'Delete portfolio video entry' })
  async deleteVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.service.deleteVideo(req.user.id, id);
  }
}

