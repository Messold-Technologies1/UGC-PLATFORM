import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsUUID,
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
}
