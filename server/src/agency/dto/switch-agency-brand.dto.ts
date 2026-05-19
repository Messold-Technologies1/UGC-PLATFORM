import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchAgencyBrandDto {
  @ApiProperty({ description: 'Brand profile id to set as active for this agency' })
  @IsUUID()
  brandProfileId!: string;
}
