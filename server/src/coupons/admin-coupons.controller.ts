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
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponResponseDto } from './dto/coupon-response.dto';

@ApiTags('Admin - Coupons')
@ApiBearerAuth()
@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'List all coupons (active and inactive)' })
  @ApiOkResponse({ type: [CouponResponseDto] })
  async list(): Promise<CouponResponseDto[]> {
    return this.coupons.listForAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one coupon' })
  @ApiOkResponse({ type: CouponResponseDto })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CouponResponseDto> {
    return this.coupons.getByIdForAdmin(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a coupon' })
  @ApiCreatedResponse({ type: CouponResponseDto })
  async create(
    @Body() dto: CreateCouponDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<CouponResponseDto> {
    return this.coupons.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiOkResponse({ type: CouponResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.coupons.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description:
      'Deleted, or deactivated when the coupon already has redemptions.',
  })
  @ApiOperation({ summary: 'Delete (or deactivate if used) a coupon' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.coupons.remove(id);
  }
}
