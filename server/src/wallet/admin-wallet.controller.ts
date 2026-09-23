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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { WalletWithdrawalStatus } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { WalletService } from './wallet.service';
import {
  AdjustWalletDto,
  AdminWithdrawalDto,
  ProcessWithdrawalDto,
  WalletBalanceDto,
  WalletTransactionDto,
  WalletWithdrawalDto,
} from './dto/wallet.dto';

// Admin "Refunds" tab. Super-admins only (same allow-list that gates coupons):
// JwtAuthGuard populates req.user, AdminGuard requires the ADMIN role,
// SuperAdminGuard requires the super-admin email allow-list.
@ApiTags('Admin - Refunds (Credits)')
@ApiBearerAuth()
@Controller('admin/wallet')
@UseGuards(JwtAuthGuard, AdminGuard, SuperAdminGuard)
export class AdminWalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('withdrawals')
  @ApiOperation({ summary: 'List withdrawal (refund) requests' })
  @ApiOkResponse({ type: [AdminWithdrawalDto] })
  async listWithdrawals(
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ): Promise<AdminWithdrawalDto[]> {
    const parsedStatus =
      status && status in WalletWithdrawalStatus
        ? (status as WalletWithdrawalStatus)
        : undefined;
    const rows = await this.wallet.listWithdrawalsForAdmin({
      status: parsedStatus,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
    return rows.map((w) => AdminWithdrawalDto.fromAdmin(w));
  }

  @Post('withdrawals/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a withdrawal paid (money moved off-platform)',
  })
  @ApiOkResponse({ type: WalletWithdrawalDto })
  async completeWithdrawal(
    @Req() req: Request & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessWithdrawalDto,
  ): Promise<WalletWithdrawalDto> {
    const withdrawal = await this.wallet.completeWithdrawal({
      withdrawalId: id,
      processedByUserId: req.user.id,
      adminNote: dto.adminNote ?? null,
    });
    return WalletWithdrawalDto.from(withdrawal);
  }

  @Post('withdrawals/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a withdrawal (money returns to the brand credits)',
  })
  @ApiOkResponse({ type: WalletWithdrawalDto })
  async rejectWithdrawal(
    @Req() req: Request & { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessWithdrawalDto,
  ): Promise<WalletWithdrawalDto> {
    const withdrawal = await this.wallet.rejectWithdrawal({
      withdrawalId: id,
      processedByUserId: req.user.id,
      adminNote: dto.adminNote ?? null,
    });
    return WalletWithdrawalDto.from(withdrawal);
  }

  @Get('brands/:brandId')
  @ApiOperation({ summary: "A brand's credit balance, ledger and withdrawals" })
  async brandLedger(
    @Param('brandId', ParseUUIDPipe) brandId: string,
  ): Promise<{
    balance: WalletBalanceDto;
    transactions: WalletTransactionDto[];
    withdrawals: WalletWithdrawalDto[];
  }> {
    const [balance, transactions, withdrawals] = await Promise.all([
      this.wallet.getBalance(brandId),
      this.wallet.getTransactions(brandId, 200),
      this.wallet.listWithdrawalsForBrand(brandId),
    ]);
    return {
      balance,
      transactions: transactions.map((t) => WalletTransactionDto.from(t)),
      withdrawals: withdrawals.map((w) => WalletWithdrawalDto.from(w)),
    };
  }

  @Post('brands/:brandId/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually add or remove credit for a brand (support tool)',
  })
  @ApiOkResponse({ type: WalletBalanceDto })
  async adjust(
    @Req() req: Request & { user: { id: string } },
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: AdjustWalletDto,
  ): Promise<WalletBalanceDto> {
    await this.wallet.adminAdjust({
      brandId,
      amountPaise: dto.amountPaise,
      reason: dto.reason,
      adminUserId: req.user.id,
    });
    return this.wallet.getBalance(brandId);
  }
}
