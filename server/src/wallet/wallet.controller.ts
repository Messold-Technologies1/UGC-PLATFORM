import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from '../auth/guards/workspace-permission.guard';
import { RequiredWorkspace } from '../auth/decorators/required-workspace.decorator';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { brandActorParams } from '../brand-access/brand-actor-params.util';
import { WalletService } from './wallet.service';
import {
  CreateWithdrawalDto,
  WalletBalanceDto,
  WalletTransactionDto,
  WalletWithdrawalDto,
} from './dto/wallet.dto';

// Brand-facing "Credits" API. All endpoints resolve the acting brand from the
// request (standalone owner or agency acting for a managed brand) exactly like
// the orders/coupons brand endpoints do.
@ApiTags('Credits')
@ApiBearerAuth()
@Controller('wallet')
@RequiredWorkspace('BRAND')
@UseGuards(JwtAuthGuard, WorkspacePermissionGuard)
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly brandAccess: BrandAccessService,
  ) {}

  private async brandId(
    req: Request & { user: { id: string } },
  ): Promise<string> {
    const { brand } = await this.brandAccess.resolveBrandContext(
      brandActorParams(req),
    );
    return brand.id;
  }

  @Get()
  @ApiOperation({ summary: 'Current credit balance for the brand' })
  @ApiOkResponse({ type: WalletBalanceDto })
  async balance(
    @Req() req: Request & { user: { id: string } },
  ): Promise<WalletBalanceDto> {
    return this.wallet.getBalance(await this.brandId(req));
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Credit transaction history for the brand' })
  @ApiOkResponse({ type: [WalletTransactionDto] })
  async transactions(
    @Req() req: Request & { user: { id: string } },
    @Query('limit') limit?: string,
  ): Promise<WalletTransactionDto[]> {
    const rows = await this.wallet.getTransactions(
      await this.brandId(req),
      limit ? Number(limit) : 50,
    );
    return rows.map((t) => WalletTransactionDto.from(t));
  }

  @Get('withdrawals')
  @ApiOperation({ summary: "The brand's refund/withdrawal requests" })
  @ApiOkResponse({ type: [WalletWithdrawalDto] })
  async withdrawals(
    @Req() req: Request & { user: { id: string } },
  ): Promise<WalletWithdrawalDto[]> {
    const rows = await this.wallet.listWithdrawalsForBrand(
      await this.brandId(req),
    );
    return rows.map((w) => WalletWithdrawalDto.from(w));
  }

  @Post('withdrawals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request a refund/withdrawal of store credit to real money',
  })
  @ApiCreatedResponse({ type: WalletWithdrawalDto })
  async requestWithdrawal(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateWithdrawalDto,
  ): Promise<WalletWithdrawalDto> {
    const brandId = await this.brandId(req);
    const withdrawal = await this.wallet.requestWithdrawal({
      brandId,
      requestedByUserId: req.user.id,
      amountPaise: dto.amountPaise,
      brandNote: dto.brandNote ?? null,
    });
    return WalletWithdrawalDto.from(withdrawal);
  }

  @Post('withdrawals/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a still-pending withdrawal request' })
  @ApiOkResponse({ type: WalletWithdrawalDto })
  async cancelWithdrawal(
    @Req() req: Request & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WalletWithdrawalDto> {
    const brandId = await this.brandId(req);
    const withdrawal = await this.wallet.cancelWithdrawalByBrand({
      withdrawalId: id,
      brandId,
    });
    return WalletWithdrawalDto.from(withdrawal);
  }
}
