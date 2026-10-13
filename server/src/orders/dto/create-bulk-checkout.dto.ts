import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BulkCheckoutItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  creatorId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      "Optional. When omitted, the creator's (single) package is resolved server-side.",
  })
  @IsOptional()
  @IsUUID()
  packageId?: string;

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
}

export class CreateBulkCheckoutDto {
  @ApiProperty({
    type: [BulkCheckoutItemDto],
    description:
      'One entry per creator to order. A single payment is collected for all of them; each becomes its own order.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BulkCheckoutItemDto)
  items!: BulkCheckoutItemDto[];

  @ApiPropertyOptional({
    description:
      'Optional discount coupon applied once to the whole cart (one payment).',
    example: 'WELCOME20',
  })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  couponCode?: string;

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
