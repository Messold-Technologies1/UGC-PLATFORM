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
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { BriefsService } from './briefs.service';
import { BriefFieldOptionsResponseDto } from './dto/brief-field-options-response.dto';
import { CreateBriefDto } from './dto/create-brief.dto';
import { CreateBriefResponseDto } from './dto/create-brief-response.dto';
import { UpdateBriefDto } from './dto/update-brief.dto';
import { ListBriefsResponseDto } from './dto/list-briefs-response.dto';
import { AttachBriefToOrderDto } from './dto/attach-brief-to-order.dto';
import { AttachBriefToOrdersDto } from './dto/attach-brief-to-orders.dto';
import { AttachBriefToOrdersResponseDto } from './dto/attach-brief-to-orders-response.dto';
import { BriefDto } from './dto/brief.dto';
import {
  PresignBriefProductImageUploadDto,
  PresignBriefProductImageUploadResponseDto,
} from './dto/presign-brief-product-image-upload.dto';
import { brandActorParams } from '../brand-access/brand-actor-params.util';

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
      ...brandActorParams(req),
    });
    return { items };
  }

  @Post('uploads/presign-product-image')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a presigned URL for uploading a brief product image',
    description:
      'Upload to S3 with PUT, then pass the returned key as productImageKey when creating a brief.',
  })
  @ApiOkResponse({ type: PresignBriefProductImageUploadResponseDto })
  async presignProductImageUpload(
    @Body() dto: PresignBriefProductImageUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PresignBriefProductImageUploadResponseDto> {
    return this.briefsService.presignProductImageUpload({
      ...brandActorParams(req),
      dto,
    });
  }

  @Post(':id/attach-to-order')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Attach a saved brief to an order',
    description:
      'Links an existing saved brief to an order awaiting brief submission and starts the delivery timeline.',
  })
  @ApiNoContentResponse({ description: 'Brief attached to order' })
  async attachBriefToOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachBriefToOrderDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.briefsService.attachBriefToOrder({
      ...brandActorParams(req),
      briefId: id,
      orderId: dto.orderId,
    });
  }

  @Post(':id/attach-to-orders')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Attach a saved brief to multiple orders',
    description:
      'Links an existing saved brief to many orders awaiting brief submission in one action and starts each delivery timeline. Orders are processed independently; the response reports a per-order outcome.',
  })
  @ApiOkResponse({ type: AttachBriefToOrdersResponseDto })
  async attachBriefToOrders(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachBriefToOrdersDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<AttachBriefToOrdersResponseDto> {
    return this.briefsService.attachBriefToOrders({
      ...brandActorParams(req),
      briefId: id,
      orderIds: dto.orderIds,
    });
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
      ...brandActorParams(req),
      briefId: id,
    });
  }

  @Patch(':id')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary: 'Update a saved brief (brand only)',
    description:
      'Updates only the provided fields. Pass a new productImageKey (temp upload key) to replace the product image.',
  })
  @ApiOkResponse({ type: BriefDto })
  async updateBrief(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBriefDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<BriefDto> {
    return this.briefsService.updateBrief({
      ...brandActorParams(req),
      briefId: id,
      dto,
    });
  }

  @Delete(':id')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a saved brief (brand only)',
    description:
      'Permanently deletes a saved brief. Fails if the brief is attached to any order.',
  })
  @ApiNoContentResponse({ description: 'Brief deleted' })
  async deleteBrief(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.briefsService.deleteBrief({
      ...brandActorParams(req),
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
    return this.briefsService.createBrief({ ...brandActorParams(req), dto });
  }
}

