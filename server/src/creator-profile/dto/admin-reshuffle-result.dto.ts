import { ApiProperty } from '@nestjs/swagger';

export class AdminReshuffleResultDto {
  @ApiProperty({
    example: 412,
    description: 'Listed creators given a position',
  })
  ranked!: number;

  @ApiProperty({
    example: 3,
    description:
      'Creators left where they were because a featuredUntil has not passed',
  })
  pinned!: number;

  @ApiProperty({
    example: 17,
    description:
      'Creators carried by the new-creator floor rather than their own score',
  })
  newCreators!: number;

  @ApiProperty({ example: '2026-10-29T04:00:00.000Z' })
  ranAt!: string;
}
