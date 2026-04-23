import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpsertCreatorPayoutDetailsDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(2)
  accountHolderName?: string;

  @ApiPropertyOptional({ example: '123456789012' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(6)
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'HDFC0000123' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  ifsc?: string;

  @ApiPropertyOptional({ example: 'name@okhdfcbank' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString()
  @Matches(/^[^@\s]+@[^@\s]+$/)
  upiId?: string;
}
