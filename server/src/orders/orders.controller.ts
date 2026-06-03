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
  ApiParam,
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
import { AcceptBriefResponseDto } from './dto/accept-brief-response.dto';
import { MarkProductReceivedResponseDto } from './dto/mark-product-received-response.dto';
import { OrderBriefResponseDto } from './dto/order-brief-response.dto';
import { BrandOrderDetailsResponseDto } from './dto/brand-order-details-response.dto';
import { CreatorOrderDetailsResponseDto } from './dto/creator-order-details-response.dto';
import { PresignDeliveryUploadDto } from './dto/presign-delivery-upload.dto';
import { PresignDeliveryUploadResponseDto } from './dto/presign-delivery-upload-response.dto';
import {
  SubmitDeliveryDto,
  SubmitDeliveryResponseDto,
} from './dto/submit-delivery.dto';
import { CreatorReviewsService } from '../creator-reviews/creator-reviews.service';
import { CreateCreatorRatingReviewDto } from '../creator-reviews/dto/create-creator-rating-review.dto';
import { CreateCreatorRatingReviewResponseDto } from '../creator-reviews/dto/create-creator-rating-review-response.dto';
import { CreatorRatingReviewDto } from '../creator-reviews/dto/creator-rating-review.dto';
import { OrderDeliveriesResponseDto } from './dto/order-deliveries-response.dto';
import { MarkProductShippedDto } from './dto/mark-product-shipped.dto';
import { CreatorDeliveriesResponseDto } from './dto/creator-deliveries-response.dto';
import { brandActorParams } from '../brand-access/brand-actor-params.util';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly creatorReviewsService: CreatorReviewsService,
  ) {}

  @Get('brand')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'List orders for the authenticated brand (creator snapshot per row)',
  })
  @ApiOkResponse({ type: BrandOrdersListResponseDto })
  async listBrandOrders(
    @Query() query: ListOrdersQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<BrandOrdersListResponseDto> {
    return this.ordersService.listOrdersForBrand({
      ...brandActorParams(req),
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('brand/:id')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'Get order details for the authenticated brand (excludes brief payload)',
  })
  @ApiOkResponse({ type: BrandOrderDetailsResponseDto })
  async getBrandOrderDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<BrandOrderDetailsResponseDto> {
    return this.ordersService.getOrderDetailsForBrand({
      orderId: id,
      ...brandActorParams(req),
    });
  }

  @Get('brand/:id/deliveries')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'List submitted deliveries for an order (authenticated brand only)',
  })
  @ApiOkResponse({ type: OrderDeliveriesResponseDto })
  async listBrandOrderDeliveries(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<OrderDeliveriesResponseDto> {
    return this.ordersService.listDeliveriesForBrand({
      orderId: id,
      ...brandActorParams(req),
    });
  }

  @Get('creator')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'List orders for the authenticated creator (brand snapshot per row)',
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

  @Get('creator/deliveries')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'List all deliveries submitted by the authenticated creator (paginated)',
  })
  @ApiOkResponse({ type: CreatorDeliveriesResponseDto })
  async listCreatorDeliveries(
    @Query() query: ListOrdersQueryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorDeliveriesResponseDto> {
    return this.ordersService.listDeliveriesForCreator({
      creatorUserId: req.user.id,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('creator/:id')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'Get order details for the authenticated creator (excludes brief payload)',
  })
  @ApiOkResponse({ type: CreatorOrderDetailsResponseDto })
  async getCreatorOrderDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorOrderDetailsResponseDto> {
    return this.ordersService.getOrderDetailsForCreator({
      orderId: id,
      creatorUserId: req.user.id,
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
      ...brandActorParams(req),
      creatorId: dto.creatorId,
      packageId: dto.packageId,
      addOnIds: dto.addOnIds,
    });
  }

  @Post(':id/brief/accept')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'Creator accepts the brand-submitted brief (order moves to BRIEF_ACCEPTED; required before delivery uploads)',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
  @ApiOkResponse({ type: AcceptBriefResponseDto })
  async acceptBrief(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<AcceptBriefResponseDto> {
    return this.ordersService.acceptBrief({
      creatorUserId: req.user.id,
      orderId: id,
    });
  }

  @Post(':id/brief')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Submit campaign brief (starts delivery timeline)' })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Brief submitted' })
  async submitBrief(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitBriefDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.submitBrief({
      ...brandActorParams(req),
      orderId: id,
      briefId: dto.briefId,
    });
  }

  @Post(':id/product-shipment')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Mark physical product shipped to creator (PRODUCT_SHIPPED; only when brief required shipment)',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Shipment recorded; creator notified' })
  async markProductShipped(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkProductShippedDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.markProductShipped({
      ...brandActorParams(req),
      orderId: id,
      courierName: dto.courierName,
      trackingId: dto.trackingId,
      dispatchDateYmd: dto.dispatchDate,
    });
  }

  @Post(':id/product-received')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary:
      'Creator confirms physical product received (PRODUCT_RECEIVED; required before first delivery when shipment applies)',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
  @ApiOkResponse({ type: MarkProductReceivedResponseDto })
  async markProductReceived(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<MarkProductReceivedResponseDto> {
    return this.ordersService.markProductReceived({
      creatorUserId: req.user.id,
      orderId: id,
    });
  }

  @Post(':id/deliveries/presign')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create presigned S3 URLs for delivery uploads' })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
  @ApiCreatedResponse({ type: PresignDeliveryUploadResponseDto })
  async presignDeliveryUploads(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PresignDeliveryUploadDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PresignDeliveryUploadResponseDto> {
    return this.ordersService.presignDeliveryUploads({
      orderId: id,
      creatorUserId: req.user.id,
      dto,
    });
  }

  @Post(':id/deliveries')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit delivery assets and transition order status (excludes brief)',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
  @ApiCreatedResponse({ type: SubmitDeliveryResponseDto })
  async submitDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitDeliveryDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<SubmitDeliveryResponseDto> {
    return this.ordersService.submitDelivery({
      orderId: id,
      creatorUserId: req.user.id,
      dto,
    });
  }

  @Post(':id/revisions/request')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Brand requests revision (enforces max revisions)',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Revision requested' })
  async requestRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.requestRevision({
      orderId: id,
      ...brandActorParams(req),
    });
  }

  @Post(':id/rating-review')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Brand rates and reviews the creator (allowed when order is ACCEPTED, CREATOR_PAYMENT_DONE, or REJECTED)',
  })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)', format: 'uuid' })
  @ApiCreatedResponse({ type: CreateCreatorRatingReviewResponseDto })
  async createOrderRatingReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCreatorRatingReviewDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreateCreatorRatingReviewResponseDto> {
    return this.creatorReviewsService.createForOrder({
      ...brandActorParams(req),
      orderId: id,
      dto,
    });
  }

  @Get(':id/rating-review')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get rating/review for an order (brand or creator on that order)',
  })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)', format: 'uuid' })
  @ApiOkResponse({ type: CreatorRatingReviewDto })
  async getOrderRatingReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CreatorRatingReviewDto | null> {
    return this.creatorReviewsService.getForOrder({
      orderId: id,
      viewerUserId: req.user.id,
    });
  }

  @Post(':id/accept')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Brand accepts delivery (order completed)' })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Accepted' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.acceptDelivery({
      ...brandActorParams(req),
      orderId: id,
    });
  }

  @Post(':id/disputes/brand')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Brand opens dispute' })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
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
      ...brandActorParams(req),
      reason: dto.reason,
    });
  }

  @Post(':id/disputes/creator')
  @RequiredWorkspace('CREATOR')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Creator opens dispute' })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    format: 'uuid',
  })
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
