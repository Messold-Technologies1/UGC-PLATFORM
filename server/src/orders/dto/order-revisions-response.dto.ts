import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderRevisionItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({
    example: 1,
    description: 'Revision number (1 = first revision requested, 2 = second, etc.)',
  })
  revisionNumber!: number;

  @ApiPropertyOptional({
    example: 'Please reshoot the product close-up with better lighting.',
    description: "Brand's feedback explaining what changes are needed",
  })
  note!: string | null;

  @ApiProperty()
  requestedAt!: Date;
}

export class OrderRevisionsResponseDto {
  @ApiProperty({ type: () => [OrderRevisionItemDto] })
  items!: OrderRevisionItemDto[];
}
