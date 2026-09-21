import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderCouponDto {
  @ApiProperty({ example: 'WELCOME20' })
  code!: string;

  @ApiProperty({ example: '20% off your order' })
  name!: string;

  @ApiPropertyOptional({
    description: 'PERCENTAGE | FIXED | PLATFORM_FEE_WAIVER',
  })
  discountType?: string | null;

  @ApiProperty({ description: 'Discount applied to the charge (paise)' })
  discountAmountPaise!: number;

  @ApiProperty({ description: 'Pre-discount order total (paise)' })
  grossAmountPaise!: number;
}
