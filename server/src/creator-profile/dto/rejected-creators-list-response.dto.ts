import { ApiProperty } from '@nestjs/swagger';
import { RejectedCreatorApprovalListItemDto } from './rejected-creator-approval-list-item.dto';

export class RejectedCreatorsListResponseDto {
  @ApiProperty({ type: () => [RejectedCreatorApprovalListItemDto] })
  items!: RejectedCreatorApprovalListItemDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
