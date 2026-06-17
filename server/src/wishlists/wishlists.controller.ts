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
import { brandActorParams } from '../brand-access/brand-actor-params.util';
import { WishlistsService } from './wishlists.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { AddWishlistCreatorDto } from './dto/add-wishlist-creator.dto';
import { WishlistDto, WishlistDetailDto } from './dto/wishlist.dto';
import { WishlistShareResponseDto } from './dto/wishlist-share-response.dto';
import { PublicWishlistResponseDto } from './dto/public-wishlist-response.dto';
import { ImportSharedWishlistDto } from './dto/import-shared-wishlist.dto';
import { ImportSharedWishlistResponseDto } from './dto/import-shared-wishlist-response.dto';
import { CreateWishlistResponseDto } from './dto/create-wishlist-response.dto';
import { ListWishlistsResponseDto } from './dto/list-wishlists-response.dto';

@ApiTags('Wishlists')
@ApiBearerAuth()
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'List all wishlists for the authenticated brand' })
  @ApiOkResponse({ type: ListWishlistsResponseDto })
  async listWishlists(
    @Req() req: Request & { user: { id: string } },
  ): Promise<ListWishlistsResponseDto> {
    const items = await this.wishlistsService.listWishlists(brandActorParams(req));
    return { items };
  }

  @Post()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new wishlist' })
  @ApiCreatedResponse({ type: CreateWishlistResponseDto })
  async createWishlist(
    @Body() dto: CreateWishlistDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreateWishlistResponseDto> {
    return this.wishlistsService.createWishlist({ ...brandActorParams(req), dto });
  }

  // IMPORTANT: public route must be before /:id to avoid route conflict
  @Get('public/:shareToken')
  @ApiOperation({ summary: 'Get a publicly shared wishlist (no auth required)' })
  @ApiOkResponse({ type: PublicWishlistResponseDto })
  async getPublicWishlist(
    @Param('shareToken') shareToken: string,
  ): Promise<PublicWishlistResponseDto> {
    return this.wishlistsService.getPublicWishlist({ shareToken });
  }

  @Post('public/:shareToken/import')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Import creators from a shared shortlist into your brand wishlists' })
  @ApiCreatedResponse({ type: ImportSharedWishlistResponseDto })
  async importFromShare(
    @Param('shareToken') shareToken: string,
    @Body() dto: ImportSharedWishlistDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<ImportSharedWishlistResponseDto> {
    return this.wishlistsService.importFromShare({
      ...brandActorParams(req),
      shareToken,
      dto,
    });
  }

  @Get(':id')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Get wishlist detail including creators' })
  @ApiOkResponse({ type: WishlistDetailDto })
  async getWishlistDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<WishlistDetailDto> {
    return this.wishlistsService.getWishlistDetail({
      ...brandActorParams(req),
      wishlistId: id,
    });
  }

  @Patch(':id')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Update a wishlist name or creator list' })
  @ApiOkResponse({ type: WishlistDetailDto })
  async updateWishlist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWishlistDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<WishlistDetailDto> {
    return this.wishlistsService.updateWishlist({
      ...brandActorParams(req),
      wishlistId: id,
      dto,
    });
  }

  @Delete(':id')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a wishlist' })
  @ApiNoContentResponse()
  async deleteWishlist(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    return this.wishlistsService.deleteWishlist({
      ...brandActorParams(req),
      wishlistId: id,
    });
  }

  @Post(':id/creators')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a creator to a wishlist' })
  @ApiCreatedResponse()
  async addCreator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddWishlistCreatorDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    return this.wishlistsService.addCreator({
      ...brandActorParams(req),
      wishlistId: id,
      creatorId: dto.creatorId,
    });
  }

  @Delete(':id/creators/:creatorId')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a creator from a wishlist' })
  @ApiNoContentResponse()
  async removeCreator(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    return this.wishlistsService.removeCreator({
      ...brandActorParams(req),
      wishlistId: id,
      creatorId,
    });
  }

  @Post(':id/share')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Toggle public sharing for a wishlist' })
  @ApiOkResponse({ type: WishlistShareResponseDto })
  async toggleShare(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<WishlistShareResponseDto> {
    return this.wishlistsService.toggleShare({
      ...brandActorParams(req),
      wishlistId: id,
    });
  }
}
