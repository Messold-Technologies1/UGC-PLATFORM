import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class OpenDisputeDto {
  @ApiProperty({ example: 'Creator missed delivery deadline' })
  @IsString()
  @MinLength(3)
  reason!: string;
}

