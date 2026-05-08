import { ApiProperty } from '@nestjs/swagger';
import { BriefDto } from './brief.dto';

export class ListBriefsResponseDto {
  @ApiProperty({ type: [BriefDto] })
  items!: BriefDto[];
}

