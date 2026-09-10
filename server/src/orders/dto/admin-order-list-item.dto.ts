import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderBrandSnapshotDto } from './order-brand-snapshot.dto';
import { OrderCreatorSnapshotDto } from './order-creator-snapshot.dto';
import { OrderListSummaryDto } from './order-list-summary.dto';
import { OrderActionActorDto } from './order-action-actor.dto';

export class AdminOrderListItemDto {
  @ApiProperty({ type: () => OrderListSummaryDto })
  order!: OrderListSummaryDto;

  @ApiProperty({ type: () => OrderCreatorSnapshotDto })
  creator!: OrderCreatorSnapshotDto;

  @ApiProperty({ type: () => OrderBrandSnapshotDto })
  brand!: OrderBrandSnapshotDto;

  @ApiPropertyOptional({
    type: () => OrderActionActorDto,
    nullable: true,
    description:
      'Who ended the order early (REJECTED). role ADMIN = support acted on a party behalf; the attributed side is order.cancelledBy.',
  })
  cancelledByActor?: OrderActionActorDto | null;

  @ApiPropertyOptional({
    type: () => OrderActionActorDto,
    nullable: true,
    description:
      'Who accepted the brief. role ADMIN = support accepted on the creator behalf.',
  })
  briefAcceptedByActor?: OrderActionActorDto | null;
}
