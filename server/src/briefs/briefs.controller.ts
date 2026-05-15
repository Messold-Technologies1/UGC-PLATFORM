import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { BriefsService } from './briefs.service';
import { BriefFieldOptionsResponseDto } from './dto/brief-field-options-response.dto';
import { CreateBriefDto } from './dto/create-brief.dto';
import { CreateBriefResponseDto } from './dto/create-brief-response.dto';
import { ListBriefsResponseDto } from './dto/list-briefs-response.dto';
import { BriefDto } from './dto/brief.dto';

@ApiTags('Briefs')
@ApiBearerAuth()
@Controller('briefs')
export class BriefsController {
  constructor(private readonly briefsService: BriefsService) {}

  @Get('field-options')
  @ApiOperation({
    summary:
      'List allowed values for brief shoot location, duration bucket, content type, and tone style',
    description:
      'Static catalog aligned with Prisma enums (for pickers). Does not require authentication.',
  })
  @ApiOkResponse({ type: BriefFieldOptionsResponseDto })
  getBriefFieldOptions(): BriefFieldOptionsResponseDto {
    return this.briefsService.getBriefFieldOptions();
  }

  @Get()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'List saved briefs for the authenticated brand' })
  @ApiOkResponse({ type: ListBriefsResponseDto })
  async listBriefs(
    @Req() req: Request & { user: { id: string } },
  ): Promise<ListBriefsResponseDto> {
    const items = await this.briefsService.listBriefsForBrand({
      brandUserId: req.user.id,
    });
    return { items };
  }

  @Get(':id')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Get a saved brief (brand only)' })
  @ApiOkResponse({ type: BriefDto })
  async getBrief(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<BriefDto> {
    return this.briefsService.getBriefForBrand({
      brandUserId: req.user.id,
      briefId: id,
    });
  }

  @Post()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a saved brief (reusable across orders)' })
  @ApiCreatedResponse({ type: CreateBriefResponseDto })
  async createBrief(
    @Body() dto: CreateBriefDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreateBriefResponseDto> {
    return this.briefsService.createBrief({ brandUserId: req.user.id, dto });
  }
}

