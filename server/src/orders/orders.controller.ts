import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveWorkspaceGuard } from '../auth/guards/active-workspace.guard';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { OrdersService } from './orders.service';
import { SubmitBriefDto } from './dto/submit-brief.dto';
import { OpenDisputeDto } from './dto/open-dispute.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('BRAND'))
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
    });
  }

  @Post(':id/brief')
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('BRAND'))
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
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('CREATOR'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Creator marks order as delivered' })
  @ApiNoContentResponse({ description: 'Delivered' })
  async deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.markDelivered({ creatorUserId: req.user.id, orderId: id });
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('BRAND'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Brand accepts delivery (order completed)' })
  @ApiNoContentResponse({ description: 'Accepted' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.ordersService.acceptDelivery({ brandUserId: req.user.id, orderId: id });
  }

  @Post(':id/disputes/brand')
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('BRAND'))
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
  @UseGuards(JwtAuthGuard, ActiveWorkspaceGuard('CREATOR'))
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

