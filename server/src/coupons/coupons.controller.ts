import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { brandActorParams } from '../brand-access/brand-actor-params.util';
import { CouponsService } from './coupons.service';
import { AvailableCouponDto } from './dto/coupon-response.dto';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly coupons: CouponsService,
    private readonly brandAccess: BrandAccessService,
  ) {}

  @Get('available')
  @RequiredWorkspace('BRAND')
  @UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
  @ApiOperation({
    summary: 'List active coupons for the current brand, flagging used ones',
  })
  @ApiOkResponse({ type: [AvailableCouponDto] })
  async available(
    @Req() req: Request & { user: { id: string } },
  ): Promise<AvailableCouponDto[]> {
    const { brand } = await this.brandAccess.resolveBrandContext(
      brandActorParams(req),
    );
    return this.coupons.listAvailableForBrand(brand.id);
  }
}
