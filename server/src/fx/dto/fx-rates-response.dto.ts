import { ApiProperty } from '@nestjs/swagger';

export class FxRatesResponseDto {
  @ApiProperty({
    example: true,
    description:
      'False when rates could not be fetched and none are cached. The ' +
      'pricing form then asks for rupees directly instead of converting.',
  })
  available!: boolean;

  @ApiProperty({ example: 'INR' })
  base!: string;

  @ApiProperty({ example: '2026-11-11', description: 'Upstream publish date.' })
  date!: string;

  @ApiProperty({
    example: false,
    description: 'True when the last refresh failed and this is the cache.',
  })
  stale!: boolean;

  @ApiProperty({
    example: { USD: 0.0107, GBP: 0.008 },
    description: 'Units of each currency per 1 INR.',
    additionalProperties: { type: 'number' },
  })
  rates!: Record<string, number>;
}
