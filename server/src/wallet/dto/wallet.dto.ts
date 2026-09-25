import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  NotEquals,
} from 'class-validator';
import {
  WalletTransaction,
  WalletTransactionType,
  WalletWithdrawal,
  WalletWithdrawalStatus,
} from '@prisma/client';

// ── Requests ─────────────────────────────────────────────────────────────────

export class CreateWithdrawalDto {
  @ApiProperty({ description: 'Amount to withdraw, in paise.' })
  @IsInt()
  @IsPositive()
  amountPaise!: number;

  @ApiPropertyOptional({ description: 'Payout details / note from the brand.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  brandNote?: string;
}

export class ProcessWithdrawalDto {
  @ApiPropertyOptional({ description: 'Admin note on the decision.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}

export class AdjustWalletDto {
  @ApiProperty({
    description:
      'Signed amount in paise. Positive adds credit, negative removes it.',
  })
  @IsInt()
  @NotEquals(0)
  amountPaise!: number;

  @ApiProperty({ description: 'Reason for the manual adjustment (required).' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}

// ── Responses ────────────────────────────────────────────────────────────────

export class WalletBalanceDto {
  @ApiProperty({ description: 'Total credit owned (spendable + held), in paise.' })
  balancePaise!: number;
  @ApiProperty({ description: 'Locked by pending withdrawal requests, in paise.' })
  heldPaise!: number;
  @ApiProperty({ description: 'Spendable now (balance - held), in paise.' })
  availablePaise!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ description: 'Alias of heldPaise, kept for existing callers.' })
  pendingWithdrawalPaise!: number;
}

export class WalletTransactionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Signed: positive credit, negative debit.' })
  amountPaise!: number;
  @ApiProperty() balanceAfterPaise!: number;
  @ApiProperty({ enum: WalletTransactionType }) type!: WalletTransactionType;
  @ApiProperty({ nullable: true }) reason!: string | null;
  @ApiProperty({ nullable: true }) orderId!: string | null;
  @ApiProperty({ nullable: true }) withdrawalId!: string | null;
  @ApiProperty() createdAt!: Date;

  static from(tx: WalletTransaction): WalletTransactionDto {
    return {
      id: tx.id,
      amountPaise: tx.amountPaise,
      balanceAfterPaise: tx.balanceAfterPaise,
      type: tx.type,
      reason: tx.reason,
      orderId: tx.orderId,
      withdrawalId: tx.withdrawalId,
      createdAt: tx.createdAt,
    };
  }
}

export class WalletWithdrawalDto {
  @ApiProperty() id!: string;
  @ApiProperty() amountPaise!: number;
  @ApiProperty({ enum: WalletWithdrawalStatus })
  status!: WalletWithdrawalStatus;
  @ApiProperty({ nullable: true }) brandNote!: string | null;
  @ApiProperty({ nullable: true }) adminNote!: string | null;
  @ApiProperty({ nullable: true }) processedAt!: Date | null;
  @ApiProperty() createdAt!: Date;

  static from(w: WalletWithdrawal): WalletWithdrawalDto {
    return {
      id: w.id,
      amountPaise: w.amountPaise,
      status: w.status,
      brandNote: w.brandNote,
      adminNote: w.adminNote,
      processedAt: w.processedAt,
      createdAt: w.createdAt,
    };
  }
}

export class AdminWithdrawalDto extends WalletWithdrawalDto {
  @ApiProperty() brandId!: string;
  @ApiProperty({ nullable: true }) brandName!: string | null;
  @ApiProperty({ description: "Brand's current credit balance, in paise." })
  brandBalancePaise!: number;

  static fromAdmin(
    w: WalletWithdrawal & {
      wallet: {
        balancePaise: number;
        brand: { id: string; brandName: string | null };
      };
    },
  ): AdminWithdrawalDto {
    return {
      ...WalletWithdrawalDto.from(w),
      brandId: w.brandId,
      brandName: w.wallet.brand.brandName,
      brandBalancePaise: w.wallet.balancePaise,
    };
  }
}
