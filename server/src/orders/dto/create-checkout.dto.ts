import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsUUID,
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
}

