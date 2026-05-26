import {
  Body,
  Controller,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreatePortfolioVideoDto } from './dto/create-portfolio-video.dto';
import {
  PresignPortfolioUploadDto,
  PresignPortfolioUploadResponseDto,
} from './dto/presign-portfolio-upload.dto';
import { PortfolioVideoResponseDto } from './dto/portfolio-video-response.dto';
import { UpdatePortfolioVideoDto } from './dto/update-portfolio-video.dto';
import { CreatorPortfolioService } from './creator-portfolio.service';

@ApiTags('Admin - Creator Portfolio')
@ApiBearerAuth()
@Controller('admin/creators')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCreatorPortfolioController {
  constructor(private readonly service: CreatorPortfolioService) {}

  @Post(':creatorId/portfolio/uploads/presign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Presign portfolio media upload for a creator (admin)',
  })
  @ApiCreatedResponse({ type: PresignPortfolioUploadResponseDto })
  async presign(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Body() dto: PresignPortfolioUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PresignPortfolioUploadResponseDto> {
    return this.service.presignUpload(req.user.id, dto, creatorId);
  }

  @Post(':creatorId/portfolio/videos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a portfolio video for a creator (admin)' })
  @ApiCreatedResponse({ type: PortfolioVideoResponseDto })
  async createVideo(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Body() dto: CreatePortfolioVideoDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioVideoResponseDto> {
    return this.service.createVideo(req.user.id, dto, creatorId);
  }

  @Patch(':creatorId/portfolio/videos/:videoId')
  @ApiOperation({ summary: 'Update a creator portfolio video (admin)' })
  @ApiOkResponse({ type: PortfolioVideoResponseDto })
  async updateVideo(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Body() dto: UpdatePortfolioVideoDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PortfolioVideoResponseDto> {
    return this.service.updateVideo(req.user.id, videoId, dto, creatorId);
  }
}
