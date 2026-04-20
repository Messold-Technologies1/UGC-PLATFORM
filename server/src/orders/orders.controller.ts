import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { OrdersService } from './orders.service';
import { SubmitBriefDto } from './dto/submit-brief.dto';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { BrandOrdersListResponseDto } from './dto/brand-orders-list-response.dto';
import { CreatorOrdersListResponseDto } from './dto/creator-orders-list-response.dto';
import { OrderBriefResponseDto } from './dto/order-brief-response.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('brand')
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('BRAND'))
  @ApiOperation({
    summary: 'List orders for the authenticated brand (creator snapshot per row)',
  })
  @ApiOkResponse({ type: BrandOrdersListResponseDto })
  async listBrandOrders(
    @Query() query: ListOrdersQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<BrandOrdersListResponseDto> {
    return this.ordersService.listOrdersForBrand({
      brandUserId: req.user.id,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('creator')
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('CREATOR'))
  @ApiOperation({
    summary: 'List orders for the authenticated creator (brand snapshot per row)',
  })
  @ApiOkResponse({ type: CreatorOrdersListResponseDto })
  async listCreatorOrders(
    @Query() query: ListOrdersQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorOrdersListResponseDto> {
    return this.ordersService.listOrdersForCreator({
      creatorUserId: req.user.id,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id/brief')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Get campaign brief for an order (brand owner, creator owner, or admin)',
  })
  @ApiOkResponse({ type: OrderBriefResponseDto })
  async getOrderBrief(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<OrderBriefResponseDto> {
    return this.ordersService.getOrderBrief({
      orderId: id,
      viewerUserId: req.user.id,
    });
  }

  @Post('checkout')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create platform order + Razorpay order for checkout',
  })
  @ApiCreatedResponse({ type: CheckoutResponseDto })
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CheckoutResponseDto> {
    return this.ordersService.createCheckout({
      brandUserId: req.user.id,
      creatorId: dto.creatorId,
      packageId: dto.packageId,
      addOnIds: dto.addOnIds,
    });
  }

  @Post(':id/brief')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Submit campaign brief (starts delivery timeline)' })
  @ApiNoContentResponse({ description: 'Brief submitted' })
  async submitBrief(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitBriefDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.submitBrief({
      brandUserId: req.user.id,
      orderId: id,
      brief: dto.brief,
    });
  }

  @Post(':id/deliver')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Creator marks order as delivered' })
  @ApiNoContentResponse({ description: 'Delivered' })
  async deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.markDelivered({
      creatorUserId: req.user.id,
      orderId: id,
    });
  }

  @Post(':id/accept')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Brand accepts delivery (order completed)' })
  @ApiNoContentResponse({ description: 'Accepted' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.acceptDelivery({
      brandUserId: req.user.id,
      orderId: id,
    });
  }

  @Post(':id/disputes/brand')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Brand opens dispute' })
  @ApiNoContentResponse({ description: 'Dispute opened' })
  async openBrandDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OpenDisputeDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.openDispute({
      orderId: id,
      openedBy: 'BRAND',
      openerUserId: req.user.id,
      reason: dto.reason,
    });
  }

  @Post(':id/disputes/creator')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Creator opens dispute' })
  @ApiNoContentResponse({ description: 'Dispute opened' })
  async openCreatorDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OpenDisputeDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.openDispute({
      orderId: id,
      openedBy: 'CREATOR',
      openerUserId: req.user.id,
      reason: dto.reason,
    });
  }
}
