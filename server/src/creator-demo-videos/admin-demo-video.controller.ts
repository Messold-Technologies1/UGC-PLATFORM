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
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreatorDemoVideosService } from './creator-demo-videos.service';
import {
  PresignDemoVideoUploadDto,
  PresignDemoVideoUploadResponseDto,
} from './dto/presign-demo-video-upload.dto';
import { CreateDemoVideoDto } from './dto/create-demo-video.dto';
import { UpdateDemoVideoDto } from './dto/update-demo-video.dto';
import { DemoVideoResponseDto } from './dto/demo-video-response.dto';

@ApiTags('Admin - Demo Intro Videos')
@ApiBearerAuth()
@Controller('admin/demo-intro-videos')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDemoVideoController {
  constructor(private readonly service: CreatorDemoVideosService) {}

  @Post('uploads/presign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create presigned S3 upload URL for a demo video or poster' })
  @ApiCreatedResponse({ type: PresignDemoVideoUploadResponseDto })
  async presign(
    @Body() dto: PresignDemoVideoUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PresignDemoVideoUploadResponseDto> {
    return this.service.presignUpload(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all demo intro videos, including inactive' })
  @ApiOkResponse({ type: [DemoVideoResponseDto] })
  async list(): Promise<DemoVideoResponseDto[]> {
    return this.service.listAllForAdmin();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a demo intro video from uploaded keys' })
  @ApiCreatedResponse({ type: DemoVideoResponseDto })
  async create(@Body() dto: CreateDemoVideoDto): Promise<DemoVideoResponseDto> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a demo intro video (caption, order, active, media)' })
  @ApiOkResponse({ type: DemoVideoResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDemoVideoDto,
  ): Promise<DemoVideoResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiOperation({ summary: 'Delete a demo intro video' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.delete(id);
  }
}
