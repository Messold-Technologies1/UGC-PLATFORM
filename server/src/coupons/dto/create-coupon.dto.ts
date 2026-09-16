import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({
    example: 'WELCOME20',
    description: 'Coupon code the brand types/selects. Stored uppercased.',
  })
  @IsString()
  @Length(2, 40)
  code!: string;

  @ApiProperty({ example: '20% off your order' })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({ example: 'Welcome offer for first-time brands' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiPropertyOptional({
    example: 20,
    description:
      'PERCENTAGE: whole percent (0–100). FIXED: amount in paise. PLATFORM_FEE_WAIVER: ignored.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  discountValue?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
