import { ApiProperty } from '@nestjs/swagger';
import { AdminAgencyListItemDto } from './admin-agency-list-item.dto';

export class AgenciesListResponseDto {
  @ApiProperty({ type: () => [AdminAgencyListItemDto] })
  items!: AdminAgencyListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
