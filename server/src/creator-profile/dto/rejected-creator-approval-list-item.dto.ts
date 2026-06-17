import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PendingCreatorApprovalListItemDto } from './pending-creator-approval-list-item.dto';

export class RejectedCreatorApprovalListItemDto extends PendingCreatorApprovalListItemDto {
  @ApiPropertyOptional({
    example: 'Profile does not meet community guidelines.',
    nullable: true,
  })
  rejectionReason?: string | null;

  @ApiPropertyOptional({
    description: 'When the profile was rejected',
    nullable: true,
  })
  rejectedAt?: Date | null;
}
