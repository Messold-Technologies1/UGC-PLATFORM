import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  creatorId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  packageId!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional creator add-on IDs (must belong to the same creator as the package)',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  addOnIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional discount coupon code to apply to this checkout.',
    example: 'WELCOME20',
  })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  couponCode?: string;

  @ApiPropertyOptional({
    description:
      "Apply the brand's store credit ('Credits') toward this order. Credit is used after any coupon; the remainder (if any) is charged via Razorpay.",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  useCredits?: boolean;
}

