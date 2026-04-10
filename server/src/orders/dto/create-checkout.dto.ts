import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  creatorId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  packageId!: string;
}

