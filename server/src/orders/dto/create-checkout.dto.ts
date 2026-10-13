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
  MaxLength,
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
    description:
      'Optional creator add-on IDs (must belong to the same creator as the package)',
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

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Identifies one checkout ATTEMPT. Mint a new UUID when the brand opens checkout for a creator and resend it on every retry of that attempt: the same key reuses the existing draft order, a new key creates a separate order. This is what lets a brand hold two unpaid orders with the same creator (e.g. two videos for two different briefs). Omit it only for backwards compatibility — the server then matches keyless drafts, as before this field existed.',
  })
  @IsOptional()
  @IsUUID()
  checkoutSessionKey?: string;

  /**
   * Meta attribution cookies read in the buyer's own browser. Stored on the
   * order so the server-side Purchase conversion — which fires from a webhook,
   * with no browser request of its own — can replay them.
   */
  @ApiPropertyOptional({ description: 'Meta _fbp browser cookie' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaFbp?: string;

  @ApiPropertyOptional({ description: 'Meta _fbc ad-click cookie' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  metaFbc?: string;
}
