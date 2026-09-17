import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';

export class CouponResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'WELCOME20' })
  code!: string;

  @ApiProperty({ example: '20% off your order' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: DiscountType })
  discountType!: DiscountType;

  @ApiProperty({ example: 20 })
  discountValue!: number;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional({
    description: 'Number of brands that have redeemed this coupon.',
  })
  redemptionCount?: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Name of the admin who created this coupon.',
  })
  createdByName?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Brand-facing view: the coupon plus whether THIS brand has already used it. */
export class AvailableCouponDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'WELCOME20' })
  code!: string;

  @ApiProperty({ example: '20% off your order' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: DiscountType })
  discountType!: DiscountType;

  @ApiProperty({ example: 20 })
  discountValue!: number;

  @ApiProperty({
    description: 'True when this brand has already redeemed this coupon.',
  })
  alreadyUsed!: boolean;
}
