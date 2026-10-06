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

// Brand/agency-facing "Credits" API. Resolves the acting buyer from the request
// (standalone brand or agency owner) exactly like orders/coupons endpoints do.
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

  private async creditOwner(req: Request & { user: { id: string } }) {
    const actor = await this.brandAccess.resolveOrderActor(
      brandActorParams(req),
    );
    return { brandId: actor.brandId, agencyId: actor.agencyId };
  }

  @Get()
  @ApiOperation({ summary: 'Current credit balance for the brand or agency' })
  @ApiOkResponse({ type: WalletBalanceDto })
  async balance(
    @Req() req: Request & { user: { id: string } },
  ): Promise<WalletBalanceDto> {
    return this.wallet.getBalance(await this.creditOwner(req));
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Credit transaction history for the brand or agency' })
  @ApiOkResponse({ type: [WalletTransactionDto] })
  async transactions(
    @Req() req: Request & { user: { id: string } },
    @Query('limit') limit?: string,
  ): Promise<WalletTransactionDto[]> {
    const rows = await this.wallet.getTransactions(
      await this.creditOwner(req),
      limit ? Number(limit) : 50,
    );
    return rows.map((t) => WalletTransactionDto.from(t));
  }

  @Get('withdrawals')
  @ApiOperation({ summary: "The buyer's refund/withdrawal requests" })
  @ApiOkResponse({ type: [WalletWithdrawalDto] })
  async withdrawals(
    @Req() req: Request & { user: { id: string } },
  ): Promise<WalletWithdrawalDto[]> {
    const rows = await this.wallet.listWithdrawalsForBrand(
      await this.creditOwner(req),
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
    const owner = await this.creditOwner(req);
    const withdrawal = await this.wallet.requestWithdrawal({
      ...owner,
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
    const owner = await this.creditOwner(req);
    const withdrawal = await this.wallet.cancelWithdrawalByBrand({
      withdrawalId: id,
      ...owner,
    });
    return WalletWithdrawalDto.from(withdrawal);
  }
}
