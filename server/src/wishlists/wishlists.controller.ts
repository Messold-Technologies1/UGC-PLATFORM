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
import { readBrandProfileIdFromRequest } from '../brand-access/brand-context.util';
import { WishlistsService } from './wishlists.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { WishlistDto, WishlistDetailDto } from './dto/wishlist.dto';
import { ListWishlistsResponseDto } from './dto/list-wishlists-response.dto';
import { CreateWishlistResponseDto } from './dto/create-wishlist-response.dto';
import { WishlistShareResponseDto } from './dto/wishlist-share-response.dto';
import { PublicWishlistResponseDto } from './dto/public-wishlist-response.dto';

type AuthedRequest = Request & { user: { id: string } };

@ApiTags('Wishlists')
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlists: WishlistsService) {}

  // ---- Public share endpoint (no auth) ----
  @Get('public/:shareToken')
  @ApiOperation({ summary: 'Get a publicly shared wishlist by share token' })
  @ApiOkResponse({ type: PublicWishlistResponseDto })
  async getPublicWishlist(
    @Param('shareToken') shareToken: string,
  ): Promise<PublicWishlistResponseDto> {
    return this.wishlists.getPublicWishlist(shareToken);
  }

  // ---- Authenticated brand endpoints ----
  @Get()
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'List the brand wishlists' })
  @ApiOkResponse({ type: ListWishlistsResponseDto })
  async list(@Req() req: AuthedRequest): Promise<ListWishlistsResponseDto> {
    return this.wishlists.listWishlists({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
    });
  }

  @Post()
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new wishlist' })
  @ApiCreatedResponse({ type: CreateWishlistResponseDto })
  async create(
    @Body() dto: CreateWishlistDto,
    @Req() req: AuthedRequest,
  ): Promise<CreateWishlistResponseDto> {
    return this.wishlists.createWishlist({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      dto,
    });
  }

  @Get('creator-status/:creatorId')
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary: 'List wishlists with saved status for a given creator',
  })
  async creatorStatus(
    @Param('creatorId') creatorId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.wishlists.getCreatorStatus({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      creatorId,
    });
  }

  @Get(':wishlistId')
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Get a wishlist with its creators' })
  @ApiOkResponse({ type: WishlistDetailDto })
  async detail(
    @Param('wishlistId') wishlistId: string,
    @Req() req: AuthedRequest,
  ): Promise<WishlistDetailDto> {
    return this.wishlists.getWishlistDetail({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      wishlistId,
    });
  }

  @Patch(':wishlistId')
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Rename a wishlist or replace its creator list' })
  @ApiOkResponse({ type: WishlistDto })
  async update(
    @Param('wishlistId') wishlistId: string,
    @Body() dto: UpdateWishlistDto,
    @Req() req: AuthedRequest,
  ): Promise<WishlistDto> {
    return this.wishlists.updateWishlist({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      wishlistId,
      dto,
    });
  }

  @Delete(':wishlistId')
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a wishlist' })
  @ApiNoContentResponse()
  async remove(
    @Param('wishlistId') wishlistId: string,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    await this.wishlists.deleteWishlist({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      wishlistId,
    });
  }

  @Post(':wishlistId/creators/:creatorId')
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Add a creator to a wishlist' })
  @ApiOkResponse({ type: WishlistDto })
  async addCreator(
    @Param('wishlistId') wishlistId: string,
    @Param('creatorId') creatorId: string,
    @Req() req: AuthedRequest,
  ): Promise<WishlistDto> {
    return this.wishlists.addCreator({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      wishlistId,
      creatorId,
    });
  }

  @Delete(':wishlistId/creators/:creatorId')
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Remove a creator from a wishlist' })
  @ApiOkResponse({ type: WishlistDto })
  async removeCreator(
    @Param('wishlistId') wishlistId: string,
    @Param('creatorId') creatorId: string,
    @Req() req: AuthedRequest,
  ): Promise<WishlistDto> {
    return this.wishlists.removeCreator({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      wishlistId,
      creatorId,
    });
  }

  @Put(':wishlistId/creators/:creatorId/toggle')
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({ summary: 'Toggle a creator in a wishlist' })
  async toggleCreator(
    @Param('wishlistId') wishlistId: string,
    @Param('creatorId') creatorId: string,
    @Req() req: AuthedRequest,
  ): Promise<{ added: boolean }> {
    return this.wishlists.toggleCreator({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      wishlistId,
      creatorId,
    });
  }

  @Post(':wishlistId/share')
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable sharing and get the share token' })
  @ApiOkResponse({ type: WishlistShareResponseDto })
  async share(
    @Param('wishlistId') wishlistId: string,
    @Req() req: AuthedRequest,
  ): Promise<WishlistShareResponseDto> {
    return this.wishlists.enableShare({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      wishlistId,
    });
  }

  @Delete(':wishlistId/share')
  @ApiBearerAuth()
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable sharing (make wishlist private)' })
  async unshare(
    @Param('wishlistId') wishlistId: string,
    @Req() req: AuthedRequest,
  ): Promise<{ shareEnabled: boolean }> {
    return this.wishlists.disableShare({
      actorUserId: req.user.id,
      brandProfileId: readBrandProfileIdFromRequest(req),
      wishlistId,
    });
  }
}
