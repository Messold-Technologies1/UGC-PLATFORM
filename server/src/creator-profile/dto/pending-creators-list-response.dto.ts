import { ApiProperty } from '@nestjs/swagger';
import { PendingCreatorApprovalListItemDto } from './pending-creator-approval-list-item.dto';

export class PendingCreatorsListResponseDto {
  @ApiProperty({ type: () => [PendingCreatorApprovalListItemDto] })
  items!: PendingCreatorApprovalListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
